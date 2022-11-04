#include "Graphs/SVFG.h"
#include "WPA/Andersen.h"
#include "SVF-FE/PAGBuilder.h"
#include "PreProcessor.h"
#include "ConditionalBranch.h"
#include "ConfigDepAnalysis.h"
#include "ConfigVariable.h"
#include "ConfigInitInst.h"
#include "C2CUtils.h"

#include <fstream>

#ifndef C2CStats_H_
#define C2CStats_H_

namespace C2C
{


class Statistics
{


public:
    /// Constructor
    Statistics(SVF::SVFModule* svfModule_,
                            ConfigDepAnalysis* configDepAnalysis_):
                          svfModule(svfModule_),
                          configDepAnalysis(configDepAnalysis_) {
    }

    /// Destructor
    virtual ~Statistics()
    {
        destroy();
    }

    void destroy(){
        // TODO
    }

    void generateStats(void);

    void printCondBrConfVarDistribution(std::map<int,int>&);

    void getCondBrConfVarDistribution(ConfigToBranchSetType&,
                                        std::map<int, int>&);

    int getConfigCondBranchEdgeCount(std::set<ConditionalBranch*>&);

    int getHeapBasedEdgeCount(std::unordered_set<llvm::BasicBlock*>&);
    
    int getIndCallBasedEdgeCount(std::unordered_set<llvm::BasicBlock*>&);
    
    int getNotValueBasedEdgeCount(std::set<ConditionalBranch*>&);

    int getTotalConditionalBranchEdgeCount(std::set<llvm::Instruction*>&);

    int getInstEdges(llvm::Instruction*);

    int getSwitchInstEdges(llvm::SwitchInst*);

    int getBranchInstEdges(llvm::BranchInst*);

    void printSwitchCaseCount(std::set<llvm::Instruction*>&);
private:

    /// the svf module we are running our analysis against
    SVF::SVFModule *svfModule;

    /// the module we're running the analysi - LLVM module, need for instrumentation
    llvm::Module *module = 
            SVF::LLVMModuleSet::getLLVMModuleSet()->getMainLLVMModule();

    /// file for storing statistics
    std::fstream statsFile;

    /// we need access to the information processed by configDepAnalysis
    ConfigDepAnalysis *configDepAnalysis;

};

}

#endif
