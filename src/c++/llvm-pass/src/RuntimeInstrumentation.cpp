#include "Graphs/ICFG.h"
#include "Util/ExtAPI.h"
#include "llvm/IR/InstIterator.h"
#include "RuntimeInstrumentation.h"
#include "PreProcessor.h"
#include "ConfigInitInst.h"
#include "C2CUtils.h"
#include "C2CLog.h"

using namespace llvm;
using namespace SVF;
using namespace C2C;

static llvm::cl::list<std::string> TransitionFuncStrs("transition-func",
                            llvm::cl::CommaSeparated,
                            llvm::cl::desc("C2C-Instrument - comma-separated transition functions"));

static llvm::cl::opt<bool> TrackExecution("track-execution",
                            llvm::cl::desc("C2C-Instrument - track function execution?"),
                            llvm::cl::init(false));

static llvm::cl::opt<bool> AfterRet("instrument-after-ret", 
                            llvm::cl::desc("C2C-Instrument - instrument after return of transition function or upon invoke"),
                            llvm::cl::init(false));

/*
 * instrument
 *
 * instrument entire program by first identifying type of conditional
 * branch, creating global tables which stores status of each branch 
 * and instrumenting initialization instructions
*/
void RuntimeInstrumentation::instrument(void) {
    ConfigToBranchSetType& configToBranches = 
                configDepAnalysis->getConfigToBranches();
    ConfigToInstSetType& configToInit = 
                configDepAnalysis->getConfigToInitInsts();
    std::set<GlobalVariable*>& configDepGlobalVars =
                configDepAnalysis->getConfigDepGlobalVars();
    std::unordered_set<BasicBlock*> nonInitBbs;
    std::unordered_set<BasicBlock*> globalBasedBbs;
    std::unordered_set<BasicBlock*> heapBasedBbs;
    std::unordered_set<BasicBlock*> indCallBasedBbs;
    std::unordered_set<BasicBlock*> switchBasedBbs;

    /// instrument program to create initial table as global variable
    /// at this point we have 4 scenarios for each basic block:
    ///     1. the branch is not a configuration-dependent conditional branch
    ///     2. the branch is a configuration-dependent conditional branch 
    ///        and the config variable is stored as a global variable
    ///     3. the branch is a configuration-dependent conditional branch 
    ///        and the config variable is stored as a heap object 
    ///        and has at least one init instruction
    ///     4. the branch is a configuration-dependent conditional branch
    ///        and the config variable is stored as a heap object 
    ///        but we weren't able to find any init instructions

    ConfigDepAnalysis::classifyBranches(configToBranches,
                     configToInit,
                     nonInitBbs, 
                     globalBasedBbs, 
                     heapBasedBbs,
                     indCallBasedBbs,
                     switchBasedBbs);

    createTableGlobalVar(nonInitBbs, 
                         globalBasedBbs, 
                         heapBasedBbs,
                         switchBasedBbs, 
                         PreProcessor::totalFunctionCount);

    /// create table with bb count of each function (used in checkAllConditions func)
    createBbCountTableGlobalVar(PreProcessor::totalFunctionCount);

    /// instrument init instructions to modify value in check table
    instrumentStoreInsts(configToInit);

    /// track execution of each function if is enabled
    if ( TrackExecution )
        trackExecution();

    /// instrument transition point to check all conditional branch results
    /// and apply respective syscall filter    
    instrumentTransitionPoint(AfterRet);

    /// instrument transition point to extract global variable values
    recordGlobalVarValues(configDepGlobalVars, AfterRet);

    //myVerifier();
}

void RuntimeInstrumentation::trackExecution(void){
    createTrackExecTable();
    std::set<Function*>& moduleFuncs = PreProcessor::getModuleFuncs();
    for ( std::set<Function*>::iterator it = moduleFuncs.begin(),
                                        eit = moduleFuncs.end();
                                        it != eit; ++it){
        Function *fun = *it;
        BasicBlock& bb = fun->getEntryBlock();
        Instruction& firstInstruction = bb.front();
        instrumentFunctionExecution(fun, &firstInstruction);
    }
}

void RuntimeInstrumentation::instrumentFunctionExecution(Function* function, 
                                                Instruction* inst) {
    GlobalVariable *trackFuncExecTableGvar = 
                    module->getNamedGlobal(FUNC_EXEC_TABLE_NAME);
    Value *arg1, *arg2;

    int functionIndex = PreProcessor::getFunctionIndex(function);

    Constant* functionIndexConst = 
                        ConstantInt::get(intType, functionIndex);

    llvm::IRBuilder<> Builder(inst);

    arg1 = Builder.CreateBitOrPointerCast(trackFuncExecTableGvar,
                                                  ptrToLongType);
    arg2 = functionIndexConst;

    const SVFFunction* trackExecFunction = 
                    findFunctionByName(svfModule, TRACKEXEC_FUNC);
    if ( trackExecFunction )
        Builder.CreateCall(trackExecFunction->getLLVMFun(), {arg1, arg2});
}

void RuntimeInstrumentation::createTrackExecTable(void){
    ArrayType* functionArrayType = ArrayType::get(intType, 
                                    PreProcessor::totalFunctionCount);
    std::vector<Constant*> functionVector;        //int
    ConstantInt* zeroIntValue = ConstantInt::get(module->getContext(), 
                                                    llvm::APInt(32,0));

    for ( int i = 0; i < PreProcessor::totalFunctionCount; i++ )
        functionVector.push_back(zeroIntValue);

    llvm::ArrayRef<Constant*> functionArrayRef(functionVector);
    Constant* functionConditionConstArr = 
                    ConstantArray::get(functionArrayType, functionArrayRef);

    module->getOrInsertGlobal(FUNC_EXEC_TABLE_NAME, functionArrayType);

    GlobalVariable *gVar = module->getNamedGlobal(FUNC_EXEC_TABLE_NAME);
    gVar->setLinkage(GlobalValue::ExternalLinkage);
    gVar->setAlignment(MaybeAlign(4));
    gVar->setInitializer(functionConditionConstArr);
    gVar->setConstant(false);
    return;
}

/*
 * myVerifier
 *
 * since I was having trouble debugging with opt, I added this 
 * verifier which handles the case that my pass was crashing on
 * it can be extended for other cases :P
*/
void RuntimeInstrumentation::myVerifier(void){
    std::set<Function*> transitionFuncs;

    /// convert transition function names to transition funcs
    convertFuncNamesToFuncPtrs(svfModule, TransitionFuncStrs, transitionFuncs);

    /// iterate over each function and identify which instruction to instrument
    ///     depending on afterReturn - instrument first instruction or callsite
    for ( std::set<Function*>::iterator it = transitionFuncs.begin(),
                                        eit = transitionFuncs.end();
                                        it != eit; ++it ){
        for ( Function::iterator bit = (*it)->begin(), beit = (*it)->end();
                                bit != beit; ++bit ){
            for ( BasicBlock::iterator iit = (*bit).begin(), eiit = (*bit).end();
                                        iit != eiit; ++iit ){
                Instruction *inst = &(*iit);
                if ( inst->getParent() != &(*bit) ){
                    C2CLogger(logERROR) << "bogus instruction:!\n";
                    C2CLogger(logERROR) << "    " << getValueString(inst) << "\n";
                }
            }
        }
    }
}

/*
 * recordGlobalVarValues
 * @param(configDepGlobalVars): list of global variables which store configuration options
 * @param(afterReturn): whether to instrument at callsite of transition function or first instruction
 * 
 * we do not identify store (init) instructions for global variables, 
 * we just extract their value after the "initialization" phase is finished
 * this function instruments the program to extract those values
*/
void RuntimeInstrumentation::recordGlobalVarValues(
                        std::set<GlobalVariable*>& configDepGlobalVars,
                        bool afterReturn){
    
    std::set<Instruction*> instrumentInsts;

    /// extract transition instructions (first instruction of function, or after callsite)
    populateInstrumentInstructions(instrumentInsts, afterReturn);

    for ( std::set<Instruction*>::iterator it = instrumentInsts.begin(),
                                           eit = instrumentInsts.end();
                                           it != eit; ++it){
        SVF::IRBuilder Builder(*it);
        for ( std::set<GlobalVariable*>::iterator 
                                          git = configDepGlobalVars.begin(),
                                          geit = configDepGlobalVars.end();
                                          git != geit; ++git){
            GlobalVariable *globalVar = *git;
            StructType *globalVarStructType = getStructType(globalVar, 
                                             PreProcessor::getStructEqMap());
            Value *loadValue = createLoad(globalVar, Builder);
            /// the global variable can have different types and we handle these types differently
            if ( globalVarStructType )
                handleStructGlobalVar(globalVar, 
                                      globalVarStructType, 
                                      Builder, 
                                      *it);
            else if ( isIntType(loadValue) ){
                ConfigVariable *configVariable = new ConfigVariable(
                                                                globalVar);
                instrumentGlobalValueLoad(Builder, loadValue, *configVariable);
            }else if (PointerType* ptrType = 
                        SVFUtil::dyn_cast<PointerType>(loadValue->getType())) {
                /// every variable in LLVM is a pointer
                /// so we first dereference it (load instruction) and then 
                /// if the load result is a pointer itself it means we had a ptr
                /// in the higher-level language
                ConfigVariable *configVariable = new ConfigVariable(
                                                                globalVar);
                // A scalar global variable, which can be null ptr
                handleGlobalVarPointer(globalVar, 
                                       ptrType, 
                                       Builder, 
                                       *configVariable);
            }
            /// Refresh !!! This is very important !!! 
            /// Inside the loop we're making changes to the basic blocks
            /// we need to invoke the following command so that it inserts
            /// the instruction at the correct place based on those changes
            /// another possible solution is to recreate the Builder object inside the loop
            Builder.SetInsertPoint(*it);
        } 
    }
}

/*
 * createLoad
 * @param(value): value we want to dereference
 * @param(builder): IR builder used to create new instruction
 *
 * we use a new instruction which dereferences a value passed to it
*/
Value* RuntimeInstrumentation::createLoad(Value *value, 
                                       SVF::IRBuilder& builder){
    return builder.CreateLoad(value);
}

/*
 * createGep
 * @param(value): pointer operand for the gep
 * @param(builder): IR builder used to create new instruction
 *
 * this function can be used to create a gep for a pointer value (value) 
 * to access a field (index)
*/
Value* RuntimeInstrumentation::createGep(Value* value, int index, SVF::IRBuilder& builder) {
    std::vector<Value*> IdxVec;
    // We assume that this isn't an array, so the first index is always 0
    IdxVec.push_back(ConstantInt::get(IntegerType::get(builder.getContext(), 32), 0));
    IdxVec.push_back(ConstantInt::get(IntegerType::get(builder.getContext(), 32), index));
    llvm::ArrayRef<Value*> IdxArrRef(IdxVec);
    return builder.CreateGEP(value, IdxArrRef);
}

/*
 * handleStructGlobalVar
 * @param(value): global variable which stores the struct type
 * @param(structType): the type of the struct
 * @param(builder):
 * 
 * to extract values of a struct-typed global variable we handle
 * pointers and non-pointers differently. 
*/
void RuntimeInstrumentation::handleStructGlobalVar(Value *value, 
                                                   StructType *structType,
                                                   SVF::IRBuilder& builder,
                                                   Instruction *instrumentInst){
    for (int i = 0; i < structType->getNumElements(); i++) {
        Type* subType = structType->getElementType(i);
        // Always first do a gep
        Value* gep = createGep(value, i, builder);
        ConfigVariable *configVariable = new ConfigVariable(
                                            std::make_pair(structType, i));
        configVariable->setMemType(GLOBAL);
        if (PointerType* subPtrType = SVFUtil::dyn_cast<PointerType>(subType)) {
            // A pointer to a struct
            // Do a load but it's a pointer, so add a nullcheck, then pass that on
            handleGlobalVarPointer(gep, subPtrType, builder, *configVariable);
        } else if (IntegerType* intType = SVFUtil::dyn_cast<IntegerType>(subType)) {
            Value* loadValue = createLoad(gep, builder);
            // Handle only integers
            if (IntegerType* intType = 
                    SVFUtil::dyn_cast<IntegerType>(loadValue->getType()))
                instrumentGlobalValueLoad(builder, loadValue, *configVariable);
        } else if (ArrayType* arrTy = SVFUtil::dyn_cast<ArrayType>(subType)) {
            //assert(false && "unimplemented");
        }
        // Refresh
        builder.SetInsertPoint(instrumentInst);
    }
}

/*
 * handleGlobalVarPointer
 * @param(value): value representing the pointer (e.g. global var)
 * @param(ptrType): the type of this pointer (e.g. i8*)
 * @param(builder):
 * @param(configVariable): the config variable which is stored in this global var
 * 
 * to extract values of a pointer global variable
 * we cannot just dereference a global var pointer
 * it might be pointing to an invalid address, dereferencing it would cause 
 * a seg fault
 * if value-based is supported we need to create an if/else statement
 * to check the value of the ptr
 * in this case we do the following:
 *     1. dereference the ptr
 *     2. create bb with call to solver function for init to null
 *     3. create bb with call to solver function for init to not null
 *     4. create icmp instruction
 *     5. create branch instruction based on icmp
 * if value-based is NOT supported we just have to instrument with used-based
 * null or something else.
 * we will first separate the dependent conditional branches based on whether or
 * not they support value-based matching
 * this is because we want to split the basic block for value-based matching
 * and do the cmp for each conditional branch in its respective basic block
*/
void RuntimeInstrumentation::handleGlobalVarPointer(Value *ptrValue, 
                                                    PointerType *ptrType,
                                                    SVF::IRBuilder& builder,
                                                    ConfigVariable& configVariable){

    std::set<ConditionalBranch*> usedBasedCondBranches, valueBasedCondBranches;

    if ( !configDepAnalysis->condBranchesHasConfigVar(configVariable) )
        return;

    std::set<ConditionalBranch*>& configDepCondBranches = 
                                    getConditionalBranches(configVariable, 
                                    SVFUtil::dyn_cast<Instruction>(ptrValue));
    for ( std::set<ConditionalBranch*>::iterator it = configDepCondBranches.begin(),
                                                 eit = configDepCondBranches.end();
                                                 it != eit; ++it ){
        if ( (*it)->getValueBasedMatching() &&
                (*it)->isConstantPointerNull() &&
                configDepAnalysis->supportsValueBased(configVariable, 
                        SVFUtil::dyn_cast<Instruction>(ptrValue)))
            valueBasedCondBranches.insert(*it);
        else
            usedBasedCondBranches.insert(*it); 
    }

    /// handle used based just by calling the same function 
    /// we used for heap-based config variables, we'll use the GEP 
    /// we created as the point of instrumentation
    for ( std::set<ConditionalBranch*>::iterator 
                            it = usedBasedCondBranches.begin(),
                            eit = usedBasedCondBranches.end();
                            it != eit; ++it ){
        prepareInstrumentForBranch(builder,
                  *it,
                  configVariable, 
                  nullptr,
                  false);
    }

    /// handling value-based is more difficult
    /// we need to create the cmp inst and branches and all
    if ( valueBasedCondBranches.size() != 0 )
        handleValueBasedGlobalVarPointer(ptrValue,
                                         ptrType,
                                         builder,
                                         configVariable,
                                         valueBasedCondBranches);
}

/*
 * handleValueBasedGlobalVarPointer
 * @param(value): value representing the pointer (e.g. global var)
 * @param(ptrType): the type of this pointer (e.g. i8*)
 * @param(builder):
 * @param(configVariable): the config variable which is stored in this global var
 * @param(valueBasedCondBranches): set of conditional branches which depend on
 *                                 this config variable
 * 
 * we first split the basic block
 * then we create a basic block for the TRUE edge of the branch
 * then we create a basic block for the FALSE edge of the branch
 * we put it all together by creating an IcmpEQ instruction
*/
void RuntimeInstrumentation::handleValueBasedGlobalVarPointer(
                                        Value *ptrValue,
                                        PointerType *ptrType,
                                        SVF::IRBuilder& builder,
                                        ConfigVariable& configVariable,
                                        std::set<ConditionalBranch*>&
                                            valueBasedCondBranches){
    Instruction *currInst = &*(builder.GetInsertPoint());
    BasicBlock *currBb = currInst->getParent();
    BasicBlock *nextBb = currBb->splitBasicBlock(currInst);
    Instruction *oldTerm = currBb->getTerminator();
    SVF::IRBuilder builderOrigBlock(oldTerm);

    Value *loadValue = createLoad(ptrValue, builderOrigBlock);

    /// create BB for TRUE 
    BasicBlock *insertedTrue = createGlobalPtrHandlingBB(
                                            builder.getContext(),
                                            currBb->getParent(),
                                            nextBb,
                                            PtrCheckCondition::NullPtrInitToNull,
                                            valueBasedCondBranches);
    /// create BB for FALSE
    BasicBlock *insertedFalse = createGlobalPtrHandlingBB(
                                            builder.getContext(),
                                            currBb->getParent(),
                                            nextBb,
                                            PtrCheckCondition::NullPtr,
                                            valueBasedCondBranches);

    Value *isNotNull = builderOrigBlock.CreateICmpEQ(loadValue, 
                                    ConstantPointerNull::get(ptrType));
    Value *brancInst = builderOrigBlock.CreateCondBr(isNotNull,
                                                    insertedTrue,
                                                    insertedFalse);
    oldTerm->eraseFromParent();
}

/*
 * createGlobalPtrHandlingBB
 * @param(C): context to create bb
 * @param(function): parent function
 * @param(builder):
 * @param(configVariable): the config variable which is stored in this global var
 * @param(valueBasedCondBranches): set of conditional branches which depend on
 *                                 this config variable
 * 
 * we first split the basic block
 * then we create a basic block for the TRUE edge of the branch
 * then we create a basic block for the FALSE edge of the branch
*/
BasicBlock* RuntimeInstrumentation::createGlobalPtrHandlingBB(
                                                LLVMContext& C, 
                                                Function* function,
                                                BasicBlock* succ, 
                                                PtrCheckCondition checkType,
                                                std::set<ConditionalBranch*>& 
                                                                 condBranches){
        BasicBlock* recordUsedBB = BasicBlock::Create(C, 
                                                      "ptrchecker", 
                                                      function, 
                                                      succ);
        SVF::IRBuilder builder(recordUsedBB);

        Value* checkTblSym = builder.CreateBitOrPointerCast(
                                        module->getNamedGlobal(CHECK_TABLE_NAME), 
                                        ptrToLongType);
        const SVFFunction *calleeFunc;
        if ( checkType == PtrCheckCondition::NullPtrInitToNull )
            calleeFunc = findFunctionByName(svfModule, NULLPTRINITTONULL_FUNC);
        else if ( checkType == PtrCheckCondition::NullPtr )
            calleeFunc = findFunctionByName(svfModule, NULLPTR_FUNC);

        for (std::set<ConditionalBranch*>::iterator it = condBranches.begin(),
                                                    eit = condBranches.end();
                                                    it != eit; ++it){
            ConditionalBranch *conditionalBranch = *it;
            std::vector<Value*> callArgs;
            Constant* functionIndexConst = ConstantInt::get(intType, 
                                                PreProcessor::getFunctionIndex(
                                                    conditionalBranch->getParentFunc()));
            Constant* bbIndexConst = ConstantInt::get(intType,
                                        PreProcessor::getBasicBlockIndex(
                                            conditionalBranch->getParentBb()));
            assert(conditionalBranch->getCmpInstOp() != -1 &&
                        "instrumenting for conditional branch without cmp inst!");
            int cmpInstOp = conditionalBranch->getCmpInstOp();
            //if ( cmpInstOp == -1 )
            //    assert(false && "unsupported cmpInst, should not happen for globalPtrHandling!");
            Constant *cmpInstOpConst = ConstantInt::get(intType, cmpInstOp);

            callArgs.push_back(cmpInstOpConst);
            callArgs.push_back(checkTblSym);
            callArgs.push_back(functionIndexConst);
            callArgs.push_back(bbIndexConst);

            llvm::ArrayRef<Value*>  argsRef(callArgs);
            builder.CreateCall(calleeFunc->getLLVMFun()->getFunctionType(), 
                                    calleeFunc->getLLVMFun(), callArgs);
        }

        /// Insert the Terminator instruction
        builder.CreateBr(succ);

        return recordUsedBB;
}

                                              

void RuntimeInstrumentation::instrumentGlobalValueLoad(SVF::IRBuilder& builder,
                                          Value* loadValue, 
                                          ConfigVariable& configVariable) {
    Function* calleeFunc = nullptr;
    assert(SVFUtil::isa<Instruction>(loadValue) && 
                        "load value is not an instruction! this shouldn't happen!");
    
    ConfigInitInst* configInitInstDummy = new ConfigInitInst(
                                    SVFUtil::dyn_cast<Instruction>(loadValue));
    instrumentConfigValueInstruction(builder,
                                configVariable, 
                                *configInitInstDummy);
}


/* 
 * createBbCountTableGlobalVar
 * @param(totalFunctionCount): number of functions in program
 *
 * Create condition check size table FF[0]->20 (number of BBs per each function)
 * used when we want to check all bb condition results
*/
void RuntimeInstrumentation::createBbCountTableGlobalVar(int totalFunctionCount) {
    std::vector<Constant*> functionBbCountVector;
    ArrayType* functionBbCountArrayType = ArrayType::get(intType, totalFunctionCount);
    std::set<Function*>& moduleFuncs = PreProcessor::getModuleFuncs();
    for ( std::set<Function*>::iterator it = moduleFuncs.begin(),
                                        eit = moduleFuncs.end();
                                        it != eit; ++it){
        Function *fun = *it;
        int functionBbCount = PreProcessor::getFunctionBbCount(fun);
        functionBbCountVector.push_back(ConstantInt::get(
                                            module->getContext(), 
                                            llvm::APInt(32,functionBbCount)));
    }
    ArrayRef<Constant*> functionBbCountArrayRef(functionBbCountVector);
    Constant* functionBbCountConstArr = ConstantArray::get(
                                                functionBbCountArrayType, 
                                                functionBbCountArrayRef);
    module->getOrInsertGlobal(CHECK_TABLE_SIZE_NAME, 
                                functionBbCountArrayType);
    //// create global variable
    GlobalVariable *functionBbCountGvar = module->getNamedGlobal(
                                                CHECK_TABLE_SIZE_NAME);
    functionBbCountGvar->setLinkage(GlobalValue::ExternalLinkage);
    functionBbCountGvar->setAlignment(MaybeAlign(4));
    functionBbCountGvar->setInitializer(functionBbCountConstArr);
}

/*
 * createTableGlobalVar
 * @param(nonInitBbs): BBs whose config variable does not have any initialization instructions
 * @param(globalBasedBbs): BBs whose config variable is stored in a global var
 * @param(heapBasedBbs): BBs whose config variable is stored on the heap
 * @param(switchBasedBbs): BBs whose conditional branch is a switch-case statement
 * @param(totalFunctionCount): total number of functions
 *
 * we create a table to specify the status of each func-bb conditional branch
 * status and we update this table at runtime based on the init instructions
*/
void RuntimeInstrumentation::createTableGlobalVar(
                    std::unordered_set<BasicBlock*>& nonInitBbs,
                    std::unordered_set<BasicBlock*>& globalBasedBbs,
                    std::unordered_set<BasicBlock*>& heapBasedBbs,
                    std::unordered_set<BasicBlock*>& switchBasedBbs,
                    int totalFunctionCount) {
    /// the table will be have two levels
    /// in the first level we have a row for each function
    /// the value will be a pointer to an array for the basic blocks of that function
    ArrayType* functionArrayType = ArrayType::get(ptrToLongType, 
                                                  totalFunctionCount);

    //Create condition check table FF[0]->BB[5]->0/1
    std::vector<Constant*> functionVector;

    std::set<Function*>& moduleFuncs = PreProcessor::getModuleFuncs();
    for ( std::set<Function*>::iterator it = moduleFuncs.begin(),
                                        eit = moduleFuncs.end();
                                        it != eit; ++it){
        Function *fun = *it;

        //store BB condition inside function array at BB index
        std::vector<Constant*> bbVector;
        ArrayType* bbArrayType = ArrayType::get(intType, 
                            PreProcessor::getFunctionBbCount(fun));

        for (Function::iterator bit = fun->begin(), 
                                ebit = fun->end();
                                bit != ebit; ++bit) {
            BasicBlock *bbPtr = &(*bit);
            bool isSwitchBased = false;
            
            if ( switchBasedBbs.find(bbPtr) != switchBasedBbs.end() )
                isSwitchBased = true;

            if ( globalBasedBbs.find(bbPtr) != globalBasedBbs.end() &&
                    !isSwitchBased )
                /// it's a global based config - doesn't need init
                bbVector.push_back(GLOBALCONFIG_ConstInt);
            else if ( globalBasedBbs.find(bbPtr) != globalBasedBbs.end() &&
                    isSwitchBased )
                /// it's a global based config - doesn't need init
                bbVector.push_back(GLOBALCONFIG_SWITCH_ConstInt);
            else if ( nonInitBbs.find(bbPtr) != nonInitBbs.end() )
                /// it's heap based and config-based - but doesn't have init
                bbVector.push_back(HEAPWOINITCONFIG_ConstInt);
            else if ( heapBasedBbs.find(bbPtr) != heapBasedBbs.end() &&
                        !isSwitchBased )
                /// it's heap based and config-based and has an init
                bbVector.push_back(HEAPWINITCONFIG_ConstInt);
            else if ( heapBasedBbs.find(bbPtr) != heapBasedBbs.end() &&
                        isSwitchBased )
                /// it's heap based and config-based and has an init
                bbVector.push_back(HEAPWINITCONFIG_SWITCH_ConstInt);
            else
                bbVector.push_back(NOTCONFIG_ConstInt);
        }

        llvm::ArrayRef<Constant*> bbArrayRef(bbVector);
        Constant* bbConditionConstArr = 
                    ConstantArray::get(bbArrayType, bbArrayRef);

        /// create a new global variable for table
        GlobalVariable* bbConditionGVar = 
                    new GlobalVariable(*module, 
                                       bbArrayType, 
                                       true, 
                                       GlobalValue::ExternalLinkage,
                                       bbConditionConstArr);

        /// set global variable as writable (at runtime we need to update this table)
        bbConditionGVar->setConstant(false);

        functionVector.push_back(ConstantExpr::getBitCast(
                                                bbConditionGVar, 
                                                ptrToLongType));
    }

    ArrayRef<Constant*> functionArrayRef(functionVector);
    Constant* functionConditionConstArr = ConstantArray::get(
                                                        functionArrayType, 
                                                        functionArrayRef);

    /// create final table ff[3]->bb[4]
    module->getOrInsertGlobal(CHECK_TABLE_NAME, functionArrayType);
    //// create global variable
    GlobalVariable *gVar = module->getNamedGlobal(CHECK_TABLE_NAME);
    gVar->setLinkage(GlobalValue::ExternalLinkage);
    gVar->setAlignment(MaybeAlign(4));
    gVar->setInitializer(functionConditionConstArr);
    gVar->setConstant(false);


}

/*
 * instrumentStoreInsts
 * @param(configToInit): map between config variables and their init instructions
 * this function iterates over all configuration variables and instruments the 
 * initialization instructions which have previously been identified 
 * by configDepAnalysis
*/
void RuntimeInstrumentation::instrumentStoreInsts(ConfigToInstSetType& 
                                                            configToInit){
    for ( ConfigToInstSetType::iterator it = configToInit.begin(),
                                        eit = configToInit.end();
                                        it != eit; ++it ){
        const ConfigVariable& configVariable = (*it).first;
        ConfigInitSetType& configInitInsts = (*it).second;
        for ( ConfigInitSetType::iterator sit = configInitInsts.begin(),
                                        esit = configInitInsts.end();
                                        sit != esit; ++sit ){
            const ConfigInitInst& configInitInst = *sit;
            Instruction* writeInst = configInitInst.getInst();
            SVF::IRBuilder Builder(writeInst);
            instrumentConfigValueInstruction(Builder, configVariable, configInitInst);
        }
    }
}

/*
 * instrumentConfigValueInstruction
 * @param(configVariable): the config variable which we want to decide upon its conditional branches
 * @param(inst): this can be a load value instruction or a store instruction (write/call)
 *               the load value is used in case the config variable is a global variable
 *               the write instruction is used in case the config variable is stored on the heap
 *
 * This function iterates over all conditional branches which depend on the
 * passed config variable and instruments the passed instruction to specify 
 * the result of each conditional branch using the solver engine
*/
void RuntimeInstrumentation::instrumentConfigValueInstruction(
                                SVF::IRBuilder& builder,
                                const ConfigVariable& configVariable,
                                const ConfigInitInst& configInitInst) {
    if ( !configDepAnalysis->condBranchesHasConfigVar(configVariable) )
        return;

    std::set<ConditionalBranch*>& configDepCondBranches = 
                            getConditionalBranches(configVariable, 
                                            configInitInst.getInst());
    for ( std::set<ConditionalBranch*>::iterator 
                                        it = configDepCondBranches.begin(),
                                        eit = configDepCondBranches.end();
                                        it != eit; ++it ){
        prepareInstrumentForBranch(builder,
                                   *it,
                                   configVariable, 
                                   &configInitInst);
                                     
    }
}

/**

 * if is not value based, configInitInst is not required!
*/
void RuntimeInstrumentation::prepareInstrumentForBranch(
                                SVF::IRBuilder& builder,
                                ConditionalBranch* conditionalBranch,
                                const ConfigVariable& configVariable,
                                const ConfigInitInst *configInitInst,
                                bool valueBased){
    if ( valueBased )
        assert( configInitInst && "value based should have a configInitInst!");
    valueBased = valueBased && 
                    conditionalBranch->getValueBasedMatching() &&
                    configDepAnalysis->supportsValueBased(configVariable,
                                                          *configInitInst);
    int functionIndex = PreProcessor::getFunctionIndex(
                                conditionalBranch->getParentFunc());
    int bbIndex = PreProcessor::getBasicBlockIndex(
                                conditionalBranch->getParentBb());

    int cmpInstOp = -1;
    // TODO handle switch-case statements later
    // parts of the following strictly apply to conditional branches

    // we can have conditional branches which don't have cmp insts
    // example:   %19 = trunc i8 %18 to i1
    //            br i1 %19, label %20, label %35
    if ( !(*(conditionalBranch->getConfigVariable()) == 
            configVariable) ){
        C2CLogger(logERROR) << "condition value and store value don't match"
                            << " conditional branch config variable:\n"
                            << conditionalBranch->getConfigVariable()->toString()
                            << " store config variable:\n"
                            << configVariable.toString() << "\n";
    }

    //if ( conditionalBranch->getCmpInst() == nullptr ) {
    //    C2CLogger(logWARNING) << "falling back to used-based because "
    //                          << "conditional branch doesn't have cmp inst!\n";
    //    valueBased = false;
    //}
    ///// if value-based is still possible we will try to extract the cmpInst
    //if ( valueBased )
        cmpInstOp = conditionalBranch->getCmpInstOp();

    /// if cmpInstOp is -1 and getCmpInstOperator was called, it means that we 
    /// we still don't support value-based (fcmpInst)
    if ( cmpInstOp == -1 )  /// cmpInst operator is not supported, fall back to used-based
        valueBased = false;
    Constant* cmpInstOpConst = ConstantInt::get(intType, cmpInstOp);

    vector<Value*> callArgs;
    SVFFunction *calleeFunc;

    if ( valueBased ){
        callArgs.push_back(cmpInstOpConst);
        instrumentValueBased(builder,
                             *configInitInst, 
                             functionIndex, 
                             bbIndex, 
                             callArgs, 
                             conditionalBranch);
    }else{
        /// call used-based instrumentation function
        instrumentUsedBased(builder,
        //                    configInitInst.getInst(), 
                            functionIndex, 
                            bbIndex, 
                            callArgs,
                            conditionalBranch);
    }
}

void RuntimeInstrumentation::instrumentUsedBased(SVF::IRBuilder& builder,
//                                                Instruction *inst,
                                                int functionIndex,
                                                int bbIndex,
                                                std::vector<Value*>& callArgs,
                                                ConditionalBranch *conditionalBranch){
    const SVFFunction *calleeFunc = 
                            findFunctionByName(svfModule, USEBASED_FUNC);
    if ( !calleeFunc ){
        C2CLogger(logERROR) << "Trying to instrument instruction to call "
                            << USEBASED_FUNC << " but function object is NULL\n";
        return;
    }
    if ( conditionalBranch->isSwitchBased() )
        callArgs.push_back(llvm::ConstantInt::get(module->getContext(), llvm::APInt(32,1)));
    else
        callArgs.push_back(llvm::ConstantInt::get(module->getContext(), llvm::APInt(32,0)));
    instrumentInstForBranch(builder,
    //                        inst, 
                            calleeFunc->getLLVMFun(), 
                            functionIndex, 
                            bbIndex, 
                            callArgs);
}


void RuntimeInstrumentation::instrumentValueBased(SVF::IRBuilder& builder,
                                        const ConfigInitInst& configInitInst,
                                        int functionIndex,
                                        int bbIndex,
                                        std::vector<Value*>& callArgs,
                                        ConditionalBranch *conditionalBranch){
    /// call value-based instrumentation function
    /// we need to extract the value being stored so the solver 
    /// can compare it with the CMP inst condition at runtime
    Constant* constantSideConst = ConstantInt::get(intType, 
                              conditionalBranch->getConditionConstantSide());
    Value *storeValue, *conditionValue;
    Instruction *inst = configInitInst.getInst();

    if ( SVFUtil::isa<StoreInst>(inst) ){   /// store instruction which writes a value to config variable
        StoreInst* storeInst = SVFUtil::dyn_cast<StoreInst>(inst);
        storeValue = storeInst->getValueOperand();
        if ( SVFUtil::dyn_cast<CallInst>(storeValue) ){
            /// Used based doesn't need the cmpInstOpConst pushed to it
            std::vector<Value*> callArgsEmpty;
            return instrumentUsedBased(builder, 
                   //                    storeInst, 
                                       functionIndex, 
                                       bbIndex, 
                                       callArgsEmpty,
                                       conditionalBranch);
        }
    } else if ( SVFUtil::isa<CallInst>(inst) ) {
        storeValue = ConstantInt::get(intType, 0);
    }else
        storeValue = inst;  /// load instruction for value of config variable itself
    if ( conditionalBranch->isSwitchBased() )
        return instrumentValueBasedSwitch(builder, 
                                          storeValue, 
               //                           inst, 
                                          functionIndex,
                                          bbIndex,
                                          callArgs,
                                          conditionalBranch);

    conditionValue = conditionalBranch->getConditionValue();
    assert(conditionValue &&
                "value-based instrumentation requested but condition value is NULL!");
    C2CLogger(logDEBUG) << "conditionValue: " << getValueString(conditionValue)
                        << "\nstoreValue: " << getValueString(storeValue) << "\n";
    const SVFFunction *calleeFunc;
    if ( isNullPtr(conditionValue) ) {
        /// commented out the assert on 12.09.21 (why shouldn't it be a load)
        /// example causing crash:
        /// store inst: store i8* %80, i8** %82, align 8
        /// value: %80 = load i8*, i8** %5, align 8
        //assert( !SVFUtil::isa<LoadInst>(storeValue) && 
        //                "checking nullptr cmp for load inst! should be INTEGER!");
        bool initToNull = configInitInst.isHeapInitFunc() || isNullPtr(storeValue);
        /// specify callee function for instrumentation and add any specific call args
        if ( initToNull )
            calleeFunc = findFunctionByName(svfModule, 
                                        NULLPTRINITTONULL_FUNC);
        else
            calleeFunc = findFunctionByName(svfModule, 
                                        NULLPTR_FUNC);
    } else if ( isIntType(storeValue) && 
                    isConstantInt(conditionValue) ) {
        /// specify callee function for instrumentation and add any specific call args
        /// dummy target Bb Index, this is only required for switch-case statements
        Constant* targetBbIndexConst = ConstantInt::get(intType, -1);
        callArgs.push_back(targetBbIndexConst);
        callArgs.push_back(storeValue);
        callArgs.push_back(conditionValue);
        callArgs.push_back(constantSideConst);
        int storeIntBitWidth = getIntBitWidth(storeValue);
        int condIntBitWidth = getIntBitWidth(conditionValue);
        calleeFunc = getCalleeForIntCmp(storeIntBitWidth,
                                        condIntBitWidth);
    } else {
        //assert( false && 
        //    "instruemnt write instruction but condition value and store value don't match in type!");
        /// Used based doesn't need the cmpInstOpConst pushed to it
        std::vector<Value*> callArgsEmpty;
        return instrumentUsedBased(builder, 
               //                    inst, 
                                   functionIndex, 
                                   bbIndex, 
                                   callArgsEmpty,
                                   conditionalBranch);
    }
    if ( !calleeFunc ){
        C2CLogger(logERROR) << "Trying to instrument instruction to call"
                            << NULLPTRINITTONULL_FUNC << "/"
                            << NULLPTR_FUNC << "/"
                            << INT8_FUNC << "/"
                            << INT16_FUNC << "/"
                            << INT32_FUNC << "/"
                            << INT64_FUNC 
                            << " but returned function object is null\n";
        return;
    }
    instrumentInstForBranch(builder,
    //                        inst,
                            calleeFunc->getLLVMFun(),
                            functionIndex,
                            bbIndex,
                            callArgs);
}

void RuntimeInstrumentation::instrumentInstForBranch(
                            SVF::IRBuilder& builder,
//                            Instruction *inst,
                            Function *calleeFunc,
                            int functionIndex,
                            int bbIndex,
                            std::vector<Value*>& callArgs){
    Constant* functionIndexConst = ConstantInt::get(intType, functionIndex);
    Constant* bbIndexConst = ConstantInt::get(intType, bbIndex);

    //llvm::IRBuilder<> Builder(inst);

    Value *checkTblSym = builder.CreateBitOrPointerCast(
                                        module->getNamedGlobal(CHECK_TABLE_NAME), 
                                        ptrToLongType);
    callArgs.push_back(checkTblSym);
    callArgs.push_back(functionIndexConst);
    callArgs.push_back(bbIndexConst);

    C2CLogger(logDEBUG) << "callArgs.size(): " << callArgs.size()
                        << " for function: " << calleeFunc->getName() << "\n";

    builder.CreateCall(calleeFunc, callArgs);
}

/**
 * A switch case dependent on a configuration variable is handled differently
 * The comparison in a switch case is always EQUAL and the value being compared
 * needs to be a constant
*/
void RuntimeInstrumentation::instrumentValueBasedSwitch(SVF::IRBuilder& builder,
                                        Value *storeValue,
//                                        Instruction *inst,
                                        int functionIndex,
                                        int bbIndex,
                                        std::vector<Value*>& callArgs,
                                        ConditionalBranch *conditionalBranch){
    /// 1. validate that the value (being stored or stored in global var) is a 
    ///     constant int
    /// 2. find the case which handles this value
    /// 3. extract basic block ID of respective case
    /// 4. specify that basic block ID as the enabled case
    assert ( conditionalBranch->isSwitchBased() && 
                "instrumenting for switch case with conditional branch not based on switch case");
    if ( !isIntType(storeValue) )   /// TODO
        return;
    assert ( isIntType(storeValue) && "store value is not INT for switch statement");
    Constant* constantSideConst = ConstantInt::get(intType, 
                              conditionalBranch->getConditionConstantSide());
    int storeIntBitWidth = getIntBitWidth(storeValue);
    SwitchInst *switchInst = SVFUtil::dyn_cast<SwitchInst>(
                                        conditionalBranch->getInstruction());
    for ( SwitchInst::CaseIt it = switchInst->case_begin(), 
                             eit = switchInst->case_end();
                             it != eit; ++it ){
        BasicBlock *targetBb = it->getCaseSuccessor();
        ConstantInt *conditionValue = switchInst->findCaseDest(targetBb);
        if ( !conditionValue )  /// probably default case (doesn't have condition)
            continue;
        int condIntBitWidth = getIntBitWidth(conditionValue);
        Constant* targetBbIndexConst = ConstantInt::get(intType, 
                            PreProcessor::getBasicBlockIndex(targetBb));
        std::vector<Value*> callArgsNew = callArgs;
        callArgsNew.push_back(targetBbIndexConst);
        callArgsNew.push_back(storeValue);
        callArgsNew.push_back(conditionValue);
        callArgsNew.push_back(constantSideConst);
        const SVFFunction *calleeFunc = getCalleeForIntCmp(storeIntBitWidth,
                                                            condIntBitWidth);
        instrumentInstForBranch(builder,
        //                        inst,
                                calleeFunc->getLLVMFun(),
                                functionIndex,
                                bbIndex,
                                callArgsNew);
    }
}

/**
 * Identify which solver engine function to use for comparison
 * this depends on the int width of the store and condition value
*/
const SVFFunction* RuntimeInstrumentation::getCalleeForIntCmp(int storeIntBitWidth, int condIntBitWidth){
    const SVFFunction *calleeFunc = nullptr;
    if ( storeIntBitWidth == 8 && 
            condIntBitWidth == 8 )
        calleeFunc = findFunctionByName(svfModule, INT8_FUNC);
    else if ( storeIntBitWidth == 8 && 
            condIntBitWidth == 1 )
        calleeFunc = findFunctionByName(svfModule, INT8_1_FUNC);
    else if ( storeIntBitWidth == 8 && 
            condIntBitWidth == 32 )
        calleeFunc = findFunctionByName(svfModule, INT8_32_FUNC);
    else if ( storeIntBitWidth == 16 &&
            condIntBitWidth == 16 )
        calleeFunc = findFunctionByName(svfModule, INT16_FUNC);
    else if ( storeIntBitWidth == 16 &&
            condIntBitWidth == 32 )
        calleeFunc = findFunctionByName(svfModule, INT16_32_FUNC);
    else if ( storeIntBitWidth == 32 &&
                condIntBitWidth == 32 )
        calleeFunc = findFunctionByName(svfModule, INT32_FUNC);
    else if ( storeIntBitWidth == 32 &&
                condIntBitWidth == 64 )
        calleeFunc = findFunctionByName(svfModule, INT32_64_FUNC);
    else if ( storeIntBitWidth == 64 &&
                condIntBitWidth == 32 )
        calleeFunc = findFunctionByName(svfModule, INT64_32_FUNC);
    else if ( storeIntBitWidth == 64 )
        calleeFunc = findFunctionByName(svfModule, INT64_FUNC);
    return calleeFunc;
}

std::set<ConditionalBranch*>& RuntimeInstrumentation::getConditionalBranches(
                            const ConfigVariable& configVariable,
                            Instruction* inst){
    /// call inst - if config variable is struct type ALL dependent
    /// conditional branches (regardless of field number) become used-based
    /// for this specific call instruction
    // TODO when should the call instruction make the conditional branches use-based
//    if ( inst && SVFUtil::isa<CallInst>(inst) )
//        return configDepAnalysis->getConfigCondBranches(configVariable, true);
//    else //if ( SVFUtil::isa<StoreInst>(writeInst) ) 
        return configDepAnalysis->getConfigCondBranches(configVariable);
    
}

/*
 * instrumentTransitionPoint
 * @param(afterReturn): specified whether to instrument after function 
 *      returns or first instruction
 *
 * We need to instrument the program to invoke our checkAllConditions function
 * after it has finished its initialization phase. The transition function names
 * is specified by the user to specify when the program transitions into its 
 * processing phase
*/
void RuntimeInstrumentation::instrumentTransitionPoint(
                                        bool afterReturn){
    std::set<Instruction*> instrumentInsts;

    /// extract transition instructions (first instruction of function, or after callsite)
    populateInstrumentInstructions(instrumentInsts, afterReturn);

    /// instrument each instruction
    for ( std::set<Instruction*>::iterator it = instrumentInsts.begin(),
                                           eit = instrumentInsts.end();
                                           it != eit; ++it){
        instrumentTransitionInstruction(*it);
    }
}

/*
 * populateInstrumentInstructions
 * @param(instrumentInsts): instructions which should be instrumented will be returned here
 * @param(afterReturn): should we transition the callsite or first instruction of function
 *
 * this function will identify the instructions for each transition function and 
 * store them in the instrumentInsts set (which should be provided by the caller)
*/
void RuntimeInstrumentation::populateInstrumentInstructions(
                                     std::set<Instruction*>& instrumentInsts,
                                     bool afterReturn){
    std::set<Function*> transitionFuncs;

    /// convert transition function names to transition funcs
    convertFuncNamesToFuncPtrs(svfModule, TransitionFuncStrs, transitionFuncs);

    /// iterate over each function and identify which instruction to instrument
    ///     depending on afterReturn - instrument first instruction or callsite
    for ( std::set<Function*>::iterator it = transitionFuncs.begin(),
                                        eit = transitionFuncs.end();
                                        it != eit; ++it )
        addToInstrumentInsts(*it, instrumentInsts, afterReturn);
}

void RuntimeInstrumentation::addToInstrumentInsts(Function *func,
                         std::set<Instruction*>& instrumentInsts,
                         bool afterReturn){
    if ( afterReturn ) { 
        /// find all callsites, add to instrumentInsts
        std::unordered_set<CallInst*> callInsts;
        PreProcessor::findAllCallSites(func, callInsts);
        for ( std::unordered_set<CallInst*>::iterator it = callInsts.begin(),
                                                    eit = callInsts.end();
                                                    it != eit; ++it ){
            CallInst *callInst = *it;
            if ( callInst->getNextNonDebugInstruction() ){
                /// we want to instrument after the call returns
                instrumentInsts.insert(callInst->getNextNonDebugInstruction());
            } else {
                C2CLogger(logWARNING) << "trying to instrument after call inst "
                                    << "returns, but not possible since next "
                                    << "inst not available: "
                                    << getValueString(callInst) << "\n";
                instrumentInsts.insert(callInst);
            }
        }
    } else {
        /// get first instruction of function and add to instrument set
        instrumentInsts.insert(extractFirstInstruction(func));
    }
}

void RuntimeInstrumentation::instrumentTransitionInstruction(Instruction *inst){
    std::vector<Value*> checkConditionsCallArgs, trackExecCallArgs;
    llvm::IRBuilder<> Builder(inst);
    Value *checkTblSym = Builder.CreateBitOrPointerCast(
                                 module->getNamedGlobal(CHECK_TABLE_NAME), 
                                 ptrToLongType);
    Value *bbCountTblSym = Builder.CreateBitOrPointerCast(
                                 module->getNamedGlobal(CHECK_TABLE_SIZE_NAME), 
                                 ptrToLongType);
    Constant* functionCountConst = ConstantInt::get(intType, 
                                        PreProcessor::totalFunctionCount);
    const SVFFunction *calleeFunc = findFunctionByName(svfModule, CHECKALL_FUNC);
    assert ( calleeFunc && "check all conditions solver func is null!");
    checkConditionsCallArgs.push_back(checkTblSym);
    checkConditionsCallArgs.push_back(bbCountTblSym);
    checkConditionsCallArgs.push_back(functionCountConst);

    Builder.CreateCall(calleeFunc->getLLVMFun(), checkConditionsCallArgs);

    if ( TrackExecution ) {
        Value *trackExecTblSym = Builder.CreateBitOrPointerCast(
                                 module->getNamedGlobal(FUNC_EXEC_TABLE_NAME), 
                                 ptrToLongType);
        const SVFFunction *trackExecCalleeFunc = 
                findFunctionByName(svfModule, CHECKALLEXEC_FUNC);
        trackExecCallArgs.push_back(trackExecTblSym);
        trackExecCallArgs.push_back(functionCountConst);
        assert ( trackExecCalleeFunc && "track all executed functions solver func is null!");
        Builder.CreateCall(trackExecCalleeFunc->getLLVMFun(), trackExecCallArgs);
    }
}
