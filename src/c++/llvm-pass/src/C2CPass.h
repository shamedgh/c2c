#ifndef C2CPASS_H_
#define C2CPASS_H_

#include "Util/SVFModule.h" 

namespace C2C 
{

class C2CPass : public SVF::ModulePass
{

public:
    /// Pass ID
    static char ID;

    C2CPass() : ModulePass(ID){

    }

                                                                                
    /// Run aero ptr optimizations on SVFModule                                       
    virtual void runOnModule(SVF::SVFModule* svfModule);
                                                                                
    /// Run aero ptr optimizations on LLVM module                                     
    virtual bool runOnModule(SVF::Module& module);

    virtual inline SVF::StringRef getPassName() const{
        return "C2CPass";
    }
};

}

#endif
