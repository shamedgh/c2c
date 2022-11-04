#ifndef C2CHeapInitFunction_H_
#define C2CHeapInitFunction_H_

#include "Graphs/SVFG.h"
#include "WPA/Andersen.h"
#include "SVF-FE/PAGBuilder.h"
#include "C2CUtils.h"
#include "C2CLog.h"
#include "PreProcessor.h"

namespace C2C
{

class PreProcessor;

enum FuncType {
    RET,
    ARG
};

class HeapInitFunction
{

public:
    /// Constructor
    HeapInitFunction(PreProcessor* preProcessor_,
                     llvm::Instruction* inst_,
                     std::map<std::string, int>& funcPairs_):
                     preProcessor(preProcessor_),
                     inst(inst_) {
        if ( SVF::SVFUtil::isa<llvm::CallInst>(inst) ){
            callInst = SVF::SVFUtil::dyn_cast<llvm::CallInst>(inst);
            setMemValue(funcPairs_);
        }
    }

    /// Destructor
    virtual ~HeapInitFunction()
    {
        destroy();
    }

    void destroy(){
        // TODO
    }

    llvm::CallInst* getCallInst(void) {
        return callInst;
    }

    void evaluate(void);

    bool isConfigStructRelated(void) {
        return stTypes.size() != 0;
    }

    std::unordered_set<llvm::StructType*>& getStructTypes(void) {
        return stTypes;
    }

    llvm::Value* getMemValue(void) {
        return memValue;
    }

    void evaluateRetBased(void);

    void evaluateArgBased(void);

    void parseCastInst(llvm::CastInst*, llvm::Value*, bool, std::unordered_set<llvm::Value*>&);

    void parseStoreInst(llvm::StoreInst*, llvm::Value*, bool, std::unordered_set<llvm::Value*>&);

    void parseStruct(llvm::StructType*, std::unordered_set<llvm::StructType*>&);

private:

    /// parent instruction of this heap init call
    llvm::Instruction* inst = nullptr;

    /// parent call  instruction of this heap init call
    llvm::CallInst* callInst = nullptr;

    /// memory value which is being initialized
    llvm::Value* memValue = nullptr;

    /// does the init function take the value as an argument or return it?
    FuncType funcType;

    /// config-related struct types zeroed out by this init func
    std::unordered_set<llvm::StructType*> stTypes;

    PreProcessor *preProcessor;

    void setMemValue(std::map<std::string,int>& funcPairs){
        assert(callInst && "setMemValue can only be called if callInst is set!");
        llvm::Function *callee = getDirectCallee(callInst);
        std::string funcName = callee->getName().str();
        int memArgIndex = funcPairs[funcName];
        if ( memArgIndex == -1 ){
            memValue = callInst;
            funcType = RET;
        }else{
            assert(memArgIndex < callInst->arg_size() && 
                    "heap init function arg index is larger than arg_size!");
            memValue = callInst->getArgOperand(memArgIndex);
            funcType = ARG;
        }
    }

};

}

#endif
