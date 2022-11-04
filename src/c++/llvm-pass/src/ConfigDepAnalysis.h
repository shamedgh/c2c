#ifndef C2CConfigDepAnalysis_H_
#define C2CConfigDepAnalysis_H_

#include "Graphs/SVFG.h"
#include "WPA/Andersen.h"
#include "SVF-FE/PAGBuilder.h"
#include "PreProcessor.h"
#include "ConditionalBranch.h"
#include "ConfigVariable.h"
#include "HeapInitFunction.h"
#include "ConfigInitInst.h"
#include "C2CUtils.h"

namespace C2C
{

typedef std::unordered_set<ConfigInitInst, ConfigInitInst::HashFunction> ConfigInitSetType;
typedef std::unordered_map<ConfigVariable, 
                           std::set<ConditionalBranch*>, 
                           ConfigVariable::HashFunction> ConfigToBranchSetType;
typedef std::unordered_map<llvm::StructType*, 
                           std::set<ConditionalBranch*>> StructTypeToBranchSetType;
typedef std::unordered_map<ConfigVariable, 
                           ConfigInitSetType, 
                           ConfigVariable::HashFunction> ConfigToInstSetType;

class ConfigDepAnalysis
{

public:
    /// Constructor
    ConfigDepAnalysis(SVF::SVFModule* svfModule_,
                            PreProcessor* preProcessor_):
                          svfModule(svfModule_),
                          preProcessor(preProcessor_) {
    }

    /// Destructor
    virtual ~ConfigDepAnalysis()
    {
        destroy();
    }

    void destroy(){
        // TODO
    }

    void run(void);

    void extractConfigDepConditionalBranches(void);

    void extractConfigDepInits(void);

    void extractConfigDepGlobalVars(void);

    static void classifyBranches(ConfigToBranchSetType&,
                          ConfigToInstSetType&,
                          std::unordered_set<llvm::BasicBlock*>&,
                          std::unordered_set<llvm::BasicBlock*>&,
                          std::unordered_set<llvm::BasicBlock*>&,
                          std::unordered_set<llvm::BasicBlock*>&,
                          std::unordered_set<llvm::BasicBlock*>&);

    inline bool isReverse(int type) {
        return type == BACKWARDSLICE;
    }

    inline bool isLoopVariantSlice(int type){
        return type == LOOPVARIANTSLICE;
    }

    bool parseValue(llvm::BasicBlock*,
                    llvm::Value*,
                    std::unordered_set<llvm::Value*>&,
                    int,
                    std::stack<llvm::Value*>&,
                    std::unordered_set<llvm::Instruction*>&,
                    llvm::Loop*,
                    bool);

    bool parseInstruction(llvm::BasicBlock*,
                    llvm::Instruction*,
                    std::unordered_set<llvm::Value*>&,
                    int,
                    std::stack<llvm::Value*>&,
                    std::unordered_set<llvm::Instruction*>&,
                    llvm::Loop*,
                    bool);


    bool parseConstantExpr(llvm::BasicBlock*,
                           std::unordered_set<llvm::Value*>&,
                           llvm::ConstantExpr*, int,
                           std::stack<llvm::Value*>&,
                           std::unordered_set<llvm::Instruction*>&,
                           llvm::Loop*, 
                           bool);

    void mapLastGepToCondition(ConditionalBranch*,
                               llvm::Value*,
                               std::vector<llvm::Value*>&);

    bool analyzeDataFlow(llvm::Value*,
                         llvm::Value*,
                         std::vector<llvm::Value*>&);

    void identifyHeapInitFuncs(void);

    void traverseStructFields(llvm::StructType*, HeapInitFunction*);

    void identifyStructBasedInits(void);

    llvm::Value* findArgOnStack(llvm::Value*, 
                                llvm::CallInst* CI, std::vector<llvm::Value*>&);

    ConfigToBranchSetType& getConfigToBranches(void){
        return configToBranches;
    }

    ConfigToInstSetType& getConfigToInitInsts(void){
        return configToInitInsts;
    }

    std::set<llvm::GlobalVariable*>& getConfigDepGlobalVars(void){
        return configDepGlobalVars;
    }

    bool condBranchesHasConfigVar(const ConfigVariable& configVariable) {
        return configToBranches.find(configVariable) != configToBranches.end();
    }

    /**
     * must always check if configVariable exists in configToBranches before calling this
    */
    std::set<ConditionalBranch*>& getConfigCondBranches(
                                    const ConfigVariable& configVariable,
                                    bool ignoreFieldIndex=false){
        if ( configToBranches.find(configVariable) == 
                configToBranches.end() )
            assert(false && "shouldn't call getConfigCondBranches with non-existent configVariable!");
        if ( !configVariable.isStructFieldType() )
            return configToBranches[configVariable];
        if ( configVariable.getStructField() == - 1)
            ignoreFieldIndex = true;
        if ( ignoreFieldIndex )
            return configStructToBranches[configVariable.getStructType()];
        return configToBranches[configVariable];
    }

    bool supportsValueBased(const ConfigVariable& configVariable,
                            const ConfigInitInst& configInitInst){
        llvm::Instruction* inst = configInitInst.getInst();
        if ( configInitInst.isHeapInitFunc() )
            return true;
        return supportsValueBased(configVariable, inst);
    }

    bool supportsValueBased(const ConfigVariable& configVariable,
                            llvm::Instruction *inst){
        if ( inst && SVF::SVFUtil::isa<llvm::CallInst>(inst) )
            return false;
        if ( configVariable.isStructFieldType() && 
                        configVariable.getStructField() == -1 )
            return false;
        return true;
    }

    void printConfigDepConditionalBranches(void);

    void printConfigDepInits(void);

    void printConfigDepGlobalVars(void);

    std::set<ConditionalBranch*>& getConditionalBranches(void) {
        return conditionalBranches;
    }

    bool hasGlobalVars(void) {
        return hasGlobal;
    }

    bool hasHeapInits(void) {
        return hasHeapInit;
    }
private:

    /// the module we are running our analysis against
    SVF::SVFModule *svfModule;

    /// we only need this for generating a constant i1 int for bool-based cond branches
    llvm::Module *module =
            SVF::LLVMModuleSet::getLLVMModuleSet()->getMainLLVMModule();

    /// we need access to the information processed by the preprocessor
    /// this includes the config-related struct types and global vars
    PreProcessor *preProcessor;

    /// set of all configuration-dependent conditional branches
    std::set<ConditionalBranch*> conditionalBranches;

    /// this map will map each configuration variable to its conditional branch
    /// we need to map each configuration variable to its conditional branches
    /// to use it when mapping configuration initializations (aka writes)
    ConfigToBranchSetType configToBranches;

    /// this map will map each configuration struct type to its conditional branch
    /// we need this separately for performance in cases where we can't identify
    /// the field in an initialization instruction
    StructTypeToBranchSetType configStructToBranches;

    /// we also need to map each configuration variable to any instruction 
    /// which initializes (aka write) them
    ConfigToInstSetType configToInitInsts;

    /// TODO we probably don't need this, but let's see for now
    /// we need to keep all global variables which hold configuration-related
    /// information in a set as well. we will instrument the program to check
    /// the values of these global variables at runtime and decide on the 
    /// related conditional branches
    std::set<llvm::GlobalVariable*> configDepGlobalVars;

    /// does this program have any global variables holding runtime settings
    bool hasGlobal = false;

    /// does this program have any heap initializations for storing runtime settings
    bool hasHeapInit = false;

    int totalCmpInst, targetCmpInst;

    int FORWARDSLICE = 0;
    int BACKWARDSLICE = 1;
    int LOOPVARIANTSLICE = 2;

    //bool SkipCmpEqZero = true;
    bool SkipCmpEqZero = false;
};

}

#endif
