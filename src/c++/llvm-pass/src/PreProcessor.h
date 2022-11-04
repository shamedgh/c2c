#ifndef C2CPreProcessor_H_
#define C2CPreProcessor_H_

#include "Graphs/SVFG.h"
#include "WPA/Andersen.h"
#include "SVF-FE/PAGBuilder.h"
#include "HeapInitFunction.h"
#include "C2CUtils.h"

namespace C2C
{

class PreProcessor
{

public:
    /// Constructor
    PreProcessor(SVF::SVFModule* svfModule_):
                          svfModule(svfModule_) {
    }

    /// Destructor
    virtual ~PreProcessor()
    {
        destroy();
    }

    void destroy(){
        // TODO
    }

    void initC2C(void);

    void run(void);

    void extractNestedConfigStructTypes();

    void parseOptionMapperStructs();

    void parseOptionMapperFunctions();

    void initializeStructEquivalentMap(void);

    void initializeStEqMapInner(void);

    void createIndexes(void);

    void extractGlobalVars(void);

    static std::map<llvm::BasicBlock*, int>& getBasicBlockToIndex(void){
        return bbToIndex;
    }

    static int getBasicBlockIndex(llvm::BasicBlock* bb){
        return bbToIndex[bb];
    }

    static std::map<llvm::Function*, int>& getFunctionToIndex(void){
        return funcToIndex;
    }

    static int getFunctionIndex(llvm::Function* func){
        return funcToIndex[func];
    }

    static int getFunctionBbCount(llvm::Function* func){
        return funcToBbCount[func];
    }

    inline bool isConfigStruct(llvm::Value* value){
        return isConfigStruct(value->getType());
    }

    inline bool isConfigStruct(llvm::StructType* structType){
        structType = getBaseStType(structType, getStructEqMap());
        return configStructTypes.find(structType) != configStructTypes.end();
    }

    inline bool isConfigStruct(llvm::Type* type){
        type = getBaseType(type);
        if ( SVF::SVFUtil::isa<llvm::StructType>(type) )
            return isConfigStruct(
                        SVF::SVFUtil::dyn_cast<llvm::StructType>(type));
        return false;
    }

    inline bool isConfigGlobalVar(llvm::GlobalVariable* globalVar){
        return configScalarGlobalVars.find(globalVar) != 
                                        configScalarGlobalVars.end();
    }

    inline bool isConfigGlobalVar(llvm::Value* value){
        if ( !SVF::SVFUtil::isa<llvm::GlobalVariable>(value) )
            return false;
        return isConfigGlobalVar(
                    SVF::SVFUtil::dyn_cast<llvm::GlobalVariable>(value));
    }

    inline bool isOptionMapperStruct(llvm::StructType* structType){
        return optionMapperStructTypes.find(structType) != optionMapperStructTypes.end();
    }

    inline bool isOptionMapperStruct(llvm::Type* type){
        if ( SVF::SVFUtil::isa<llvm::StructType>(getBaseType(type)) )
            return isOptionMapperStruct(SVF::SVFUtil::dyn_cast<llvm::StructType>(type));
        return false;
    }

    static std::map<std::string, llvm::StructType*>& getStructEqMap(void){
        return structEqMap;
    }

    static int totalFunctionCount;

    void initializeConfigStructTypes(void);

    void printConfigStructTypes(void){
        printStructTypeUnorderedSet(configStructTypes);
    }

    void printConfigGlobalVars(void){
        printGlobalVarSet(configScalarGlobalVars);
    }

    static std::set<llvm::Function*>& getModuleFuncs(void) {
        return moduleFuncs;
    }

    static std::unordered_set<HeapInitFunction*>& getHeapInitFunctions(void) {
        return heapInitFunctions;
    }

    /// extract all call sites which invoke specified function
    static void findAllCallSites(llvm::Function*, std::unordered_set<llvm::CallInst*>&);

    /// find all functions which initialize heap memory to zero
    void findHeapInitFuncs(std::unordered_set<llvm::Function*>&);

    /// find all call sites which call a heap initialization function
    void findHeapInitCallInsts(void);

    static int getHeapFuncMemIndex(std::string funcName){
        assert (heapInitFuncPairs.find(funcName) != heapInitFuncPairs.end() &&
                "trying to get index for non-existent heap init function name!");
        return heapInitFuncPairs[funcName];
    }

    static void extractAllConditionalBranches(std::set<llvm::Instruction*>&);

    void addToIdentified(llvm::Type* type,
                   std::unordered_set<llvm::StructType*>&,
                   std::unordered_set<llvm::StructType*>&);

    void addUsers(llvm::Value*, std::stack<llvm::Value*>&,
                    std::unordered_set<llvm::Value*>&);

    void populateWorkStack(std::stack<llvm::Value*>&,
                           std::vector<llvm::Value*>&,
                           std::unordered_set<llvm::Value*>&);

private:

    /// the module we are running our analysis against
    SVF::SVFModule *svfModule;

    /// the module we're running the analysi - LLVM module, need for instrumentation
    llvm::Module *module =
            SVF::LLVMModuleSet::getLLVMModuleSet()->getMainLLVMModule();

    /// keep all config-related global variables in this set
    std::set<llvm::GlobalVariable*> configScalarGlobalVars;

    /// keep all config-related struct types in this set
    std::unordered_set<llvm::StructType*> configStructTypes;

    /// keep all option-mapper struct types in this set
    std::unordered_set<llvm::StructType*> optionMapperStructTypes;

    /// keep all option-mapper functions in this set
    std::set<llvm::Function*> optionMapperFunctions;

    /// map struct names to their type, keep only on struct type for
    /// all versioned structs 
    /// ex. (struct.a.123 -> struct.a, struct.a.1 -> struct.a)
    static std::map<std::string, llvm::StructType*> structEqMap;

    /// map each basic block to an index number
    static std::map<llvm::BasicBlock*, int> bbToIndex;

    /// map each function to an index number
    static std::map<llvm::Function*, int> funcToIndex;

    /// map each function to its number of basic blosk
    static std::map<llvm::Function*, int> funcToBbCount;

    /// we should skip functions used for the solver or added for instrumentation
    /// we will keep a list of their names here
    static std::set<std::string> solverFuncs;

    /// we will keep a list of all the module functions without the 
    /// ones added for our instrumentation here
    static std::set<llvm::Function*> moduleFuncs;

    /// we will keep a list of any memory initialization functions
    /// e.g. calloc, memset and use them as config-init instructions 
    static std::set<std::string> heapInitFuncStrs;

    /// we need to know where the memory address value being initialized
    /// is specified in the call instruction, return/arg0/arg1 ...
    static std::map<std::string, int> heapInitFuncPairs;

    /// call instructions which call heap init to zero functions
    static std::unordered_set<HeapInitFunction*> heapInitFunctions;

    /// initialize set with list of solver function names
    void initializeSolverFuncs(void);

    /// initialize set with list of module functions
    void initializeModuleFuncs(void);

    /// initialize set with list of mem init function names
    static void initializeHeapInitFuncs(void);

    /// nested config-related struct type extraction
    std::unordered_set<std::string> matchPatternSet;
    std::unordered_set<std::string> notMatchPatternSet;

    /// initialize set with list of module functions
    void initializeMatchPatterns(void);
    void initializeNotMatchPatterns(void);
    bool matchesPatterns(llvm::StructType*);
};

}

#endif
