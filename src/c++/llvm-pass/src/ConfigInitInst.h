#include "Graphs/SVFG.h"
#include "WPA/Andersen.h"
#include "SVF-FE/PAGBuilder.h"
#include "PreProcessor.h"
#include "HeapInitFunction.h"
#include "C2CUtils.h"
#include "C2CLog.h"

#ifndef C2CConfigInitInst_H_
#define C2CConfigInitInst_H_

namespace C2C
{

class ConfigInitInst
{

public:
    /// Constructor
    ConfigInitInst(llvm::Instruction* inst_):
                          inst(inst_) {
        if ( SVF::SVFUtil::isa<llvm::StoreInst>(inst_) )
            storeInst = SVF::SVFUtil::dyn_cast<llvm::StoreInst>(inst_);
        else if ( SVF::SVFUtil::isa<llvm::CallInst>(inst_) )
            callInst = SVF::SVFUtil::dyn_cast<llvm::CallInst>(inst_);
    }

    ConfigInitInst(llvm::StoreInst* inst_):
                          inst(inst_) {
        storeInst = inst_;
    }

    ConfigInitInst(llvm::CallInst* inst_):
                          inst(inst_) {
        callInst = inst_;
    }

    ConfigInitInst(HeapInitFunction* heapInitFunc_):
                          heapInitFunc(heapInitFunc_) {
        inst = callInst = heapInitFunc_->getCallInst();
    }

    /// Destructor
    virtual ~ConfigInitInst()
    {
        destroy();
    }

    void destroy(){
        // TODO
    }

    llvm::Instruction* getInst(void) const {
        return inst;
    }

    llvm::StoreInst* getStoreInst(void) {
        return storeInst;
    }

    llvm::CallInst* getCallInst(void) {
        return callInst;
    }

    bool isHeapInitFunc(void) const {
        return heapInitFunc != nullptr;
    }

    bool operator==(const ConfigInitInst& other) const
    {
        // TODO are we comparing the right things?
        if ( this->heapInitFunc == nullptr &&
                other.heapInitFunc != nullptr )
            return false;
        else if ( this->heapInitFunc != nullptr && 
                    this->heapInitFunc == other.heapInitFunc )
            return true;
        else 
            return this->inst == other.inst;
        return false;
    }

    struct HashFunction
    {
        size_t operator()(const ConfigInitInst& configInitInst) const
        {
            size_t hashVal = 0;
            if ( configInitInst.heapInitFunc != nullptr ) {
                hashVal = std::hash<llvm::Instruction*>()(configInitInst.getInst())
                            ^ (std::hash<llvm::Value*>()(configInitInst.heapInitFunc->getMemValue()) << 1);
            } else {
                hashVal = std::hash<llvm::Instruction*>()(configInitInst.getInst());
            }
            return hashVal;
        }
    };


private:

    /// instruction of this config init instruction
    llvm::Instruction* inst = nullptr;

    /// store instruction of this config init if it is a store
    llvm::StoreInst* storeInst = nullptr;

    /// parent call instruction of this config init instruction
    llvm::CallInst* callInst = nullptr;

    HeapInitFunction* heapInitFunc = nullptr;

};

}

#endif
