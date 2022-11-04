#include "Graphs/ICFG.h"
#include "Util/ExtAPI.h"
#include "llvm/IR/InstIterator.h"
#include "PreProcessor.h"
#include "C2CUtils.h"
#include "OptionMapper.h"
#include "C2CLog.h"

#include <fstream>

using namespace llvm;
using namespace SVF;
using namespace C2C;

static llvm::cl::list<std::string> ConfigGlobalVar("config-global-var",
                            llvm::cl::CommaSeparated,
                            llvm::cl::desc("C2C-PreProcessor - comma-separated configuration-related global var"));

static llvm::cl::list<std::string> ConfigStructType("config-struct-types",
                            llvm::cl::CommaSeparated,
                            llvm::cl::desc("C2C-PreProcessor - comma-separated configuration-related struct types"));

static llvm::cl::opt<std::string> ConfigStructTypeFile("config-struct-type-file", 
                            llvm::cl::desc("C2C-PreProcessor - configuration-related struct types in a file"), 
                            llvm::cl::init("")); 

static llvm::cl::opt<std::string> ExtractNestedStructs("extract-nested", 
                            llvm::cl::desc("C2C-PreProcessor - should we try and extract nested config-related struct types"), 
                            llvm::cl::init("")); 

static llvm::cl::list<std::string> NestedConfigStructTypeMatchPatterns("include-nested-config-pattern", 
                            llvm::cl::CommaSeparated,
                            llvm::cl::desc("C2C-PreProcessor - any pattern which is shared among nested config struct types"));

static llvm::cl::list<std::string> NestedConfigStructTypeNotMatchPatterns("exclude-nested-config-pattern", 
                            llvm::cl::CommaSeparated,
                            llvm::cl::desc("C2C-PreProcessor - any pattern which is shared among nested config struct types"));

static llvm::cl::list<std::string> NonConfigStructType("generic-struct-types",
                            llvm::cl::CommaSeparated,
                            llvm::cl::desc("C2C-PreProcessor - comma-separated generic struct types (optional)"));

static llvm::cl::list<std::string> OptionMapperStructType("option-mapper-struct-type", 
                            llvm::cl::CommaSeparated,
                            llvm::cl::desc("C2C-PreProcessor - comma-separated list of struct types used to define runtime options"));

static llvm::cl::list<std::string> OptionMapperFuncNames("option-mapper-func-names", 
                            llvm::cl::CommaSeparated,
                            llvm::cl::desc("C2C-PreProcessor - comma-separated list of function names used to define runtime options"));

static llvm::cl::opt<int> OptionMapperStructFieldIndex("option-mapper-struct-field-index", 
                            llvm::cl::desc("C2C-PreProcessor - the field which the scalar variable address is stored in"), 
                            llvm::cl::init(0)); 

static llvm::cl::opt<int> OptionMapperFuncFieldIndex("option-mapper-func-field-index", 
                            llvm::cl::desc("C2C-PreProcessor - the field which the scalar variable address is stored in"), 
                            llvm::cl::init(0)); 

static llvm::cl::opt<std::string> FuncToIdFile("func-to-id-file", 
                            llvm::cl::desc("C2C-PreProcessor - path to store mapping of function to ID"), 
                            llvm::cl::init("/tmp/c2c-func-to-id.list")); 

/// static definitions
std::map<std::string, llvm::StructType*> PreProcessor::structEqMap;
std::map<llvm::BasicBlock*, int> PreProcessor::bbToIndex;
std::map<llvm::Function*, int> PreProcessor::funcToIndex;
std::map<llvm::Function*, int> PreProcessor::funcToBbCount;
std::set<std::string> PreProcessor::solverFuncs;
std::set<llvm::Function*> PreProcessor::moduleFuncs;
std::set<std::string> PreProcessor::heapInitFuncStrs;
std::map<std::string, int> PreProcessor::heapInitFuncPairs;
std::unordered_set<HeapInitFunction*> PreProcessor::heapInitFunctions;
int PreProcessor::totalFunctionCount;


void PreProcessor::run(void){
    initializeSolverFuncs();
    initializeModuleFuncs();
    findHeapInitCallInsts();
    createIndexes();
    initializeStructEquivalentMap();
}

void PreProcessor::initC2C(void){
    initializeConfigStructTypes();
    if ( configStructTypes.size() == 0 ){
        C2CLogger(logWARNING) << "configStructTypes.size() is 0\n";
    }
    if ( configStructTypes.size() != 0 && ExtractNestedStructs != "" ){
        initializeMatchPatterns();
        initializeNotMatchPatterns();
        extractNestedConfigStructTypes();
    }
    if ( OptionMapperStructType.size() != 0 )
        parseOptionMapperStructs();
    if ( OptionMapperFuncNames.size() != 0 )
        parseOptionMapperFunctions();
    if ( ConfigGlobalVar.size() != 0 )
        extractGlobalVars();
    if ( configStructTypes.size() == 0 && configScalarGlobalVars.size() == 0 ){
        C2CLogger(logWARNING) << "No config-dep struct type or scalar global vars identified, exiting...\n";
        //assert (false && "No config-dep struct type or scalar global vars identified!");
        exit(0);
    }
}

void PreProcessor::initializeMatchPatterns(void) {
    addListToUnorderedSet(NestedConfigStructTypeMatchPatterns, matchPatternSet);
}

void PreProcessor::initializeNotMatchPatterns(void) {
    addListToUnorderedSet(NestedConfigStructTypeNotMatchPatterns, notMatchPatternSet);
}

void PreProcessor::extractAllConditionalBranches(
                        std::set<Instruction*>& conditionalBranches){
    std::set<Function*>& moduleFuncs = PreProcessor::getModuleFuncs();
    for ( std::set<Function*>::iterator it = moduleFuncs.begin(),
                                        eit = moduleFuncs.end();
                                        it != eit; ++it){
        for ( inst_iterator inst = inst_begin(*it), einst = inst_end(*it);
                            inst != einst; ++inst ){
            if ( !SVFUtil::isa<BranchInst>(&*inst) &&
                    !SVFUtil::isa<SwitchInst>(&*inst) )
                continue;
            if ( SVFUtil::isa<SwitchInst>(&*inst) ){
                conditionalBranches.insert(&*inst);
                continue;
            }
            BranchInst* branchInst = SVFUtil::dyn_cast<BranchInst>(&*inst);
            if ( branchInst->isConditional() )
                conditionalBranches.insert(branchInst);
        }
    }
}

void PreProcessor::initializeModuleFuncs(void){
    for (SVFModule::iterator fit = svfModule->begin(), 
                             efit = svfModule->end();
                             fit != efit; ++fit) {
        Function *func = ((*fit)->getLLVMFun());
        if ( func->hasName() && 
                isInSet(solverFuncs, func->getName().str()) ){
            C2CLogger(logDEBUG) << "Skipping func: " 
                                << func->getName() << "\n";
            continue;
        }
        if ( func->isDeclaration() )
            continue;
        moduleFuncs.insert(func);
    }
}

void PreProcessor::initializeHeapInitFuncs(void){
    heapInitFuncStrs.insert("calloc");
    heapInitFuncStrs.insert("memset");
    heapInitFuncStrs.insert("ck_memzero");

    heapInitFuncPairs["calloc"] = -1;
    heapInitFuncPairs["memset"] = 0;
    heapInitFuncPairs["ck_memzero"] = 0;
}

void PreProcessor::initializeSolverFuncs(void){
    solverFuncs.insert("c2c_checkConditionInt8");
    solverFuncs.insert("c2c_checkConditionInt8_1");
    solverFuncs.insert("c2c_checkConditionInt8_32");
    solverFuncs.insert("c2c_checkConditionInt16");
    solverFuncs.insert("c2c_checkConditionInt16_32");
    solverFuncs.insert("c2c_checkConditionInt32");
    solverFuncs.insert("c2c_checkConditionInt32_64");
    solverFuncs.insert("c2c_checkConditionInt64");
    solverFuncs.insert("c2c_checkConditionInt64_32");
    solverFuncs.insert("c2c_checkConditionString");
    solverFuncs.insert("c2c_checkFunctionBased");
    solverFuncs.insert("c2c_checkConditionNullPtr");
    solverFuncs.insert("c2c_checkConditionNullPtrInitToNull");
    solverFuncs.insert("c2c_checkAllConditions");
    solverFuncs.insert("c2c_checkAllExecutedFunctions");
    solverFuncs.insert("c2c_trackExecution");
    solverFuncs.insert("c2c_extractExeName");
    solverFuncs.insert("c2c_extractFilteredSystemCalls");
    solverFuncs.insert("c2c_install_filter");
    solverFuncs.insert("c2c_revoke_seccomp_manipulation");
    solverFuncs.insert("c2c_closeModFile");
    solverFuncs.insert("c2c_closeFile");
    solverFuncs.insert("c2c_printFunctionName");
}

/*
 * Initialize config-related struct types in the configStruct set
*/
void PreProcessor::initializeConfigStructTypes(void){
    std::set<std::string> configStructStrs;
    
    addListToSet(ConfigStructType, configStructStrs);
    populateStrSetFromFile(ConfigStructTypeFile, configStructStrs);
    convertStructNamesToType(module, svfModule, configStructStrs, configStructTypes);
}

/**
 * Start from annotated struct type and extract nested configuration-related
 * struct types
 *
 * @param:
 * @ret:
*/
void PreProcessor::extractNestedConfigStructTypes(){
    std::fstream outFile;
    outFile.open(ExtractNestedStructs, std::ios::out);
    std::stack<Value*> workStack; // The current Value
    std::vector<Value*> added;
    std::unordered_set<Value*> visitedList;

    std::unordered_set<StructType*> genericStTypes;
    std::set<std::string> genericStructStrs;
    addListToSet(NonConfigStructType, genericStructStrs);
    convertStructNamesToType(module, svfModule, genericStructStrs, genericStTypes);

    int oldSize = configStructTypes.size();
    C2CLogger(logDEBUG) << "expanding config struct types, start size: " 
                        << oldSize << "\n";
    int loopCount = 0;
    do {
        std::unordered_set<StructType*> identifiedStructs;
        oldSize = configStructTypes.size();
        C2CLogger(logDEBUG) << "configStructTypes.size(): " 
                            << configStructTypes.size()
                            << " loopCount: " << loopCount++ << "\n";
        populateWorkStack(workStack, added, visitedList);
    
        C2CLogger(logDEBUG) << "finished populating work stack with size: " 
                            << workStack.size() << "\n";

        while (!workStack.empty()) {
            Value* work = workStack.top();
            workStack.pop();
            getValueString(work);

            if ( SVFUtil::isa<Instruction>(work) ){
                Instruction *inst = SVFUtil::dyn_cast<Instruction>(work);
                if ( inst->getParent()->getParent()->getName().str() == "ssl_rand_seed" )
                    getValueString(inst);
            }

            visitedList.insert(work);

            if (LoadInst* loadInst = SVFUtil::dyn_cast<LoadInst>(work)) {
                if ( isStructType(loadInst->getPointerOperandType()) )
                    addToIdentified(loadInst->getPointerOperandType(), 
                                    identifiedStructs, 
                                    genericStTypes);
                addUsers(work, workStack, visitedList);
            } else if (GetElementPtrInst* gepInst = SVFUtil::dyn_cast<GetElementPtrInst>(work)) {
                if ( isStructType(gepInst->getSourceElementType()) )
                    addToIdentified(gepInst->getSourceElementType(), 
                                    identifiedStructs, 
                                    genericStTypes);
                addUsers(work, workStack, visitedList);
            } else if (StoreInst* storeInst = SVFUtil::dyn_cast<StoreInst>(work)) {
                addUsers(storeInst->getPointerOperand(), workStack, visitedList);
            } else if (CastInst* castInst = SVFUtil::dyn_cast<CastInst>(work)) {
                if ( isStructType(castInst->getDestTy()) )
                    addToIdentified(castInst->getDestTy(), 
                                    identifiedStructs, 
                                    genericStTypes);
                addUsers(castInst, workStack, visitedList);
            } else {
                // Still need to follow casts or whatevers
                addUsers(work, workStack, visitedList);
            }
        }
        C2CLogger(logDEBUG) << "////////////// printing identified struct types! /////////////////////\n";
        printStructTypeUnorderedSet(identifiedStructs);
        C2CLogger(logDEBUG) << "////////////// finished printing identified struct types! /////////////////////\n";
        configStructTypes.insert(identifiedStructs.begin(), identifiedStructs.end());
    } while ( false );  ///oldSize != configStructTypes.size() );   /// TODO fix issue with some missing structs in httpd
    C2CLogger(logDEBUG) << "Finished nested-struct extraction, configStructTypes.size(): " 
                        << configStructTypes.size() << "\n";
    for ( std::unordered_set<StructType*>::iterator it = configStructTypes.begin(),
                                                    eit = configStructTypes.end();
                                                    it != eit; ++it ){
        StructType* stType = *it;
        outFile << stType->getName().str() << "\n";
        outFile.flush();
    }
    outFile.close();
}

void PreProcessor::populateWorkStack(std::stack<Value*>& workStack,
                                    std::vector<Value*>& addedGvars,
                                    std::unordered_set<Value*>& visitedList) {
    /// identify any allocations of any config-related struct types
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
                if ( isConfigStruct(getBaseType(ty)) &&
                        !isInUnorderedSet(visitedList, (Value*)AI) ) {
                    workStack.push(AI);
                }
            }
            /// added following on 12.29.21 (hamed)
            /// if we have the following:
            /// struct srv; struct serv_conf and only serv_conf is annotated
            /// but is always/sometimes accessed through srv, the alloca will be
            /// struct.srv which is not a config-related struct type, the first
            /// instruction will be the gep itself where the ptr is of the config struct type
            if (GetElementPtrInst* gepInst = SVFUtil::dyn_cast<GetElementPtrInst>(&*I)) {
                if ( isConfigStruct(gepInst->getSourceElementType()) &&
                        !isInUnorderedSet(visitedList, (Value*)gepInst) ) {
                    workStack.push(gepInst); /// is this correct? TODO
                }
            }
        }
        // GlobalVariables
        for (SVFModule::global_iterator git = svfModule->global_begin(),
                                        egit = svfModule->global_end();
                                        git != egit; ++git) {
            llvm::GlobalVariable* gvar = *git;
            Type* ty = gvar->getType();
            if ( isConfigStruct(getBaseType(ty)) &&
                    !isInUnorderedSet(visitedList, (Value*)gvar) ) {
                if (std::find(addedGvars.begin(), addedGvars.end(), gvar) == addedGvars.end()) {                    
                    workStack.push(gvar);
                    addedGvars.push_back(gvar); // to keep track
                }
            }
        }
    }
}

void PreProcessor::addUsers(Value* work, std::stack<Value*>& workStack, 
                            std::unordered_set<Value*>& visitedList) {
    for (User* u: work->users()) {
        if (Instruction* inst = SVFUtil::dyn_cast<Instruction>(u)) {
            if (std::find(visitedList.begin(), visitedList.end(), inst) ==
                                                     visitedList.end()) {
                workStack.push(inst);
            }
        }
    }
}

void PreProcessor::addToIdentified(Type* type, 
                   std::unordered_set<StructType*>& dst,
                   std::unordered_set<StructType*>& exceptList) {
    type = getBaseType(type);
    StructType *stType = SVFUtil::dyn_cast<StructType>(type);
    assert(stType && "trying to add to identified map for non-struct type!");
    stType = getBaseStType(stType, structEqMap);
    if ( !matchesPatterns(stType) )
        return;
    if ( !stType->isOpaque() )
        addToStructSet(stType, dst, exceptList);
}

bool PreProcessor::matchesPatterns(StructType *stType) {
    std::string stName = stType->getName().str();
    return matchWithWildcards(stName, matchPatternSet, true) && 
           matchWithWildcards(stName, notMatchPatternSet, false);
}

/**
 * Assuming there are functions which are used to map runtime options to scalar  
 * global variables, this function can extract those global variables

 * @ret: void
*/
void PreProcessor::parseOptionMapperFunctions(){
    std::set<std::string> optionMapperFuncStrs;
    
    addListToSet(OptionMapperFuncNames, optionMapperFuncStrs);
    /// look for call instructions used to map an option to a global var
    for ( std::set<Function*>::iterator it = moduleFuncs.begin(),
                                        eit = moduleFuncs.end();
                                        it != eit; ++it ){
        for ( inst_iterator inst = inst_begin(*it), einst = inst_end(*it);
                            inst != einst; ++inst ){
            if ( !SVFUtil::isa<CallInst>(*inst) )
                continue;
            CallInst *callInst = SVFUtil::dyn_cast<CallInst>(&*inst);
            if ( callInst->isIndirectCall() ) {
                /// TODO we're assuming no option mapper will be defined through indirect calls
                continue;
            }
            Function *calleeFunc = getDirectCallee(callInst);
            /// skip if the callee func cannot be retrieved
            if ( !calleeFunc ) {
                //C2CLogger(logWARNING) << "calleeFunc returned nullptr for inst: "
                //                      << getValueString(callInst) << "\n";
                continue;
            }
            /// skip this function if it doesn't have a name
            if ( !calleeFunc->hasName() )
                continue;
            /// skip this callee function if it's not in the list provided by the user
            if ( !isInSet(optionMapperFuncStrs, calleeFunc->getName().str()) )
                continue;
            OptionMapper *optionMapperValue = new OptionMapper(callInst);
            optionMapperValue->parse();
            Value *configScalarValue =
                        optionMapperValue->extractField(OptionMapperFuncFieldIndex);
            if ( configScalarValue &&
                    SVFUtil::isa<GlobalVariable>(configScalarValue) )
                appendToGlobalVars(configScalarGlobalVars, 
                       SVFUtil::dyn_cast<GlobalVariable>(configScalarValue));
        }
    }
}

/**
 * Assuming there are structs which are used to map runtime options to scalar  
 * global variables, this function can extract those global variables

 * @ret: void
*/
void PreProcessor::parseOptionMapperStructs(){
    std::set<std::string> optionMapperStructStrs;
    
    addListToSet(OptionMapperStructType, optionMapperStructStrs);
    convertStructNamesToType(module, 
                             svfModule, 
                             optionMapperStructStrs, 
                             optionMapperStructTypes);
    std::set<Value*> splittedValues;
    for ( SVFModule::global_iterator it = svfModule->global_begin(), 
                                    eit = svfModule->global_end(); 
                                    it != eit; ++it ) {
        /// in case we have an aggregate type (e.g. array) we want to
        /// split and parse each value separately
        /// in case of a string this would split the string into separate
        /// characters
        splitAggregate(*it, splittedValues);
    }
    for ( std::set<Value*>::iterator it = splittedValues.begin(),
                                     eit = splittedValues.end();
                                     it != eit; ++it ){
        if ( !isOptionMapperStruct((*it)->getType()) )
            continue;
        OptionMapper *optionMapperValue = new OptionMapper(*it);
        optionMapperValue->parse();
        Value *configScalarValue = 
                    optionMapperValue->extractField(OptionMapperStructFieldIndex);
        if ( configScalarValue && 
                SVFUtil::isa<GlobalVariable>(configScalarValue) )
            appendToGlobalVars(configScalarGlobalVars, 
                       SVFUtil::dyn_cast<GlobalVariable>(configScalarValue));
    }

}

/**
 * Assuming the config-related global variable name have been specified
 * this function extracts the respective global variable

 * @ret: void
*/
void PreProcessor::extractGlobalVars(){
    std::set<std::string> globalVarStrs;
    
    addListToSet(ConfigGlobalVar, globalVarStrs);
    for ( SVFModule::global_iterator it = svfModule->global_begin(), 
                                    eit = svfModule->global_end(); 
                                    it != eit; ++it ) {
        GlobalVariable *globalVar = *it;
        if ( !globalVar->hasName() )
            continue;
        if ( globalVarStrs.find(globalVar->getName().str()) != 
                                                globalVarStrs.end() )
            appendToGlobalVars(configScalarGlobalVars, globalVar);
    }
}

/**
 * LLVM adds numbered versions of the same struct types when they are declared 
 * in multiple objects. We consider them all equivalent and store the equivalencies 
 * in a map.

 * @param
 * @ret
*/
void PreProcessor::initializeStructEquivalentMap(void) {
    ///first run - we might miss some maps
    initializeStEqMapInner();

    ///second run - to complete what we missed in the first round
    initializeStEqMapInner();
}

void PreProcessor::initializeStEqMapInner(void) {
    for (std::set<Function*>::iterator it = moduleFuncs.begin(),
                                       eit = moduleFuncs.end();
                                       it != eit; ++it ){
        Function *fun = *it;
        if ( fun->isDeclaration() )
            continue;
        for ( inst_iterator inst = inst_begin(fun), einst = inst_end(fun);
              inst != einst; ++inst ) {
            if ( !SVFUtil::isa<AllocaInst>(*inst) )
                continue;
            AllocaInst *allocaInst = SVFUtil::dyn_cast<AllocaInst>(&*inst);
            Type* allocaType = allocaInst->getAllocatedType();
            allocaType = getBaseType(allocaType);
            if ( SVFUtil::isa<StructType>(allocaType) ){
                StructType* stType = SVFUtil::dyn_cast<StructType>(allocaType);
                getBaseStType(stType, structEqMap, true);
            }

        }
    }
}

void PreProcessor::createIndexes(void){
    std::fstream funcToIdFile;
    funcToIdFile.open(FuncToIdFile, std::ios::out);
    int funcIndex = 0;
    for (std::set<Function*>::iterator it = moduleFuncs.begin(),
                                       eit = moduleFuncs.end();
                                       it != eit; ++it ){
        Function& fun = *(*it);
        int bbIndex = 0;
        for (llvm::Function::iterator bit = fun.begin(), ebit = fun.end();
                bit != ebit; ++bit) {
            llvm::BasicBlock& bb = *bit;
            bbToIndex[&bb] = bbIndex++;
        }
        funcToIdFile << "function name: " << fun.getName().str()
                     << " id: " << funcIndex << "\n";
        funcToIdFile.flush();
        funcToIndex[&fun] = funcIndex++;
        funcToBbCount[&fun] = bbIndex;
    }
    totalFunctionCount = funcIndex;
    funcToIdFile.close();
}

void PreProcessor::findHeapInitCallInsts(void){
    std::unordered_set<Function*> heapInitFuncs;
    std::unordered_set<CallInst*> heapInitCallInsts;
    initializeHeapInitFuncs();
    findHeapInitFuncs(heapInitFuncs);
    for ( std::unordered_set<Function*>::iterator it = heapInitFuncs.begin(),
                                                eit = heapInitFuncs.end();
                                                it != eit; ++it ){
        findAllCallSites(*it, heapInitCallInsts);
    }
    for ( std::unordered_set<CallInst*>::iterator it = heapInitCallInsts.begin(),
                                                  eit = heapInitCallInsts.end();
                                                it != eit; ++it ){
        HeapInitFunction *heapInitFunction = new HeapInitFunction(this, *it, heapInitFuncPairs);
        heapInitFunctions.insert(heapInitFunction);
    }
}

void PreProcessor::findHeapInitFuncs(std::unordered_set<Function*>& heapInitFuncs){
    for (SVFModule::iterator fit = svfModule->begin(), 
                             efit = svfModule->end();
                             fit != efit; ++fit) {
        Function *func = ((*fit)->getLLVMFun());
        if ( !func->hasName() )
            continue;
        if ( isInSet(heapInitFuncStrs, func->getName().str()) )
            heapInitFuncs.insert(func);
    }
}

void PreProcessor::findAllCallSites(Function* func, 
                    std::unordered_set<CallInst*>& callInsts){
    std::set<Function*>& moduleFuncs = getModuleFuncs();
    for ( std::set<Function*>::iterator it = moduleFuncs.begin(),
                                        eit = moduleFuncs.end();
                                        it != eit; ++it){
        Function *fun = *it;
        for (inst_iterator I = llvm::inst_begin(fun),
                           E = llvm::inst_end(fun);
                           I != E; ++I) {
            if ( !SVFUtil::isa<CallInst>(&*I) )
                continue;
            CallInst *callInst = SVFUtil::dyn_cast<CallInst>(&*I);
            if ( callInst->isIndirectCall() )
                continue;
            Function *callee = getDirectCallee(callInst);
            if ( !callee )
                continue;
            if ( callee == func )
                callInsts.insert(callInst);
        }
    }
}

