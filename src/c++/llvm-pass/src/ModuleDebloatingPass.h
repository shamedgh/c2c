#ifndef ModuleDebloatingPASS_H_
#define ModuleDebloatingPASS_H_

#include "Util/SVFModule.h" 

namespace C2C
{

class ModuleDebloatingPass : public SVF::ModulePass
{

public:
    /// Pass ID
    static char ID;

    ModuleDebloatingPass() : ModulePass(ID){

    }

    virtual void runOnModule(SVF::SVFModule* svfModule);
                                                                                
    virtual bool runOnModule(SVF::Module& module);

    virtual inline SVF::StringRef getPassName() const{
        return "ModuleDebloatingPass";
    }

    void parseConstant(llvm::Constant*);
};

}

#endif
