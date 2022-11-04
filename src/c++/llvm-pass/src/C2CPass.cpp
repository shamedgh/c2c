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
#include "C2CPass.h"
#include "PreProcessor.h"
#include "ConfigDepAnalysis.h"
#include "RuntimeInstrumentation.h"
#include "C2CPointerAnalysis.h"
#include "ACFG.h"
#include "C2CLog.h"
#include "TemporalPass.h"
#include "Statistics.h"

using namespace C2C;
using namespace SVF;
using namespace llvm;
using namespace std;

char C2CPass::ID = 0;

static llvm::RegisterPass<C2CPass> C2CANALYSIS("c2c",
        "Config-2-Code Mapper");

static llvm::cl::opt<bool> DebugMode("enable-debugging", 
                            llvm::cl::desc("C2C - print debugging messages (very verbose)"),
                            llvm::cl::init(false)); 


static llvm::cl::opt<bool> EnablePAG("enable-pag", llvm::cl::desc("C2C - Enable or disable building PAG"), 
                            llvm::cl::init(true)); 

static llvm::cl::opt<bool> EnableACFG("enable-acfg", llvm::cl::desc("C2C - Enable or disable building ACFG"), 
                            llvm::cl::init(false)); 

static llvm::cl::opt<bool> EnableStats("enable-stats", llvm::cl::desc("C2C - Enable or disable generating stats"), 
                            llvm::cl::init(false)); 

static llvm::cl::opt<bool> OnlyExtractNested("only-extract-nested", llvm::cl::desc("C2C - Only extract nested struct types"), 
                            llvm::cl::init(false)); 

static llvm::cl::opt<bool> EnableFpAlloc("fp-alloc-bb", 
                        llvm::cl::desc("C2C - Enable or disable printing function pointer allocations with bb"), 
                            llvm::cl::init(false)); 

static llvm::cl::opt<bool> EnableInstrumentation("enable-instrument", 
                            llvm::cl::desc("C2C - Enable or disable instrumentation"), 
                            llvm::cl::init(false)); 

static llvm::cl::opt<bool> EnablePTAC2C("c2c-enable-pta", 
                        llvm::cl::desc("C2C - Enable or disable pointer analysis"), 
                            llvm::cl::init(false)); 

LogLevel C2C::logLevel = logINFO;

/*!
 * runOnModule
 * We start from here if called through opt
 */
bool C2CPass::runOnModule(Module& module)
{
    SVFModule* svfModule = 
                LLVMModuleSet::getLLVMModuleSet()->buildSVFModule(module);
    runOnModule(svfModule);
    return false;
}

/*
 * runOnModule
 * Our pass starts here
*/
void C2CPass::runOnModule(SVFModule* svfModule){

    if ( DebugMode )
        C2C::logLevel = logDEBUG;

    if ( EnablePTAC2C ){
        C2CPointerAnalysis *c2cPta = new C2CPointerAnalysis(svfModule);
        c2cPta->run();
    }


    /// preprocessor extract any configuration related scalar global variables
    /// it also identifies any nested config-related struct types
    PreProcessor *preProcessor = new PreProcessor(svfModule);
    preProcessor->run();
    preProcessor->initC2C();

    if ( OnlyExtractNested )
        return;

    if ( EnableFpAlloc ){
        Temporal::TemporalPass *temporalPass = new Temporal::TemporalPass();
        temporalPass->createFunctionPtrAlloc(svfModule);
        temporalPass->printFunctionPtrAllocWithBb();
    }

    /// the configDepAnalysis class identifies configuration-related conditional 
    /// branches and initialization points
    /// it needs the config-related struct types and scalar global variables to 
    /// be passed to it
    ConfigDepAnalysis *configDepAnalysis = 
                                    new ConfigDepAnalysis(svfModule,
                                                          preProcessor);

    configDepAnalysis->run();

    /// build conditional CFG
    if ( EnableACFG ){
        ACFG *acfg = new ACFG(svfModule, nullptr);
        acfg->dump();
    }

    /// instrument to extract global variable values

    /// instrument with solver engine to reason about branch results at runtime
    if ( EnableInstrumentation ){
        RuntimeInstrumentation *runtimeInstrument = 
                                    new RuntimeInstrumentation(svfModule,
                                                            configDepAnalysis);
        runtimeInstrument->instrument();
    }

    if ( EnableStats ) {
        Statistics *stats = new Statistics(svfModule, configDepAnalysis);
        stats->generateStats();
    }
}
