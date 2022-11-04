#include "SVF-FE/LLVMUtil.h"
#include "C2CPass.h"
#include "TemporalPass.h"
#include "ModuleDebloatingPass.h"
#include "C2CPointerAnalysis.h"

using namespace Temporal;
using namespace C2C;
using namespace SVF;
using namespace llvm;
using namespace std;

static llvm::cl::opt<std::string> InputFileName(cl::Positional, llvm::cl::desc("input bitcode"), 
                            llvm::cl::init("-"));

static llvm::cl::opt<bool> EnableModuleDebloating("module-debloating", llvm::cl::desc("run module debloating"), 
                            llvm::cl::init(false));

static llvm::cl::opt<bool> EnableTemporal("temporal", llvm::cl::desc("run temporal analysis?"), 
                            llvm::cl::init(false));

static llvm::cl::opt<bool> EnablePTA("enable-pta", llvm::cl::desc("C2C - Enable or disable pointer analysis"),
                            llvm::cl::init(false));

int main(int argc, char **argv) {
    int arg_num = 0;
    char **arg_value = new char*[argc];
    std::vector<std::string> moduleNameVec;
    SVFUtil::processArguments(argc, argv, arg_num, arg_value, moduleNameVec);
    cl::ParseCommandLineOptions(arg_num, arg_value,
                                "Config-2-Code\n");

    SVFModule* svfModule = LLVMModuleSet::getLLVMModuleSet()->buildSVFModule(moduleNameVec);

    if ( EnablePTA ){
        C2CPointerAnalysis *c2cPta = new C2CPointerAnalysis(svfModule);
        c2cPta->run();
    }

    if ( EnableModuleDebloating ) {
        ModuleDebloatingPass* modDebloatPass = new ModuleDebloatingPass();
        modDebloatPass->runOnModule(svfModule);
    }else if ( !EnableTemporal ){
        C2CPass* c2cPass = new C2CPass();
        c2cPass->runOnModule(svfModule);
        outs() << "Finished c2c pass\n";
    }else{
        TemporalPass* temporalPass = new TemporalPass();
        temporalPass->runOnModule(svfModule);
        outs() << "Finished temporal pass\n";
    }


    return 0;
}
