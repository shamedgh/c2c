#include "Graphs/ICFG.h"
#include "Util/ExtAPI.h"
#include "llvm/IR/InstIterator.h"
#include "Statistics.h"
#include "PreProcessor.h"
#include "ConfigInitInst.h"
#include "ConditionalBranch.h"
#include "C2CUtils.h"
#include "C2CLog.h"

using namespace llvm;
using namespace SVF;
using namespace C2C;

static llvm::cl::opt<std::string> StatsPath("stats-path",
                            llvm::cl::desc("C2C-Stats - path to store statistics"),
                            llvm::cl::init("/tmp/stats.cfg"));

/*
 * generateStats
 *
 * create statistics about configuration-dependent conditional branches
*/
void Statistics::generateStats(void) {
    statsFile.open(StatsPath, std::ios::out);

    /// key: number of conditional branches a config variable effects
    /// val: number of config variables that have that count
    /// e.g. 4 -> 10 : there are 10 config variables which affect 4 conditional branches
    ///     is like most config variables affect 1 cond br?
    std::map<int, int> condBrConfVarDepDist;
    std::set<Instruction*> condBranchInsts;
    std::set<ConditionalBranch*>& conditionalBranches = 
                    configDepAnalysis->getConditionalBranches();
    ConfigToBranchSetType& configToBranches = 
                configDepAnalysis->getConfigToBranches();
    C2CLogger(logINFO) << "configToBranches.size() " << configToBranches.size() << "\n";
    ConfigToInstSetType& configToInit = 
                configDepAnalysis->getConfigToInitInsts();
    std::set<GlobalVariable*>& configDepGlobalVars =
                configDepAnalysis->getConfigDepGlobalVars();
    PreProcessor::extractAllConditionalBranches(condBranchInsts);

    std::unordered_set<BasicBlock*> nonInitBbs;
    std::unordered_set<BasicBlock*> globalBasedBbs;
    std::unordered_set<BasicBlock*> heapBasedBbs;
    std::unordered_set<BasicBlock*> indCallBasedBbs;
    std::unordered_set<BasicBlock*> switchBasedBbs;

    ConfigDepAnalysis::classifyBranches(configToBranches,
                     configToInit,
                     nonInitBbs,
                     globalBasedBbs,
                     heapBasedBbs,
                     indCallBasedBbs,
                     switchBasedBbs);

    int totalBrEdgeCount = getTotalConditionalBranchEdgeCount(condBranchInsts);
    int configBrEdgeCount = getConfigCondBranchEdgeCount(conditionalBranches);
    int notValueBasedEdgeCount = getNotValueBasedEdgeCount(conditionalBranches);
    int heapBasedEdgeCount = getHeapBasedEdgeCount(heapBasedBbs);
    int indCallEdgeCount = getIndCallBasedEdgeCount(indCallBasedBbs);

    statsFile << "totalBrCount: " << condBranchInsts.size() << "\n";
    statsFile << "totalBrEdgeCount: " << totalBrEdgeCount << "\n";
    statsFile << "configBrCount: " << conditionalBranches.size() << "\n";
    statsFile << "configBrEdgeCount: " << configBrEdgeCount << "\n";
    if ( configDepAnalysis->hasGlobalVars() && configDepAnalysis->hasHeapInits() )
        statsFile << "Global-Heap: B\n";
    else if ( configDepAnalysis->hasGlobalVars() )
        statsFile << "Global-Heap: G\n";
    else if ( configDepAnalysis->hasHeapInits() )
        statsFile << "Global-Heap: H\n";
    statsFile << "wHeapInitEdgeCount: " << heapBasedEdgeCount << "\n";
    statsFile << "non-det-cmp-configBrEdgeCount: " << notValueBasedEdgeCount << "\n";
    statsFile << "indCallEdgeBrEdgeCount: " << indCallEdgeCount << "\n";
    statsFile.flush();

    getCondBrConfVarDistribution(configToBranches, condBrConfVarDepDist);
    printCondBrConfVarDistribution(condBrConfVarDepDist);
    printSwitchCaseCount(condBranchInsts);

    statsFile.close();
}

void Statistics::printSwitchCaseCount(std::set<Instruction*>& condBranchInsts) {
    statsFile << "Switch-Case count\n";
    for ( std::set<Instruction*>::iterator it = condBranchInsts.begin(),
                                           eit = condBranchInsts.end();
                                           it != eit; ++it ){
        if ( !SVFUtil::isa<SwitchInst>(*it) )
            continue;
        SwitchInst *switchInst = SVFUtil::dyn_cast<SwitchInst>(*it);
        statsFile << switchInst->getParent()->getParent()->getName().str()
                    << "|" << PreProcessor::getBasicBlockIndex(switchInst->getParent())
                    << "-S-T:" << (switchInst->getNumCases()+1) << "\n";
        statsFile.flush();
    }
}

void Statistics::printCondBrConfVarDistribution(
                                std::map<int, int>& condBrDist) {
    statsFile << "Config Variable -> Cond Branch distribution:\n";
    for ( std::map<int,int>::iterator it = condBrDist.begin(),
                                     eit = condBrDist.end();
                                        it != eit; ++it ) 
        statsFile << "brCount:configVar " << (*it).first << ":" << (*it).second << "\n";
    statsFile.flush();
}

void Statistics::getCondBrConfVarDistribution(
                                ConfigToBranchSetType& configToBranches, 
                                std::map<int, int>& condBrDist) {
    C2CLogger(logINFO) << "configToBranches.size() " << configToBranches.size() << "\n";
    for ( ConfigToBranchSetType::iterator it = configToBranches.begin(),
                                          eit = configToBranches.end();
                                          it != eit; ++it ) {
        const ConfigVariable& configVariable = (*it).first;
        std::set<ConditionalBranch*>& condBrSet = (*it).second;
        //if ( configVariable.isScalarType() || 
        //        ( configVariable.isStructFieldType() && 
        //            configVariable.getStructField() != -1 ) )
            condBrDist[condBrSet.size()] += 1;
    }
}

int Statistics::getHeapBasedEdgeCount(std::unordered_set<BasicBlock*>& 
                                            bbs) {
    int total = 0;
    for ( std::unordered_set<BasicBlock*>::iterator it = bbs.begin(),
                                                eit = bbs.end();
                                                it != eit; ++it ){
        BasicBlock* bb = *it;
        Instruction* inst = bb->getTerminator();
        total += getInstEdges(inst);
    }
    return total;
}

int Statistics::getIndCallBasedEdgeCount(std::unordered_set<BasicBlock*>& 
                                            bbs) {
    int total = 0;
    for ( std::unordered_set<BasicBlock*>::iterator it = bbs.begin(),
                                                eit = bbs.end();
                                                it != eit; ++it ){
        BasicBlock* bb = *it;
        Instruction* inst = bb->getTerminator();
        total += getInstEdges(inst);
    }
    return total;
}

int Statistics::getNotValueBasedEdgeCount(std::set<ConditionalBranch*>& 
                                            condBranches) {
    int total = 0;
    for ( std::set<ConditionalBranch*>::iterator it = condBranches.begin(),
                                                eit = condBranches.end();
                                                it != eit; ++it ){
        ConditionalBranch* condBranch = *it;
        if ( !condBranch->getValueBasedMatching() )
            total += getInstEdges(condBranch->getInstruction());
    }
    return total;
}

int Statistics::getConfigCondBranchEdgeCount(std::set<ConditionalBranch*>& 
                                            condBranches) {
    int total = 0;
    for ( std::set<ConditionalBranch*>::iterator it = condBranches.begin(),
                                                eit = condBranches.end();
                                                it != eit; ++it ){
        ConditionalBranch* condBranch = *it;
        total += getInstEdges(condBranch->getInstruction());
    }
    return total;
}

int Statistics::getTotalConditionalBranchEdgeCount(std::set<Instruction*>& 
                                            condBranchInsts) {
    int total = 0;
    for ( std::set<Instruction*>::iterator it = condBranchInsts.begin(),
                                            eit = condBranchInsts.end();
                                            it != eit; ++it )
        total += getInstEdges(*it);
    return total;
}

int Statistics::getInstEdges(Instruction *inst){
    if ( SVFUtil::isa<SwitchInst>(inst) )
        return getSwitchInstEdges(SVFUtil::dyn_cast<SwitchInst>(inst));
    else
        return getBranchInstEdges(SVFUtil::dyn_cast<BranchInst>(inst));
}

int Statistics::getSwitchInstEdges(SwitchInst *switchInst) {
    return switchInst->getNumCases()+1;     /// num cases returns all cases except default
}

int Statistics::getBranchInstEdges(BranchInst *brInst) {
    return 2;
}
