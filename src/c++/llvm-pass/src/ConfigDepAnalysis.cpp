#include "Graphs/ICFG.h"
#include "Util/ExtAPI.h"
#include "llvm/IR/InstIterator.h"
#include "ConfigDepAnalysis.h"
#include "HeapInitFunction.h"
#include "C2CUtils.h"
#include "C2CLog.h"

#include <sys/time.h>
#include <ctime>
#include <chrono>

using namespace llvm;
using namespace SVF;
using namespace C2C;

static llvm::cl::opt<bool> OnlyGlobalVar("only-global-var",
                            llvm::cl::desc("C2C-ConfigDepAnalysis - only instrument to read global var (won't find initialization of options)"),
                            llvm::cl::init(false));


void ConfigDepAnalysis::run(void) {
    preProcessor->printConfigStructTypes();
    preProcessor->printConfigGlobalVars();
    C2CLogger(logINFO) << "starting to extract config "
                        <<"dependent conditional branches\n";
    extractConfigDepConditionalBranches();
    printConfigDepConditionalBranches();
    if ( !OnlyGlobalVar ){
        C2CLogger(logINFO) << "starting to extract config "
                        <<"dependent initializations\n";
        extractConfigDepInits();
        if ( configToInitInsts.size() != 0 )
            hasHeapInit = true;
        printConfigDepInits();
    }
    C2CLogger(logINFO) << "starting to extract config "
                        <<"dependent global variables\n";
    extractConfigDepGlobalVars();
    if ( configDepGlobalVars.size() != 0 )
        hasGlobal = true;
    printConfigDepGlobalVars();
}

void ConfigDepAnalysis::extractConfigDepGlobalVars(void){
    /// TODO make sure this is correct:
    /// it seemed like stack is not being used anymore, just pushing to 
    /// and popping from without any usage, so we won't use it anymore
    std::vector<std::string> stack; // Need this to record the "path" so far

    for ( SVFModule::global_iterator it = svfModule->global_begin(),
                                     eit = svfModule->global_end();
                                     it != eit; ++it ){
        GlobalVariable *globalVar = *it;
        if ( preProcessor->isConfigGlobalVar(globalVar) )
            configDepGlobalVars.insert(globalVar);
        Type *globalVarType = globalVar->getType();
        if ( !SVFUtil::isa<PointerType>(globalVarType) )
            continue;
        PointerType* ptrType = SVFUtil::dyn_cast<PointerType>(globalVarType);
        if ( !SVFUtil::isa<StructType>(ptrType->getPointerElementType()) )
            continue;
        StructType *loadStructType = 
              SVFUtil::dyn_cast<StructType>(ptrType->getPointerElementType());
        if ( loadStructType->isLiteral() )
            continue;
        loadStructType = getBaseStType(loadStructType, 
                                       PreProcessor::getStructEqMap(),
                                       false);
        if ( preProcessor->isConfigStruct(loadStructType) )
            configDepGlobalVars.insert(globalVar);
    }
}

void ConfigDepAnalysis::printConfigDepGlobalVars(void){
    C2CLogger(logDEBUG) << "*******************************************\n";
    C2CLogger(logDEBUG) << "*      Config-based global variables      *\n";
    C2CLogger(logDEBUG) << "*******************************************\n";
    C2CLogger(logDEBUG) << "configDepGlobalVars.size(): " 
                        << configDepGlobalVars.size() << "\n";
    for (std::set<GlobalVariable*>::iterator it = configDepGlobalVars.begin(),
                                             eit = configDepGlobalVars.end();
                                             it != eit; ++it)
        C2CLogger(logDEBUG) << getValueString(*it) << "\n";
}

void ConfigDepAnalysis::printConfigDepConditionalBranches(void){
    C2CLogger(logDEBUG) << "*******************************************\n";
    C2CLogger(logDEBUG) << "*      Config-based conditional branches  *\n";
    C2CLogger(logDEBUG) << "*******************************************\n";
    C2CLogger(logDEBUG) << "configToBranches.size(): " 
                        << configToBranches.size() << "\n";
    for (ConfigToBranchSetType::iterator it = configToBranches.begin(),
                                         eit = configToBranches.end();
                                         it != eit; ++it){
        const ConfigVariable& configVar = (*it).first;
        C2CLogger(logDEBUG) << configVar.toString() << "\n";
        std::set<ConditionalBranch*>& conditionalBrSet = (*it).second;
        for ( std::set<ConditionalBranch*>::iterator it = conditionalBrSet.begin(),
                                                     eit = conditionalBrSet.end();
                                                     it != eit; ++it){
            ConditionalBranch *conditionalBr = *it;
            C2CLogger(logDEBUG) << "\t" << conditionalBr->toString() << "\n";
        }
    }
}

void ConfigDepAnalysis::printConfigDepInits(void){
    C2CLogger(logDEBUG) << "*******************************************\n";
    C2CLogger(logDEBUG) << "*      Config-based init instructions     *\n";
    C2CLogger(logDEBUG) << "*******************************************\n";
    C2CLogger(logDEBUG) << "configToInitInsts.size(): " 
                        << configToInitInsts.size() << "\n";
    for (ConfigToInstSetType::iterator it = configToInitInsts.begin(),
                                         eit = configToInitInsts.end();
                                         it != eit; ++it){
        const ConfigVariable& configVar = (*it).first;
        C2CLogger(logDEBUG) << configVar.toString() << "\n";
        ConfigInitSetType& initInstSet = (*it).second;
        for ( ConfigInitSetType::iterator it = initInstSet.begin(),
                                               eit = initInstSet.end();
                                               it != eit; ++it){
            const ConfigInitInst& configInitInst = *it;
            Instruction *instruction = configInitInst.getInst();
            C2CLogger(logDEBUG) << "\tinit instruction: " 
                                << getValueString(instruction) << "\n";
        }
    }
}

/*
 * classifyBranches
 * @param(configToBranches): mapping between config variables and conditional branches
 * @param(configToInit): mapping between config variables and config init instructions
 * @param(nonInitBbs): basic blocks without any initialization instructions
 * @param(globalBasedBbs): basic blocks which depend on a config stored in a global var
 * @param(heapBasedBbs): basic blocks which depend on a config stored on the heap
 * @param(switchBasedBbs): basic blocks which use a switch-case statement as their cond. br
 *
 * this function categorizes the conditional branches depending on the config 
 * variable type. We use this information to specify what type of runtime pruning 
 * we can apply to it

 *** This is a static function so we won't rely on any instance data ***
*/
void ConfigDepAnalysis::classifyBranches(
                    ConfigToBranchSetType& configToBranches,
                    ConfigToInstSetType& configToInit,
                    std::unordered_set<BasicBlock*>& nonInitBbs,
                    std::unordered_set<BasicBlock*>& globalBasedBbs,
                    std::unordered_set<BasicBlock*>& heapBasedBbs,
                    std::unordered_set<BasicBlock*>& indCallBasedBbs,
                    std::unordered_set<BasicBlock*>& switchBasedBbs) {
    for ( ConfigToBranchSetType::iterator it = configToBranches.begin(),
                                          eit = configToBranches.end();
                                          it != eit; ++it ){
        const ConfigVariable& configVariable = (*it).first;

        /// now we want to see if this config-dependent conditional branch supports
        /// value-based matching or not
        std::set<ConditionalBranch*>& conditionalBranchSet = (*it).second;
        for ( std::set<ConditionalBranch*>::iterator sit =
                                            conditionalBranchSet.begin(),
                                        esit = conditionalBranchSet.end();
                                        sit != esit; ++sit ){
            ConditionalBranch *condBr = (*sit);
            BasicBlock *bb = condBr->getParentBb();

            /// if the conditional branch uses a switch-case statement
            if ( condBr->isSwitchBased() )
                switchBasedBbs.insert(bb);

            /// if the config variable is NOT global based and NO init
            /// instructions have been identified for it, we add it to nonInitBbs
            if ( configToInit.find(configVariable) == configToInit.end() &&
                    !configVariable.isGlobalBased() ){
                nonInitBbs.insert(bb);
                continue;
            }

            /// if the config variable is global based we add it to globalBasedBbs
            if ( configVariable.isGlobalBased() ){
                globalBasedBbs.insert(bb);
                continue;
            }

            /// if the config variable is heap based and has at least one init
            heapBasedBbs.insert(bb);

            /// if the config variable is initialized through an indirect call
            if ( configVariable.hasIndCall() )
                indCallBasedBbs.insert(bb);
        }
    }
}


void ConfigDepAnalysis::extractConfigDepConditionalBranches(void) {
    std::stack<llvm::Value*> nullStack;
    std::set<Function*>& moduleFuncs = PreProcessor::getModuleFuncs();

    for ( std::set<Function*>::iterator it = moduleFuncs.begin(),
                                        eit = moduleFuncs.end();
                                        it != eit; ++it){
        Function *fun = *it;

        for (Function::iterator bit = fun->begin(),
                ebit = fun->end();
                bit != ebit; ++bit) {
            BasicBlock& bb = *bit;
            BasicBlock *bbPtr = &bb;
            Loop *bbLoop = nullptr;
            std::unordered_set<Value*> configDepVals;

            for (llvm::BasicBlock::iterator it = bb.begin(),
                    eit = bb.end();
                    it != eit; ++it) {
                std::unordered_set<llvm::Instruction*> visitedNodes;
                llvm::Instruction& inst = *it;
                bool configDepInst = parseValue(bbPtr, &inst,
                                                configDepVals,
                                                FORWARDSLICE,
                                                nullStack, visitedNodes,
                                                nullptr, false);
            }

            Instruction *terminatorInst = bbPtr->getTerminator();
            if ( !terminatorInst )
                continue;
            if ( configDepVals.find(terminatorInst) == configDepVals.end() )
                continue;

            /// at this point the branch depends on a configuration value
            /// we'll create a conditionalBranch object
            ConditionalBranch *conditionalBranch = 
                                new ConditionalBranch(terminatorInst);

            std::stack<Value*> conditionFullChainStack;
            std::vector<Value*> conditionLastGepChainVector;
            std::unordered_set<Instruction*> visitedNodes;
            parseValue(bbPtr, terminatorInst, configDepVals,
                       BACKWARDSLICE, conditionFullChainStack, 
                       visitedNodes, bbLoop, false);

            /// TODO handle global scalar values (not dependent on GEPs)
            Value *lastGepEntry = NULL;
            while ( !conditionFullChainStack.empty() ){
                //TODO Create a map for the full condition chain
                //TODO For now we'll just keep the gep instructions 
                //      (the type their accessing, and which field)
                //TODO The key for the map will be the BB and the value will be 
                //      all the geps and their fields (we might need a class for it)

                Value *topValue = conditionFullChainStack.top();
                if ( SVFUtil::isa<llvm::GetElementPtrInst>(topValue) ){
                    lastGepEntry = topValue;
                    conditionLastGepChainVector.empty();
                }else if ( SVFUtil::isa<llvm::LoadInst>(topValue) ){
                    LoadInst *loadInst = SVFUtil::dyn_cast<LoadInst>(topValue);
                    if ( SVFUtil::isa<llvm::GetElementPtrInst>(
                                        loadInst->getPointerOperand()) ){
                        lastGepEntry = loadInst->getPointerOperand();
                        conditionLastGepChainVector.empty();
                    }else if (preProcessor->isConfigGlobalVar(
                                    loadInst->getPointerOperand()) ){
                        lastGepEntry = loadInst->getPointerOperand();
                        conditionLastGepChainVector.empty();
                    }else{
                        if ( SVFUtil::isa<Instruction>(
                                    loadInst->getPointerOperand()) ){
                            Instruction *loadOperandInst = 
                                         SVFUtil::dyn_cast<Instruction>(
                                              loadInst->getPointerOperand());
                        }else if ( SVFUtil::isa<ConstantExpr>(
                                            loadInst->getPointerOperand()) ){
                            ConstantExpr *loadOperandConstExpr = 
                                        SVFUtil::dyn_cast<ConstantExpr>(
                                                loadInst->getPointerOperand());
                            lastGepEntry = loadOperandConstExpr;
                        }else{
                            if ( bbPtr->getParent()->getName().compare("hamedmain") == 0 )
                                errs() << "inside not a GEP and not an instruction and not a constantexpr: " 
                                        << getValueString(loadInst->getPointerOperand()) << "\n";
                        }
                    }
                }
                //TODO what to do in cases where our gep is inside a load?
                //e.g. from wget: %112 = load i8, i8* getelementptr inbounds (%struct.options, %struct.options* @opt, i32 0, i32 149), align 1
                conditionLastGepChainVector.push_back(topValue);
                //errs() << getValueString(conditionFullChainStack.top()) << "\n";
                conditionFullChainStack.pop();
            }

            if ( lastGepEntry ){
                conditionalBranches.insert(conditionalBranch);
                bool addedGepToBbFieldMap = false, isStructField = false, isGlobalVar = false;
                GlobalVariable* globalVar;
                TypeIntPair structFieldPair;
                if ( SVFUtil::isa<GetElementPtrInst>(lastGepEntry) )
                    isStructField = convertGepToStructField(structFieldPair,
                         SVFUtil::dyn_cast<GetElementPtrInst>(lastGepEntry),
                         preProcessor->getStructEqMap());
                else if ( SVFUtil::isa<ConstantExpr>(lastGepEntry) )
                    isStructField = convertConstExprToStructField(structFieldPair,
                         SVFUtil::dyn_cast<ConstantExpr>(lastGepEntry),
                         preProcessor->getStructEqMap());
                else if ( preProcessor->isConfigGlobalVar(lastGepEntry) ){
                    isGlobalVar = true;
                    globalVar = SVFUtil::dyn_cast<GlobalVariable>(lastGepEntry);
                } else {
                    errs() << "lastGepEntry is neither a Gep instruction nor a GepConstantExpr. exiting...\n";
                    exit(-1);
                }
                if ( !isStructField && !isGlobalVar )
                    continue;
                ConfigVariable* configVar;
                if ( isStructField ){
                    assert(structFieldPair.first != nullptr && 
                                "structFieldPair is NULL after gep is converted!");
                // TODO set mem type of config variable
                //      we should be able to identify whether or not the configVariable is 
                //      stored on the heap or if it is a global variable
                    configVar = new ConfigVariable(structFieldPair);
                } else if ( isGlobalVar ){
                    configVar = new ConfigVariable(globalVar);
                }
                configToBranches[*configVar].insert(conditionalBranch);
                configStructToBranches[(StructType*)structFieldPair.first].insert(conditionalBranch);
                conditionalBranch->setConfigVariable(configVar);

                //Keep track of value being compared for runtime instrumentation
                BranchInst *branchInst = SVFUtil::dyn_cast<BranchInst>(terminatorInst);
                if ( branchInst &&
                        branchInst->isConditional() &&
                        SVF::SVFUtil::isa<CmpInst>(branchInst->getCondition())) {
                            // && addedGepToBbFieldMap){
                    mapLastGepToCondition(conditionalBranch,
                                          lastGepEntry, 
                                          conditionLastGepChainVector); 
                    //instructionList.push_back(terminatorInst);
                } else if ( branchInst && conditionalBranch->hasBoolConditionValue() ) {
                    conditionalBranch->setConditionValue(
                                                ConstantInt::get(
                                                    module->getContext(), 
                                                        llvm::APInt(1,1)));
                    conditionalBranch->setValueBasedMatching(
                                            analyzeDataFlow(
                                                lastGepEntry, 
                                                branchInst->getCondition(),
                                                conditionLastGepChainVector) );
                } else if ( SVFUtil::isa<SwitchInst>(terminatorInst) ){
                    SwitchInst *switchInst = 
                            SVFUtil::dyn_cast<SwitchInst>(terminatorInst);
                    conditionalBranch->setValueBasedMatching(
                                            analyzeDataFlow(
                                                lastGepEntry, 
                                                switchInst->getCondition(),
                                                conditionLastGepChainVector) );

                }else{
                    conditionalBranch->setValueBasedMatching(false);
                }
            }
        }
    }
}

void ConfigDepAnalysis::extractConfigDepInits(void) {
    identifyHeapInitFuncs();
    identifyStructBasedInits();
}

void ConfigDepAnalysis::identifyHeapInitFuncs(void){
    std::unordered_set<HeapInitFunction*>& heapInitFunctions =
                    PreProcessor::getHeapInitFunctions();
    for ( std::unordered_set<HeapInitFunction*>::iterator 
                                it = heapInitFunctions.begin(),
                                eit = heapInitFunctions.end();
                                it != eit; ++it ){
        HeapInitFunction *heapInitFunc = *it;
        /// parse value returned/passed by/to init function 
        /// to check if a config-related struct is initialized through it
        heapInitFunc->evaluate();
        if ( !heapInitFunc->isConfigStructRelated() )
            continue;
        /// extract struct types which are zeroed out by this init func
        std::unordered_set<StructType*>& stTypes = 
                        heapInitFunc->getStructTypes();
        for ( std::unordered_set<StructType*>::iterator it = stTypes.begin(),
                                                    eit = stTypes.end();
                                                    it != eit; ++it ){
            traverseStructFields(*it, heapInitFunc);
        }
    }
}

void ConfigDepAnalysis::traverseStructFields(StructType *stType, HeapInitFunction *heapInitFunc){
    stType = getBaseStType(stType, PreProcessor::getStructEqMap());
    for ( int i = 0; i < stType->getNumElements(); ++i ){
        TypeIntPair structFieldPair = std::make_pair(stType, i);
        ConfigVariable* configVar = new ConfigVariable(structFieldPair);
        ConfigInitInst* configInitInst = new ConfigInitInst(heapInitFunc);
        configToInitInsts[*configVar].insert(*configInitInst);
    }
}

/*****************************************************************/
/*                          Legacy Code   */
/*****************************************************************/

void ConfigDepAnalysis::identifyStructBasedInits(void){

    std::vector<std::string> externalWriteFunctions;
    externalWriteFunctions.push_back("llvm.memcpy.p0i8.p0i8.i32");
    externalWriteFunctions.push_back("llvm.memcpy.p0i8.p0i8.i64");
    externalWriteFunctions.push_back("strcpy");
    externalWriteFunctions.push_back("memcpy");
    externalWriteFunctions.push_back("apr_palloc");     //added by Hamed
    // TODO add more? 

    // added 05.01.2021 to handle apr_array_header_t cases
    std::list<std::string> skipConfigTypes;
    //skipConfigTypes.push_back("struct.apr_array_header_t");

    std::vector<Instruction*> configStoreList; // can contain store and calls

    std::stack<std::tuple<Value*, Value*, GetElementPtrInst*>> workStack; // The current Value and its parent, and the gep if any it originates from
    std::vector<Value*> added;
    std::vector<Value*> visitedList;

    std::map<Instruction*, GetElementPtrInst*> storeToGepMap; // can contain store and calls


    /// identify any allocations of any config-related struct types
    /// TODO identify global variables
    std::set<Function*>& moduleFuncs = PreProcessor::getModuleFuncs();
    for ( std::set<Function*>::iterator it = moduleFuncs.begin(),
                                        eit = moduleFuncs.end();
                                        it != eit; ++it){
        Function *fun = *it;
        for (inst_iterator I = llvm::inst_begin(fun), 
                           E = llvm::inst_end(fun); 
                           I != E; ++I) {
            if (AllocaInst* AI = SVFUtil::dyn_cast<AllocaInst>(&*I)) {
                Type* ty = AI->getAllocatedType();
                if ( preProcessor->isConfigStruct(getBaseType(ty)) ) {
                    workStack.push(std::make_tuple(AI, nullptr, nullptr));
                }
            }
            /// added following on 12.29.21 (hamed)
            /// if we have the following:
            /// struct srv; struct serv_conf and only serv_conf is annotated
            /// but is always/sometimes accessed through srv, the alloca will be
            /// struct.srv which is not a config-related struct type, the first
            /// instruction will be the gep itself where the ptr is of the config struct type
            if (GetElementPtrInst* gepInst = SVFUtil::dyn_cast<GetElementPtrInst>(&*I)) {
                if ( preProcessor->isConfigStruct(gepInst->getSourceElementType()) ) {
                    workStack.push(std::make_tuple(gepInst, nullptr, nullptr)); /// is this correct? TODO
                }
            }
        }
        // GlobalVariables
        for (SVFModule::global_iterator git = svfModule->global_begin(), 
                                        egit = svfModule->global_end();
                                        git != egit; ++git) {
            llvm::GlobalVariable* gvar = *git;
            Type* ty = gvar->getType();
            if ( preProcessor->isConfigStruct(getBaseType(ty)) ) {
                if (std::find(added.begin(), added.end(), gvar) == added.end()) {
                    workStack.push(std::make_tuple(gvar, nullptr, nullptr));
                    added.push_back(gvar); // to keep track
                }
            }
        }
    }


    while (!workStack.empty()) {
        Value* work = std::get<0>(workStack.top());

        Value* parent = std::get<1>(workStack.top());
        GetElementPtrInst* parentGep = std::get<2>(workStack.top());

        if (parent) {
            if (SVFUtil::isa<GetElementPtrInst>(parent)) {
                GetElementPtrInst* tempGep = 
                            SVFUtil::dyn_cast<GetElementPtrInst>(parent);
                if (getBaseType(tempGep->getSourceElementType())->isStructTy()) {
                    parentGep = tempGep;
                }
            }
        }

        workStack.pop();

        visitedList.push_back(work);

        // which gep is this?
        if (CallInst* CI = SVFUtil::dyn_cast<CallInst>(work)) {
           if (Function* f = CI->getCalledFunction()) {
               if (f->hasName() &&
                       (f->getName().startswith("llvm.var.annot")
                        || f->getName().startswith("llvm.ptr.annot"))) {
                   continue;
               }
               if (std::find(externalWriteFunctions.begin(), externalWriteFunctions.end(),
                           f->getName()) != externalWriteFunctions.end()) {
                   if (parentGep) {
                       configStoreList.push_back(CI);
                       storeToGepMap[CI] = parentGep;
                   }
               }
               // TODO: handle interprocedural stuff
               if (f->isDeclaration()) {
                   continue;
               }
               // Do interprocedural 
               // if VarArg, then just assume that this is written and move on
               if (f->isVarArg()) {
                   if (parentGep) {
                       configStoreList.push_back(CI);
                       storeToGepMap[CI] = parentGep;
                       // TODO: ideally, *all* objects under this should be
                       // marked as "written to"
                       // TODO: or maybe handle var-arg correctly
                   }
               } else {
                   Value* argOnStack = findArgOnStack(parent, CI, visitedList);

                   if (std::find(visitedList.begin(), visitedList.end(), argOnStack) == visitedList.end()) {
                       workStack.push(std::make_tuple(argOnStack, work, parentGep));
                   }
               }
           } else {
                int argCount = CI->getNumArgOperands();
                for ( int i = 0; i < argCount; i++ ){
                    Value *arg = CI->getArgOperand(i);
                    if ( arg == parent ){   
                        ///if the current arg is the reason we're considering this call inst

                        //errs() << "arg which caused callinst to be config-related: " 
                        //<< getValueString(arg) << "\n";
                        if ( getBaseType(arg->getType())->isStructTy() && 
                                preProcessor->isConfigStruct(
                                                getBaseType(arg->getType())) ){
                            //if the arg type is a struct type and in our config-related list -- we can skip
                            continue;
                        }else{
                            //if not, we have to consider it as written to at this point
                            errs() << "function: " << CI->getParent()->getParent()->getName() 
                                   << " Config value passed to indirect call: " << *CI << "\n";
                            errs() << "arg value type is not a struct type or is not in" 
                                   << " our config-related list: " << getValueString(arg) << "\n";
                            if ( parentGep ){
                                configStoreList.push_back(CI);
                                storeToGepMap[CI] = parentGep;
                            }
                        }
                    }
                }
           }
        } else if (StoreInst* SI = SVFUtil::dyn_cast<StoreInst>(work)) {
            // We care about conf.b = 10 and not ret = conf.b
            // store 10, conf.b <-- pointerOperand
            if (parentGep && SI->getPointerOperand() == parent) {
                configStoreList.push_back(SI);
                storeToGepMap[SI] = parentGep;
            }
            // Store is a sink, no need to push to workStack
        } else {
            // Still need to follow casts or whatevers
            for (User* u: work->users()) {
                if (Instruction* inst = SVFUtil::dyn_cast<Instruction>(u)) {
                    if (std::find(visitedList.begin(), visitedList.end(), inst) == 
                                                             visitedList.end()) {
                        workStack.push(std::make_tuple(inst, work, parentGep));
                    }
                }
            }
        }
    }


    for (Instruction* store: configStoreList) {
        GetElementPtrInst* gepStorePtr = storeToGepMap[store];
        assert(gepStorePtr && "The store should be from a gep");
        ConfigVariable* configVar = new ConfigVariable(gepStorePtr, preProcessor);

        ////for debugging
        //if ( store->getParent() && 
        //        store->getParent()->getParent() &&
        //        store->getParent()->getParent()->hasName() &&
        //        store->getParent()->getParent()->getName() == "ngx_set_user" ){
        //    getValueString(gepStorePtr);
        //}
        //// end for debugging
        
        if ( SVFUtil::isa<StoreInst>(store) || 
                SVFUtil::isa<CallInst>(store) ){
            /// we'll have to handle the callinst so that it writes to 
            /// ALL indexes of the struct field
            if ( SVFUtil::isa<CallInst>(store) )
                configVar->setIndCall(SVFUtil::dyn_cast<CallInst>(store));
            ConfigInitInst* configInitInst = new ConfigInitInst(store);
            configToInitInsts[*configVar].insert(*configInitInst);
        }
    }
}

Value* ConfigDepAnalysis::findArgOnStack(Value* operand, CallInst* CI, std::vector<Value*>& visitedList) {
    int pos = -1;

    for (int i = 0; i < CI->getNumArgOperands(); i++) {
        Value* valOp = CI->getArgOperand(i);
        if (valOp == operand) {
            pos = i;
            break;
        }
    }
    assert(pos > -1 && "Can't find match for operand in callinst");
    Function* calledFunction = CI->getCalledFunction();
    assert(calledFunction && "Should be a direct call");
    FunctionType* functionTy = calledFunction->getFunctionType();
    assert(functionTy->getNumParams() >= pos && "Invalid position of arg");
    // We're in -O0, so the argument must be stored on the stack
    int k = 0;
    Argument* arg = nullptr;
    for (Argument& a: calledFunction->args()) {
        if (k == pos) {
            arg = &a;
            break;
        }
        k++;
    }
    assert(arg && "Arg can't be null");

    // Find the store on the stack
    std::vector<Value*> argStoreWorkList;
    argStoreWorkList.push_back(arg);
    StoreInst* stInst = nullptr;

    bool found = false;

    while (!argStoreWorkList.empty() && !found) {
        Value* work = argStoreWorkList.back();
        argStoreWorkList.pop_back();
        for (User* user: work->users()) {
            if (StoreInst* si = SVFUtil::dyn_cast<StoreInst>(user)) {
                if (si->getValueOperand() == work) {
                    stInst = si;
                    found = true;
                    break;
                }
            } else if (CastInst* cast = SVFUtil::dyn_cast<CastInst>(user)) {
                argStoreWorkList.push_back(cast);
            }
        }
    }


    //hack by Hamed
    //if ( stInst == nullptr )
    //    return NULL;
    //finished hack

    assert(stInst && "Argument not stored anywhere?");
    visitedList.push_back(stInst);

    Value* stackObj = stInst->getPointerOperand();

    /*
    if (AllocaInst* stackObj = SVFUtil::dyn_cast<AllocaInst>(ptrOperand)) {
        return stackObj;
    }
    */
    return stackObj;
}

void ConfigDepAnalysis::mapLastGepToCondition(ConditionalBranch* conditionalBranch, 
                        Value* lastGep,
                        std::vector<Value*>& conditionLastGepChainVector) {
    assert( conditionalBranch->isConditional() && 
            "mapLastGepCondition called with non-conditional branch!");
    CmpInst *cmpInst = conditionalBranch->getCmpInst();
    if ( !cmpInst ){
        conditionalBranch->setConfigDep(false);
        conditionalBranch->setValueBasedMatching(false);
        return;
    }
    if ( !SVFUtil::isa<ICmpInst>(cmpInst) ){
        //TODO FCmpInst need to be handled as well
        conditionalBranch->setConfigDep(false);
        conditionalBranch->setValueBasedMatching(false);
        return;
    }     
    Value *lhs = cmpInst->getOperand(0);
    Value *rhs = cmpInst->getOperand(1);
    //The last gep instruction might be cast to another type before reaching the cmp instruction
    //So we will just check which side of the comparison is a constant
    //We will consider that as the condition value
    if ( SVFUtil::isa<Constant>(lhs) && !SVFUtil::isa<Constant>(rhs) ){
        conditionalBranch->setConditionValue(lhs);
        conditionalBranch->setConditionConstantSide(LEFTCONSTANT);
        conditionalBranch->setValueBasedMatching(
                    analyzeDataFlow(lastGep, rhs, conditionLastGepChainVector));
    }else if ( !SVFUtil::isa<Constant>(lhs) && SVFUtil::isa<Constant>(rhs) ){
        conditionalBranch->setConditionValue(rhs);
        conditionalBranch->setConditionConstantSide(RIGHTCONSTANT);
        conditionalBranch->setValueBasedMatching(
                    analyzeDataFlow(lastGep, lhs, conditionLastGepChainVector));
    }else if ( !SVFUtil::isa<Constant>(lhs) && !SVFUtil::isa<Constant>(rhs) ){
        //TODO can we improve this?
        conditionalBranch->setValueBasedMatching(false);
    }else{
        errs() << "both lhs and rhs of cmp instruction are constants." 
               << " That's strange. This shouldn't happen!\n";
        errs() << "CmpInst: " << getValueString(cmpInst) << "\n";
        errs() << "lhs: " << getValueString(lhs) << "\n";
        errs() << "rhs: " << getValueString(rhs) << "\n";
        assert(false && "mapLastGepToCondition both lhs and rhs of cmp instruction are constants. This shouldn't happen!");
    }
}

bool ConfigDepAnalysis::analyzeDataFlow(Value *startVal, 
                                        Value *endVal, 
                                        std::vector<Value*>& valChain){
    bool startValSeen = false;
    bool isDependent = false;
    bool isConstant = false;
    bool result = true;
    bool isGlobalVarBased = false;

    if ( SVFUtil::isa<GlobalVariable>(startVal) )
        isGlobalVarBased = true;

    std::vector<Value*> dependentValues;
    dependentValues.push_back(startVal);

/*
752:                                              ; preds = %743
  %753 = load i32, i32* getelementptr inbounds (%struct.settings, %struct.settings* @settings, i32 0, i32 22), align 4
  %754 = load i32, i32* getelementptr inbounds (%struct.settings, %struct.settings* @settings, i32 0, i32 23), align 8
  %755 = srem i32 %753, %754
  %756 = icmp ne i32 %755, 0
  br i1 %756, label %757, label %762

*/
    //errs() << "analyzeDataFlow called startVal: " << getValueString(startVal) << " endVal: " << getValueString(endVal) << "\n";

    if ( startVal == endVal )
        return result;
    for ( std::vector<Value*>::iterator it = valChain.begin(); 
                                        //(*it) != endVal; ++it ){
                                        it != valChain.end(); ++it ){
        isConstant = true;
        if ( !SVFUtil::isa<LoadInst>(*it) && 
                !SVFUtil::isa<CastInst>(*it) &&
                !SVFUtil::isa<StoreInst>(*it) &&
                !SVFUtil::isa<GetElementPtrInst>(*it) )
            return false;

        if ( *it == endVal )
            break;
        if ( *it == startVal ){
            startValSeen = true;
            continue;
        }
        if ( isGlobalVarBased && isLoadFromGlobal(*it, startVal) ){
            startValSeen = true;
            continue;
        }
        if ( !startValSeen )
            continue;
        Value* currVal = *it;
        if ( !SVFUtil::isa<Instruction>(currVal) )
            continue;
        Instruction* currInst = SVFUtil::dyn_cast<Instruction>(currVal);
        
        //commented out previous logic (seems wrong 12.19.21) 
/*
        //Check if instruction has any operand
        for (User::op_iterator opIt = currInst->op_begin(), 
                               opEnd = currInst->op_end(); 
                               opIt != opEnd; ++opIt){
            Value* operand = (*opIt);
            std::vector<Value*>::iterator findIt = std::find(
                                                    dependentValues.begin(), 
                                                    dependentValues.end(), 
                                                    operand);
            if ( findIt != dependentValues.end() ){
                isDependent = true;
                dependentValues.push_back(operand);
            }else if ( !SVFUtil::isa<Constant>(operand) ){
                isConstant = false;
            }
        }
        if ( isDependent ){
            //errs() << "data flow analysis isDependent is true\n";
            if ( isConstant ){
                if ( SVFUtil::isa<LoadInst>(currInst) || 
                     SVFUtil::isa<BinaryOperator>(currInst) || 
                     SVFUtil::isa<CastInst>(currInst) ){
                    //TODO check if other operands are constants

                }else{
                    //errs() << "data flow analysis (probably) can't be done because of this instruction: " << getValueString(currVal) << "\n";
                    result = false;
                }
            }else{
                //errs() << "data flow analysis can't be done because of a nonconstant operand in this instruction: " << getValueString(currVal) << "\n";
                result = false;
            }
        }else
            errs() << "data flow analysis isDependent is false\n";
*/
    }
    //errs() << "data flow analysis result: " << result << "\n";
    return result;
}


bool ConfigDepAnalysis::parseValue(BasicBlock *bb,
                                   Value *value,
                                   std::unordered_set<Value*>& configDepVals,
                                   int type,
                                   std::stack<Value*> &conditionFullChainStack,
                                   std::unordered_set<Instruction*> &visitedNodes,
                                   Loop *bbLoop,
                                   bool extractConfigStructs) {
    bool result = false;

    if ( !isReverse(type) && !isLoopVariantSlice(type) &&
            std::count(configDepVals.begin(), configDepVals.end(), value ) ) {
        return true;
    }

    if ( SVFUtil::isa<Instruction>(value) ||
            SVFUtil::isa<Instruction>(value->stripPointerCasts())) {
        result = parseInstruction(bb, SVFUtil::dyn_cast<Instruction>(value), 
                                  configDepVals,
                                  type, conditionFullChainStack, 
                                  visitedNodes, bbLoop, 
                                  extractConfigStructs);
        if ( !isReverse(type) && !isLoopVariantSlice(type) && result )
            configDepVals.insert(value);
    } else if (SVFUtil::isa<llvm::ConstantExpr>(value) ) {
        result = parseConstantExpr(bb, configDepVals,
                        SVFUtil::dyn_cast<llvm::ConstantExpr>(value), 
                        type, conditionFullChainStack, visitedNodes, 
                        bbLoop, extractConfigStructs);
        if ( !isReverse(type) && !isLoopVariantSlice(type) && result )
            configDepVals.insert(value);
    } else {
        /// added to support config variables stored in global vars
        if ( SVFUtil::isa<GlobalVariable>(value) &&
                preProcessor->isConfigGlobalVar(value) )
            return true;

        if ( preProcessor->isConfigStruct(value) )
            result = true;

    }
    return result;
}

bool ConfigDepAnalysis::parseInstruction(BasicBlock *bb, 
                               Instruction *inst, 
                               std::unordered_set<Value*>& configDepVals,
                               int type, 
                               std::stack<Value*> &conditionFullChainStack, 
                               std::unordered_set<Instruction*> &visitedNodes,
                               Loop *bbLoop, 
                               bool extractConfigStructs){
    bool result = false;

    /// added for mysql error (why didn't we have this before???)
    if ( std::find(visitedNodes.begin(), visitedNodes.end(), inst) != 
                                                    visitedNodes.end() )
        return result;
    visitedNodes.insert(inst);
    /// end of added

    if ( SVFUtil::isa<AllocaInst>(inst) ){
        AllocaInst *allocaInst = SVFUtil::dyn_cast<AllocaInst>(inst);

        if ( ( isReverse(type) || isLoopVariantSlice(type) ) && 
            std::find(visitedNodes.begin(), visitedNodes.end(), inst) 
                                    == visitedNodes.end() ){
            visitedNodes.insert(inst);
            /// First we need to see what gets stored into this allocated 
            /// memory, then push the allocaInst itself
            for (llvm::User* user: allocaInst->users()) {
                if (llvm::CastInst* castInst = SVFUtil::dyn_cast<CastInst>(user)){
                    //TODO
                }else if ( llvm::StoreInst* storeInst = 
                                    SVFUtil::dyn_cast<StoreInst>(user)) {
                    if ( std::find(visitedNodes.begin(), 
                                   visitedNodes.end(), 
                                   storeInst) == visitedNodes.end())
                        parseInstruction(bb, storeInst, configDepVals, 
                                         type, conditionFullChainStack, 
                                         visitedNodes, bbLoop, 
                                         extractConfigStructs);
                }
            }
            conditionFullChainStack.push(inst);
        }else{
            Type *allocaType = allocaInst->getAllocatedType();
            allocaType = getBaseType(allocaType);

            if ( allocaType->isStructTy() ){
                StructType* valueStTy = 
                    SVFUtil::dyn_cast<llvm::StructType>(allocaType);
                valueStTy = getBaseStType(valueStTy,
                                        PreProcessor::getStructEqMap(),
                                        false);
                if ( preProcessor->isConfigStruct(valueStTy) )
                    result = true;
            }else{
                result = false;
            }

            if ( result )
                configDepVals.insert(inst);
        }
    }else if ( SVFUtil::isa<LoadInst>(inst) ){
        if ( isReverse(type) || isLoopVariantSlice(type) ){
            conditionFullChainStack.push(inst);
            visitedNodes.insert(inst);
        }
        llvm::Value *value = inst->getOperand(0);
        if ( !isReverse(type) || isInUnorderedSet(configDepVals, value) )
            result |= parseValue(bb, value, configDepVals,
                                 type, conditionFullChainStack, 
                                 visitedNodes, bbLoop, 
                                 extractConfigStructs);
        if ( !isReverse(type) && !isLoopVariantSlice(type) && result )
            configDepVals.insert(value);
    }else if ( SVFUtil::isa<StoreInst>(inst) ){
        if ( isReverse(type) || isLoopVariantSlice(type) ){
            conditionFullChainStack.push(inst);
            visitedNodes.insert(inst);
        }
        StoreInst *st = SVFUtil::dyn_cast<StoreInst>(inst);

        //store value, pointer : stores value into address pointed to by pointer
        // IF value being stored into pointer address is in the TARGET -> pointer address should be added to the target as well
        // IF pointer address is in TARGET -> the value should not be affected
        // store i32 0, getelementptr .... -> in this case if the gep is depenedent on the annotated struct, we shouldn't make i32 0 dependent
        // BUT
        // store getelementptr ..., %30 -> in this case if getelementptr is dependent on the annotated struct, we should make the %30 dependent as well

        bool pointerResult = false, valueResult = false;
        if ( !isReverse(type) || 
                isInUnorderedSet(configDepVals, st->getPointerOperand()) )
            pointerResult = parseValue(bb, st->getPointerOperand(), 
                                       configDepVals, type, 
                                       conditionFullChainStack, 
                                       visitedNodes, bbLoop, 
                                       extractConfigStructs);
        if ( !isReverse(type) || 
                isInUnorderedSet(configDepVals, st->getValueOperand()) )
            valueResult = parseValue(bb, st->getValueOperand(), 
                                     configDepVals, type, 
                                     conditionFullChainStack, 
                                     visitedNodes, bbLoop, 
                                     extractConfigStructs);


        result = pointerResult | valueResult;

        if ( !isReverse(type) && !isLoopVariantSlice(type) && valueResult )
            configDepVals.insert(st->getPointerOperand());

    }else if ( SVFUtil::isa<GetElementPtrInst>(inst) ){
        if ( isReverse(type) ){     
            /// TODO Should we enter this clause if it's a loop variable slice as 
            /// well???? Could it cause an indefinite loop?
            if ( bbLoop != NULL ){ //&& !bbLoop->hasLoopInvariantOperands(inst) ){
                GetElementPtrInst *gepInst = 
                                SVFUtil::dyn_cast<GetElementPtrInst>(inst);

                for (User::op_iterator I = gepInst->idx_begin(), 
                                       E = gepInst->idx_end(); 
                                       I != E; ++I){
                    llvm::Value *operand = (*I);
                    if ( !bbLoop->isLoopInvariant(operand) ){
                        //errs() << "depends on LOOP: " << getValueString(inst) << "\n";


                        //UPDATE: This approach doesn't seem correct. We should extract the condition of each loop separately. Here we should just use it
                        /*//TODO
                        // 1. backslice operand to alloca
                        // 2. identify users of alloca
                        // 3. 
                        //
                        //
                        std::stack<llvm::Value*> loopVariableFullChainStack;
                        std::set<llvm::Instruction*> loopVariableVisitedNodes;
                        parseValue(bb, operand, LOOPVARIANTSLICE, loopVariableFullChainStack, loopVariableVisitedNodes, bbLoop);

                        errs() << "---->full loop variable trace for: " << getValueString(operand) << "\n";
                        while ( !loopVariableFullChainStack.empty() ){
                            errs() << getValueString(loopVariableFullChainStack.top()) << "\n";
                            loopVariableFullChainStack.pop();
                        }
                        errs() << "<------------------------------------\n";
                        */

                    }
                }
            }
            conditionFullChainStack.push(inst);
            visitedNodes.insert(inst);
        }

        GetElementPtrInst *gepInst = 
                            SVFUtil::dyn_cast<GetElementPtrInst>(inst);
        if ( gepInst->getParent() && 
                gepInst->getParent()->getParent()->hasName() &&
                gepInst->getParent()->getParent()->getName() == "server_main_setup" )
            getValueString(gepInst);
        if ( !isReverse(type) || 
                isInUnorderedSet(configDepVals, gepInst->getPointerOperand()) ){
            result |= preProcessor->isConfigStruct(gepInst->getSourceElementType());
            result |= parseValue(bb, gepInst->getPointerOperand(), configDepVals,
                                 type, conditionFullChainStack, visitedNodes, 
                                 bbLoop, extractConfigStructs);
        }
        if ( !isReverse(type) && !isLoopVariantSlice(type) && result ){
            //addToTargetValues(gepInst->getPointerOperand());
            //BUG: We had a bug here where we would add the pointeroperand to the target values
            //It seems like we should only add the gep result to the target value, which we weren't doing
            configDepVals.insert(gepInst);
        }
        //result |= parseValue(bb, gepInst->getValueOperand());
        for (User::op_iterator I = gepInst->idx_begin(), 
                               E = gepInst->idx_end(); 
                               I != E; ++I){
            llvm::Value *operand = (*I);
            //errs() << "parsing gep operand using op_iterator: " << getValueString(operand) << "\n";

            if ( !isReverse(type) || isInUnorderedSet(configDepVals, operand) )
                result |= parseValue(bb, operand, configDepVals, 
                                     type, conditionFullChainStack, 
                                     visitedNodes, bbLoop, 
                                     extractConfigStructs);
            if ( !isReverse(type) && !isLoopVariantSlice(type) && result )
                //addToTargetValues(operand);
                //BUG: Same here. We had a bug here where we would add the pointeroperand to the target values
                //It seems like we should only add the gep result to the target value, which we weren't doing
                configDepVals.insert(gepInst);
        }

        //int operandCount = gepInst->getNumIndices();

        //for ( int i = 0; i < operandCount; i++ ){
        //    llvm::Value *operand = (inst)->getOperand(i);
        //    if ( bb->getParent()->getName().compare("ssl_rand_seed") == 0 )
        //        errs() << "parsing gep index: " << i << " value: " << getValueString(operand) << "\n";

        //    if ( !reverse || isInTargetValues(operand) )
        //        result |= parseValue(bb, operand, reverse, conditionFullChainStack, bbLoop);
        //    if ( !reverse && result )
        //        //addToTargetValues(operand);
        //        //BUG: Same here. We had a bug here where we would add the pointeroperand to the target values
        //        //It seems like we should only add the gep result to the target value, which we weren't doing
        //        addToTargetValues(gepInst);
        //}
    }else if ( SVFUtil::isa<CmpInst>(inst) ){
        llvm::CmpInst *cmpInst = SVFUtil::dyn_cast<CmpInst>(inst);

        if ( !SkipCmpEqZero || !isEqZeroCmp(cmpInst) ){
            if ( isReverse(type) || isLoopVariantSlice(type) ){
                conditionFullChainStack.push(inst);
                visitedNodes.insert(inst);
            }
            Value *lhs = cmpInst->getOperand(0);
            if ( !isReverse(type) || isInUnorderedSet(configDepVals, lhs) )
                result |= parseValue(bb, lhs, configDepVals,
                                     type, conditionFullChainStack, 
                                     visitedNodes, bbLoop, 
                                     extractConfigStructs);
            Value *rhs = cmpInst->getOperand(1);
            if ( !isReverse(type) || isInUnorderedSet(configDepVals, rhs) )
                result |= parseValue(bb, rhs, configDepVals, 
                                     type, conditionFullChainStack, 
                                     visitedNodes, bbLoop, 
                                     extractConfigStructs);
            if ( !isReverse(type)&& !isLoopVariantSlice(type) && result ){
                //addToTargetValues(lhs);
                //addToTargetValues(rhs);
                configDepVals.insert(cmpInst);
                targetCmpInst++;
            }
        }
        if ( !isReverse(type) && !isLoopVariantSlice(type) )
            totalCmpInst++;
    }else if ( SVFUtil::isa<BranchInst>(inst) && 
                    (isReverse(type) || isLoopVariantSlice(type)) ){
        BranchInst *branchInst = SVFUtil::dyn_cast<BranchInst>(inst);
        if ( branchInst->isConditional() )
            parseValue(bb, branchInst->getCondition(), configDepVals,
                       type, conditionFullChainStack, visitedNodes, 
                       bbLoop, extractConfigStructs);
    }else if ( SVFUtil::isCallSite(inst) ){
        //llvm::CallInst *callInst = SVFUtil::dyn_cast<CallInst>(inst);
        //int argCount = callInst->getNumArgOperands();
        //if ( isReverse(type) || isLoopVariantSlice(type) ){
        //    conditionFullChainStack.push(inst);
        //    visitedNodes.insert(inst);
        //}

        //for ( int i = 0; i < argCount; i++ ){
        //    Value *arg = callInst->getArgOperand(i);
        //    if ( !isReverse(type) || isInTargetValues(arg) ){
        //        result |= parseValue(bb, arg, type, conditionFullChainStack, visitedNodes, bbLoop, extractConfigStructs);
        //        if ( bb->getParent()->getName().compare("hamedmain") == 0 )
        //            errs() << "callsite argument: " << getValueString(arg) << "\n";
        //    }
        //}
        //if ( !isReverse(type) && !isLoopVariantSlice(type) && result ){
        //    //for ( int i = 0; i < argCount; i++ ){
        //    //    Value *arg = callInst->getArgOperand(i);
        //    //    addToTargetValues(arg);
        //    //}
        //    ////The code above was a bug, if one of the callsite arguments is identified as being in the target values
        //    ////then we need to consider the call instruction result as dependent?? (maybe) TODO

        //    //update: 05.12.2021    why should we consider the callinst as dependent? this causes bugs
        //    //e.g. httpd: open_error_logs: if ( apr_file_open(server_rec[3],...) != 0 ) -> this shouldn't be dependent, but we're considering it as dependent
        //    //addToTargetValues(callInst);
        //}
    }else{
        /// in forward mode, branch and switch inst are handled here
        int operandCount = inst->getNumOperands();
        if ( isReverse(type) || isLoopVariantSlice(type) ){
            conditionFullChainStack.push(inst);
            visitedNodes.insert(inst);
        }

        for ( int i = 0; i < operandCount; i++ ){
            if ( !isReverse(type) || isInUnorderedSet(configDepVals, inst->getOperand(i)) ){
                result |= parseValue(bb, inst->getOperand(i), configDepVals, 
                                     type, conditionFullChainStack, 
                                     visitedNodes, bbLoop, 
                                     extractConfigStructs);
            }
        }
        if ( !isReverse(type) && !isLoopVariantSlice(type) && result ){
            //for ( int i = 0; i < operandCount; i++ ){
            //    addToTargetValues(inst->getOperand(i));
            //}
            //TODO this pattern doesn't seem right, that when one argument of an instruction is dependent we add the rest as dependents as well
            configDepVals.insert(inst);
        }
    }
    //NOTE: The reason isCallSite is outside the main if/else clause is that we want to parse the callsite for any values dependent on the annotated structs, this happens in the ELSE clause of the above if/else code
    //BUT, we also want to generate edges between basic blocks making calls to other functions. That is handled in the following code
    if ( !isReverse(type) && !isLoopVariantSlice(type) && SVFUtil::isCallSite(inst) ){
        //errs() << "reached callsite: " << getValueString(inst) << "\n";
        CallSite cs = SVFUtil::getLLVMCallSite(inst);
        CallSite *csPtr = &cs;
        const SVFFunction *calleeFunc = NULL;

        //First check if callsite is using a bitcast
        Instruction *currInst = inst;
        if ( SVFUtil::isa<BitCastOperator>(csPtr->getCalledValue()) ){
            BitCastOperator *castInst = 
                    SVFUtil::dyn_cast<llvm::BitCastOperator>(
                                            csPtr->getCalledValue());
            //errs() << "bitcastoperator found: " << getValueString(inst) << "\n";
            //errs() << "bitcastoperator castInst->getSrcTy(): " << getTypeString(castInst->getSrcTy()) << "\n";
            if ( SVFUtil::isa<Function>(castInst->getOperand(0)) ){
                //errs() << "bitcastoperator castInst->getOperand(0): is a function\n";
                calleeFunc = SVF::SVFUtil::getDefFunForMultipleModule(
                                    SVFUtil::dyn_cast<Function>(
                                            castInst->getOperand(0)));
                //errs() << "bitcastoperator calleeFunc: " << calleeFunc->getName() << "\n";
            }
            //errs() << "bitcastoperator castInst->getNumOperands: " << castInst->getNumOperands() << "\n";
            //errs() << "bitcastoperator getDestTy(): " << getTypeString(castInst->getDestTy()) << "\n";

        }
    }

    return result;
}



bool ConfigDepAnalysis::parseConstantExpr(BasicBlock *bb, 
                            std::unordered_set<Value*>& configDepVals,
                            ConstantExpr *constExpr, int type, 
                            std::stack<Value*> &conditionFullChainStack, 
                            std::unordered_set<Instruction*> &visitedNodes, 
                            Loop *bbLoop, bool extractConfigStructs){
    bool result = false;

    //TODO
    //What happens for reverse mode for constant expressions?
    //visitedNodes is of instruction type, so do we need to keep track of these constant expressions?
    //if ( isReverse(type) ){
    //        conditionFullChainStack.push(constExpr);
    //        visitedNodes.insert(constExpr);
    //}

    for (User::op_iterator I = constExpr->op_begin(), 
                           E = constExpr->op_end(); I != E; ++I){
        llvm::Value *operand = (*I);

        if ( !isReverse(type) || isInUnorderedSet<Value*>(configDepVals, operand) )
            result |= parseValue(bb, operand, 
                                 configDepVals, type, 
                                 conditionFullChainStack, 
                                 visitedNodes, bbLoop, 
                                 extractConfigStructs);
        if ( !isReverse(type) && !isLoopVariantSlice(type) && result )
            //BUG: Same here. We had a bug here where we would add the pointeroperand to the target values
            //It seems like we should only add the gep result to the target value, which we weren't doing
            configDepVals.insert(constExpr);
    }

    return result;
}
