#include "Graphs/SVFG.h"
#include "WPA/Andersen.h"
#include "SVF-FE/PAGBuilder.h"
#include "PreProcessor.h"
#include "C2CUtils.h"

#include <fstream>

#ifndef C2CAugmentedCFG_H_
#define C2CAugmentedCFG_H_

namespace C2C
{

/**
 * We will use this class as a representation of the 
 * augmented control flow graph which also contains 
 * information about the conditional branches
*/
class ACFG
{

public:
    /// Constructor
    ACFG(SVF::SVFModule *svfModule_,
         SVF::PTACallGraph *ptaCallgraph_):
                          svfModule(svfModule_),
                          ptaCallgraph(ptaCallgraph_) {
    }

    /// Destructor
    virtual ~ACFG()
    {
        destroy();
    }

    void destroy(){
        // TODO
    }

    void dump(void);

    void printSwitchCaseEdge(llvm::BasicBlock*,
                              llvm::BasicBlock*);

private:
    SVF::SVFModule *svfModule;

    SVF::PTACallGraph *ptaCallgraph;

    std::fstream acfgFile;

    void printNonConditionalEdge(llvm::BasicBlock*,
                                 llvm::BasicBlock*);

    void printConditionalEdge(llvm::BasicBlock*,
                              llvm::BasicBlock*,
                              llvm::BasicBlock*);

    void handleSwitchInst(llvm::SwitchInst*);

    void handleCallInst(llvm::BasicBlock*);

    void handleIndirectCall(llvm::Instruction*);

    void printExtCall(llvm::BasicBlock*, llvm::Function*);

    void printIntCall(llvm::BasicBlock*, llvm::Function*, bool indirect=false);
};

}

#endif
