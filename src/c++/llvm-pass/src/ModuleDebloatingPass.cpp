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
#include "ModuleDebloatingPass.h"
#include "C2CUtils.h"

#include <fstream>

using namespace C2C;
using namespace SVF;
using namespace llvm;
using namespace std;

char ModuleDebloatingPass::ID = 0;

static llvm::RegisterPass<ModuleDebloatingPass> ModuleDebloat("c2c-mod-debloat",
        "Module Debloating Pass");


static llvm::cl::opt<std::string> OutputPath("mod-debloat-output-path", 
                            llvm::cl::desc("Module debloating output path"), 
                            llvm::cl::init("/tmp/mod-debloat.out")); 


/*!
 * runOnModule
 * We start from here if called through opt
 */
bool ModuleDebloatingPass::runOnModule(Module& module)
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
void ModuleDebloatingPass::runOnModule(SVFModule* svfModule){
    for ( SVFModule::global_iterator it = svfModule->global_begin(),
                                    eit = svfModule->global_end();
                                    it != eit; ++it ) {
        GlobalVariable& global = *(*it);
        if (global.hasInitializer()) {
            Constant* init = global.getInitializer();
            parseConstant(init);
        }
    }
}

void ModuleDebloatingPass::parseConstant(Constant* val){
    if ( val->isNullValue() )
        return;
    Type* ty = val->getType();
    if (ArrayType* arrTy = SVFUtil::dyn_cast<ArrayType>(ty)) {
        ConstantArray* consArray = SVFUtil::dyn_cast<ConstantArray>(val);
        if (IntegerType* intTy = SVFUtil::dyn_cast<IntegerType>(arrTy->getElementType())) {
            if (intTy->getBitWidth() == 8) {
                std::vector<char> sVec;
                for (int i = 0; i < arrTy->getNumElements(); i++) {
                    Constant* v = val->getAggregateElement(i);
                    if (v) {
                        ConstantInt* cInt = SVFUtil::dyn_cast<ConstantInt>(v);
                        assert(cInt && "must be constant int");
                        sVec.push_back(cInt->getZExtValue());
                    }
                }
                sVec.push_back(0);
                std::string consStr (sVec.begin(), sVec.end());
                outs() << "configName: " << consStr << "\n";
            }
        }
        if (StructType* stTy = SVFUtil::dyn_cast<StructType>(arrTy->getElementType())) {
            for (int i = 0; i < arrTy->getNumElements(); i++) {
                Constant* v = val->getAggregateElement(i);
                if (v) {
                    parseConstant(v);
                }
            }
        }
    } else if (StructType* stTy = SVFUtil::dyn_cast<StructType>(ty)) {
        ConstantStruct* consStruct = SVFUtil::dyn_cast<ConstantStruct>(val);
        assert(consStruct && "struct but not struct?");
        for (int i = 0; i < stTy->getNumElements(); i++) {
            Constant* v = val->getAggregateElement(i);
            if (v) {
                parseConstant(v);
            }
        }
    }
}
