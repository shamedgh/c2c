#include "Graphs/SVFG.h"
#include "WPA/Andersen.h"
#include "SVF-FE/PAGBuilder.h"
#include "PreProcessor.h"
#include "ConditionalBranch.h"
#include "ConfigDepAnalysis.h"
#include "ConfigVariable.h"
#include "ConfigInitInst.h"
#include "C2CUtils.h"

#ifndef C2CRuntimeInstrumentation_H_
#define C2CRuntimeInstrumentation_H_

namespace C2C
{

enum PtrCheckCondition { NullPtrInitToNull, NullPtr};

class RuntimeInstrumentation
{


public:
    /// Constructor
    RuntimeInstrumentation(SVF::SVFModule* svfModule_,
                            ConfigDepAnalysis* configDepAnalysis_):
                          svfModule(svfModule_),
                          configDepAnalysis(configDepAnalysis_) {
    }

    /// Destructor
    virtual ~RuntimeInstrumentation()
    {
        destroy();
    }

    void destroy(){
        // TODO
    }

    void instrument(void);

    void createTableGlobalVar(
                    std::unordered_set<llvm::BasicBlock*>&,
                    std::unordered_set<llvm::BasicBlock*>&,
                    std::unordered_set<llvm::BasicBlock*>&,
                    std::unordered_set<llvm::BasicBlock*>&,
                    int);

    void createBbCountTableGlobalVar(int);

    void instrumentStoreInsts(ConfigToInstSetType&);

    void instrumentTransitionPoint(bool);

    void recordGlobalVarValues(std::set<llvm::GlobalVariable*>&, bool);

    llvm::Value* createLoad(llvm::Value*, SVF::IRBuilder&);

    llvm::Value* createGep(llvm::Value*, int, SVF::IRBuilder&);

    void handleStructGlobalVar(llvm::Value*,
                               llvm::StructType*,
                               SVF::IRBuilder&,
                               llvm::Instruction*);

    void myVerifier(void);

    void trackExecution(void);

private:

    /// the svf module we are running our analysis against
    SVF::SVFModule *svfModule;

    /// the module we're running the analysi - LLVM module, need for instrumentation
    llvm::Module *module = 
            SVF::LLVMModuleSet::getLLVMModuleSet()->getMainLLVMModule();

    /// we need access to the information processed by configDepAnalysis
    ConfigDepAnalysis *configDepAnalysis;

    /// handle global variable value which is a pointer
    void handleGlobalVarPointer(llvm::Value*,
                                llvm::PointerType*,
                                SVF::IRBuilder&,
                                ConfigVariable&);

    /// instrument instruction which loads global variable value, to call solver engine
    void instrumentGlobalValueLoad(SVF::IRBuilder&,llvm::Value*, ConfigVariable&);

    /// specially handle global variables which are a pointer
    void handleValueBasedGlobalVarPointer(
                                        llvm::Value*,
                                        llvm::PointerType*,
                                        SVF::IRBuilder&,
                                        ConfigVariable& configVariable,
                                        std::set<ConditionalBranch*>&);

    /// create BB for handling global variable which is a pointer
    llvm::BasicBlock* createGlobalPtrHandlingBB(llvm::LLVMContext&,
                                                llvm::Function*,
                                                llvm::BasicBlock*,
                                                PtrCheckCondition,
                                                std::set<ConditionalBranch*>&);


    /// instrument each write instruction based on the config variable
    void instrumentConfigValueInstruction(SVF::IRBuilder&, 
                                          const ConfigVariable&, 
                                          const ConfigInitInst&);

    /// prepare and instrument each write instruction for each conditional branch which
    /// depends on the same config variable
    void prepareInstrumentForBranch(
                                    SVF::IRBuilder&,
                                    ConditionalBranch*, 
                                    const ConfigVariable&, 
                                    const ConfigInitInst*,
                                    bool valueBased=true);

    void instrumentValueBased(SVF::IRBuilder&,
                              const ConfigInitInst&, 
                              int, 
                              int, 
                              std::vector<llvm::Value*>&,
                              ConditionalBranch*);

    void instrumentValueBasedSwitch(SVF::IRBuilder&,
                              llvm::Value*,
             //                 llvm::Instruction*, 
                              int, 
                              int, 
                              std::vector<llvm::Value*>&,
                              ConditionalBranch*);

    void instrumentUsedBased(SVF::IRBuilder&,
         //                    llvm::Instruction*, 
                             int, 
                             int, 
                             std::vector<llvm::Value*>&,
                             ConditionalBranch*);

    void instrumentInstForBranch(SVF::IRBuilder&,
           //                      llvm::Instruction*,
                                 llvm::Function*,
                                 int,
                                 int,
                                 std::vector<llvm::Value*>&);

    void addToInstrumentInsts(llvm::Function*,
                              std::set<llvm::Instruction*>&,
                              bool);

    void instrumentTransitionInstruction(llvm::Instruction*);

    void populateInstrumentInstructions(std::set<llvm::Instruction*>&, bool);

    const SVF::SVFFunction* getCalleeForIntCmp(int, int);

    /// retrieve conditional branches which depend on the config variable passed
    std::set<ConditionalBranch*>& getConditionalBranches(const ConfigVariable&,
                                                         llvm::Instruction*);

    void instrumentFunctionExecution(llvm::Function*, llvm::Instruction*);

    void createTrackExecTable(void);

    llvm::ConstantInt *NOTCONFIG_ConstInt = 
                llvm::ConstantInt::get(module->getContext(), llvm::APInt(32,-10));
    llvm::ConstantInt *GLOBALCONFIG_ConstInt = 
                llvm::ConstantInt::get(module->getContext(), llvm::APInt(32,-7));
    llvm::ConstantInt *GLOBALCONFIG_SWITCH_ConstInt = 
                llvm::ConstantInt::get(module->getContext(), llvm::APInt(32,-18));
    llvm::ConstantInt *HEAPWINITCONFIG_ConstInt = 
                llvm::ConstantInt::get(module->getContext(), llvm::APInt(32,-1));
    llvm::ConstantInt *HEAPWINITCONFIG_SWITCH_ConstInt = 
                llvm::ConstantInt::get(module->getContext(), llvm::APInt(32,-11));
    llvm::ConstantInt *HEAPWOINITCONFIG_ConstInt = 
                llvm::ConstantInt::get(module->getContext(), llvm::APInt(32,-8));

    llvm::Type* longType = llvm::IntegerType::get(module->getContext(), 64);
    llvm::Type* intType = llvm::IntegerType::get(module->getContext(), 32);
    llvm::Type* ptrToLongType = llvm::PointerType::get(longType, 0);

    const std::string CHECK_TABLE_NAME = "CONDITION_CHECK_TABLE";
    const std::string CHECK_TABLE_SIZE_NAME = "CONDITION_CHECK_SIZE_TABLE";
    const std::string CONDITION_TABLE_NAME = "CONDITION_TABLE";
    const std::string FUNC_EXEC_TABLE_NAME = "FUNC_TABLE";

    const std::string NULLPTRINITTONULL_FUNC = "c2c_checkConditionNullPtrInitToNull";
    const std::string NULLPTR_FUNC = "c2c_checkConditionNullPtr";
    const std::string INT8_FUNC = "c2c_checkConditionInt8";
    const std::string INT8_1_FUNC = "c2c_checkConditionInt8_1";
    const std::string INT8_32_FUNC = "c2c_checkConditionInt8_32";
    const std::string INT16_FUNC = "c2c_checkConditionInt16";
    const std::string INT16_32_FUNC = "c2c_checkConditionInt16_32";
    const std::string INT32_FUNC = "c2c_checkConditionInt32";
    const std::string INT32_64_FUNC = "c2c_checkConditionInt32_64";
    const std::string INT64_FUNC = "c2c_checkConditionInt64";
    const std::string INT64_32_FUNC = "c2c_checkConditionInt64_32";
    const std::string USEBASED_FUNC = "c2c_checkFunctionBased";
    const std::string CHECKALL_FUNC = "c2c_checkAllConditions";
    const std::string TRACKEXEC_FUNC = "c2c_trackExecution";
    const std::string CHECKALLEXEC_FUNC = "c2c_checkAllExecutedFunctions";

};

}

#endif
