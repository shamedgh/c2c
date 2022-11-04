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
#include "C2CPointerAnalysis.h"
#include "RuntimeInstrumentation.h"
#include "C2CLog.h"

using namespace C2C;
using namespace SVF;
using namespace llvm;
using namespace std;

PAG *C2CPointerAnalysis::pag;
PTACallGraph *C2CPointerAnalysis::callgraph;
PointerAnalysis *C2CPointerAnalysis::_pta;
Andersen *C2CPointerAnalysis::ander;
Andersen::CallEdgeMap *C2CPointerAnalysis::callEdgeMap = nullptr;

void C2CPointerAnalysis::run(void){
    /// Build Program Assignment Graph (PAG)
    PAGBuilder builder;

    pag = builder.build(svfModule);

    /// From SVF WPAPass:
    for (u32_t i = 0; i<= PointerAnalysis::Default_PTA; i++)
    {
        if (Options::PASelected.isSet(i)){
            errs() << "select i is: " << i << "\n";
            switch (i)
            {
            case PointerAnalysis::Andersen_WPA:
                _pta = new Andersen(pag);
                break;
            case PointerAnalysis::AndersenLCD_WPA:
                _pta = new AndersenLCD(pag);
                break;
            case PointerAnalysis::AndersenHCD_WPA:
                _pta = new AndersenHCD(pag);
                break;
            case PointerAnalysis::AndersenHLCD_WPA:
                _pta = new AndersenHLCD(pag);
                break;
            case PointerAnalysis::AndersenSCD_WPA:
                _pta = new AndersenSCD(pag);
                break;
            case PointerAnalysis::AndersenSFR_WPA:
                _pta = new AndersenSFR(pag);
                break;
            case PointerAnalysis::AndersenWaveDiff_WPA:
                _pta = new AndersenWaveDiff(pag);
                break;
            case PointerAnalysis::AndersenWaveDiffWithType_WPA:
                _pta = new AndersenWaveDiffWithType(pag);
                break;
            case PointerAnalysis::Steensgaard_WPA:
                _pta = new Steensgaard(pag);
                break;
            case PointerAnalysis::FSSPARSE_WPA:
                _pta = new FlowSensitive(pag);
                break;
            case PointerAnalysis::FSTBHC_WPA:
                _pta = new FlowSensitiveTBHC(pag);
                break;
            case PointerAnalysis::VFS_WPA:
                _pta = new VersionedFlowSensitive(pag);
                break;
            case PointerAnalysis::TypeCPP_WPA:
                _pta = new TypeAnalysis(pag);
                break;
            default:
                assert(false && "This pointer analysis has not been implemented yet.\n");
                return;
            }

        }
    }

    /// Create Andersen's pointer analysis
    C2CLogger(logINFO) << "Starting to run Andersen's pointer analysis\n";
    //ander = AndersenWaveDiff::createAndersenWaveDiff(pag);
    _pta->analyze();
    callgraph = _pta->getPTACallGraph();
    callEdgeMap = &(callgraph->getIndCallMap());
    C2CLogger(logINFO) << "Finished running Andersen's pointer analysis\n";

}
