#ifndef TemporalPASS_H_
#define TemporalPASS_H_

#include "Util/SVFModule.h" 

namespace Temporal
{

class TemporalPass : public SVF::ModulePass
{

public:
    /// Pass ID
    static char ID;

    TemporalPass() : ModulePass(ID){

    }

    typedef std::map<llvm::Function*, std::set<llvm::BasicBlock*>> FunctionAssignmentToFunctionMap;
                                                                                
    /// Run aero ptr optimizations on SVFModule                                       
    virtual void runOnModule(SVF::SVFModule* svfModule);
                                                                                
    /// Run aero ptr optimizations on LLVM module                                     
    virtual bool runOnModule(SVF::Module& module);

    virtual inline SVF::StringRef getPassName() const{
        return "TemporalPass";
    }

    /// Hamed: return funAssignmentMap
    inline FunctionAssignmentToFunctionMap& getFunAssignmentMap() {
        return funAssignmentMap;
    }

    inline void addToFuncAssignmentMap(llvm::Function *targetFunc, 
                                       llvm::BasicBlock *bb) {
        assert(targetFunc && "targetFunc should not be NULL");
        funAssignmentMap[targetFunc].insert(bb);
        return;
    }

    void addUsers(llvm::Value*, llvm::Function*, 
                  std::map<llvm::Value*, std::vector<llvm::Function*>>&, 
                  std::set<llvm::Value*>&);

    void createDirectCallGraph(void);

    void printFunctionPtrAlloc(void);

    void printFunctionPtrAllocWithBb(void);

    void createFunctionPtrAlloc(SVF::SVFModule*);

    void findAllFunctions(llvm::Value*, std::vector<llvm::Function*>&,
                          std::set<llvm::Value*>&);

    bool isFunctionAssignment(llvm::Instruction*);

    void addFunctionPointerAssignment(llvm::Function*, llvm::Instruction*);

    ///< Map a function to functions where it's assigned as a function pointer
    FunctionAssignmentToFunctionMap funAssignmentMap;   
};

}

#endif
