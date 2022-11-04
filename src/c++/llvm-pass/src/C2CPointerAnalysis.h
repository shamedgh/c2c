#include "Graphs/SVFG.h"
#include "WPA/Andersen.h"
#include "SVF-FE/PAGBuilder.h"
#include "Util/SVFModule.h"
#include "SVF-FE/LLVMUtil.h"
#include "Graphs/SVFG.h"
#include "WPA/Andersen.h"
#include "WPA/AndersenSFR.h"
#include "WPA/Steensgaard.h"
#include "WPA/FlowSensitiveTBHC.h"
#include "WPA/TypeAnalysis.h"
#include "MemoryModel/PointerAnalysis.h"
#include "SABER/LeakChecker.h"
#include "SVF-FE/PAGBuilder.h"

#include "C2CUtils.h"

#ifndef C2CPointerAnalysis_H_
#define C2CPointerAnalysis_H_

namespace C2C
{

class C2CPointerAnalysis
{

public:
    /// Constructor
    C2CPointerAnalysis(SVF::SVFModule* svfModule_):
                          svfModule(svfModule_) {
    }

    /// Destructor
    virtual ~C2CPointerAnalysis()
    {
        destroy();
    }

    void destroy(){
        // TODO
    }

    inline static SVF::Andersen::CallEdgeMap* getIndCallMap(void){
        return callEdgeMap;
    }

    inline static SVF::PAG* getPag(void){
        return pag;
    }

    inline static SVF::PTACallGraph *getCallGraph(void){
        return callgraph;
    }

    void run(void);

private:

    /// the module we are running our analysis against
    SVF::SVFModule *svfModule;

    /// the module we're running the analysi - LLVM module, need for instrumentation
    llvm::Module *module =
            SVF::LLVMModuleSet::getLLVMModuleSet()->getMainLLVMModule();

    static SVF::PAG *pag;

    static SVF::PTACallGraph *callgraph;

    static SVF::PointerAnalysis * _pta;

    static SVF::Andersen *ander;

    static SVF::Andersen::CallEdgeMap *callEdgeMap;
};

}

#endif
