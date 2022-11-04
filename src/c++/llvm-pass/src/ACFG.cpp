#include "Graphs/ICFG.h"
#include "Util/ExtAPI.h"
#include "llvm/IR/InstIterator.h"
#include "ACFG.h"
#include "C2CUtils.h"
#include "PreProcessor.h"
#include "C2CPointerAnalysis.h"
#include "C2CLog.h"

using namespace llvm;
using namespace SVF;
using namespace C2C;

static llvm::cl::opt<std::string> ACFGPath("acfg-path", 
                            llvm::cl::desc("C2C-ACFG - path to dump ACFG in"), 
                            llvm::cl::init("/tmp/acfg.cfg")); 

void ACFG::dump(void){
    acfgFile.open(ACFGPath, std::ios::out);
    //C2CLogger(logDEBUG) << "iterating over function for ACFG:\n";
    std::set<Function*>& moduleFuncs = PreProcessor::getModuleFuncs();
    for ( std::set<Function*>::iterator it = moduleFuncs.begin(),
                                        eit = moduleFuncs.end();
                                        it != eit; ++it){
        Function *fun = *it;
        //if ( fun->hasName() ){
        //    C2CLogger(logDEBUG) << fun->getName() << "\n";
        //}
        for (Function::iterator bit = fun->begin(),
                                ebit = fun->end();
                                bit != ebit; ++bit) {
            BasicBlock& bb = *bit;
            handleCallInst(&bb);
            if ( BasicBlock *successor = bb.getSingleSuccessor() ){
                printNonConditionalEdge(&bb, successor);
                continue;
            }
            Instruction *termInst = bb.getTerminator();
            if ( SVFUtil::isa<ReturnInst>(termInst) )
                continue;
            if ( SVFUtil::isa<SwitchInst>(termInst) ){
                handleSwitchInst(SVFUtil::dyn_cast<SwitchInst>(termInst));
                continue;
            }
            if ( !SVFUtil::dyn_cast<BranchInst>(termInst) ){
                //C2CLogger(logWARNING) << "end of bb instruction is not branch: "
                //                      << getValueString(termInst) << "\n";
                continue;
            }
            BranchInst *branchInst = SVFUtil::dyn_cast<BranchInst>(termInst);
            if ( !branchInst->isConditional() )
                assert(false && "terminator is branch but not conditional!");
            printConditionalEdge(&bb, 
                                 branchInst->getSuccessor(0),
                                 branchInst->getSuccessor(1));
        }
    }
    acfgFile.close();
}

void ACFG::handleSwitchInst(SwitchInst *switchInst){
    for ( SwitchInst::CaseIt it = switchInst->case_begin(),
                             eit = switchInst->case_end();
                             it != eit; ++it ){
        if ( it == switchInst->case_default() )
            continue;
        printSwitchCaseEdge(switchInst->getParent(),
                            it->getCaseSuccessor());
    }

    printNonConditionalEdge(switchInst->getParent(),
                                switchInst->getDefaultDest());
}

void ACFG::handleCallInst(BasicBlock* bb){
    for ( BasicBlock::iterator it = bb->begin(),
                               eit = bb->end();
                               it != eit; ++it ){
        Instruction *inst = &(*it);
        if ( !SVFUtil::isa<CallInst>(inst) )
            continue;
        if ( SVFUtil::dyn_cast<CallInst>(inst)->isIndirectCall() ){
            handleIndirectCall(inst);
            continue;
        }
        Function *calleeFunc = 
                    getDirectCallee(SVFUtil::dyn_cast<CallInst>(inst));
        if ( !calleeFunc ){
            //C2CLogger(logWARNING) << "calleeFunc returned nullptr for inst: "
            //                      << getValueString(inst) << "\n";
            continue;
        }
        if ( SVFUtil::isExtCall(
                        SVFUtil::getDefFunForMultipleModule(calleeFunc)) )
            printExtCall(bb, calleeFunc);
        else
            printIntCall(bb, calleeFunc);
    }
}

void ACFG::handleIndirectCall(Instruction *inst){
    Andersen::CallEdgeMap *callEdgeMap = C2CPointerAnalysis::getIndCallMap();
    if ( !callEdgeMap ){
        C2CLogger(logWARNING) << "pta not enabled, not handling indirect callsites\n";
        return;
    }
    PAG *pag = C2CPointerAnalysis::getPag();
    PTACallGraph *ptaCallGraph = C2CPointerAnalysis::getCallGraph();
    CallBlockNode *callBlockNode = pag->getICFG()->getCallBlockNode(inst);
    if ( !ptaCallGraph->hasIndCSCallees(callBlockNode) )
        return;
    const Andersen::FunctionSet& calleeFuncs = 
                ptaCallGraph->getIndCSCallees(callBlockNode);
    for ( auto func : calleeFuncs ){
        const SVFFunction *callee = SVFUtil::dyn_cast<SVFFunction>(func); 
        if ( !callee )
            continue;
        if ( SVFUtil::isExtCall(callee) )
            printExtCall(inst->getParent(), callee->getLLVMFun());
        else
            printIntCall(inst->getParent(), callee->getLLVMFun(), true);
    }
}

void ACFG::printExtCall(BasicBlock *curr, Function *callee){
    Function *func = curr->getParent();
    assert (func && "bb parent function is nullptr!");
    acfgFile << func->getName().str() << "|" 
             << PreProcessor::getBasicBlockIndex(curr) << "-ExtF->";
    if ( callee->hasName() )
        acfgFile << callee->getName().str() << "\n";
    else
        acfgFile << "UNKNOWN-NAME\n";
    acfgFile.flush();
}

void ACFG::printIntCall(BasicBlock *curr, Function *callee, bool indirect){
    Function *func = curr->getParent();
    assert (func && "bb parent function is nullptr!");
    BasicBlock *entryBlock = &callee->getEntryBlock();
    assert (entryBlock && "callee func doesn't have entry block!");
    acfgFile << func->getName().str() << "|" 
             << PreProcessor::getBasicBlockIndex(curr);
    if ( indirect )
        acfgFile << "-INDF->";
    else
        acfgFile << "-F->";
    acfgFile << callee->getName().str() << "|"
                << PreProcessor::getBasicBlockIndex(entryBlock) << "\n";
    acfgFile.flush();
}

void ACFG::printNonConditionalEdge(BasicBlock *curr, BasicBlock *next){
    Function *func = curr->getParent();
    Function *nextFunc = next->getParent();
    assert (func && "bb parent function is nullptr!");
    assert (nextFunc && "bb next parent function is nullptr!");
    acfgFile << func->getName().str() << "|" 
             << PreProcessor::getBasicBlockIndex(curr) << "->"
             << nextFunc->getName().str() << "|"
             << PreProcessor::getBasicBlockIndex(next) << "\n";
    acfgFile.flush();
}

void ACFG::printConditionalEdge(BasicBlock *curr, BasicBlock *trueNext, BasicBlock *falseNext){
    Function *func = curr->getParent();
    assert (func && "bb parent function is nullptr!");
    acfgFile << func->getName().str() << "|" 
             << PreProcessor::getBasicBlockIndex(curr) << "-C-T->"
             << func->getName().str() << "|"
             << PreProcessor::getBasicBlockIndex(trueNext) << "\n";
    acfgFile << func->getName().str() << "|" 
             << PreProcessor::getBasicBlockIndex(curr) << "-C-F->"
             << func->getName().str() << "|"
             << PreProcessor::getBasicBlockIndex(falseNext) << "\n";
    acfgFile.flush();
}

void ACFG::printSwitchCaseEdge(BasicBlock *curr, BasicBlock *trueNext){
    Function *func = curr->getParent();
    assert (func && "bb parent function is nullptr!");
    acfgFile << func->getName().str() << "|" 
             << PreProcessor::getBasicBlockIndex(curr) << "-S-T->"
             << func->getName().str() << "|"
             << PreProcessor::getBasicBlockIndex(trueNext) << "\n";
    acfgFile.flush();
}
