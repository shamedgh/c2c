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
#include "TemporalPass.h"
#include "PreProcessor.h"
#include "C2CUtils.h"

#include <fstream>

using namespace Temporal;
using namespace C2C;
using namespace SVF;
using namespace llvm;
using namespace std;

char TemporalPass::ID = 0;

static llvm::RegisterPass<TemporalPass> TemporalANALYSIS("temporal-specialization",
        "Temporal Specialization");


static llvm::cl::opt<bool> DirectCallGraph("direct", llvm::cl::desc("Temporal - create direct callgraph"), 
                            llvm::cl::init(false)); 

static llvm::cl::opt<std::string> DirectCallGraphPath("direct-path", 
                            llvm::cl::desc("Temporal - direct callgraph file path"), 
                            llvm::cl::init("/tmp/temporal.direct.callgraph")); 

static llvm::cl::opt<bool> FunctionPtrAlloc("fp-alloc", llvm::cl::desc("Temporal - function pointer alloc"), 
                            llvm::cl::init(false)); 

static llvm::cl::opt<std::string> FunctionPtrAllocPath("fp-alloc-path", 
                            llvm::cl::desc("Temporal - function pointer alloc path"), 
                            llvm::cl::init("/tmp/temporal.fp.alloc")); 


/*!
 * runOnModule
 * We start from here if called through opt
 */
bool TemporalPass::runOnModule(Module& module)
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
void TemporalPass::runOnModule(SVFModule* svfModule){
    PreProcessor *preProcessor = new PreProcessor(svfModule);
    preProcessor->run();

    if ( DirectCallGraph ){
        createDirectCallGraph();
    }

    if ( FunctionPtrAlloc ){
        createFunctionPtrAlloc(svfModule);
        printFunctionPtrAlloc();
    }
}

void TemporalPass::createDirectCallGraph(){
    std::fstream directCallGraphFile;
    directCallGraphFile.open(DirectCallGraphPath, std::ios::out);
    std::set<llvm::Function*>& moduleFuncs = PreProcessor::getModuleFuncs();
    for ( std::set<Function*>::iterator it = moduleFuncs.begin(),
                                     eit = moduleFuncs.end();
                                     it != eit; ++it){
        Function *fun = *it;

        for ( inst_iterator I = inst_begin(fun), E = inst_end(fun);
                                I != E; ++I ){
            if ( CallInst *callInst = SVFUtil::dyn_cast<CallInst>(&*I) ){
                if ( callInst->isIndirectCall() )
                    continue;
                Function *callee = getDirectCallee(callInst);
                if ( callee == nullptr )
                    continue;
                if ( !callee->hasName() )
                    continue;
                directCallGraphFile << fun->getName().str() << "->" 
                                    << callee->getName().str() << "\n";
                directCallGraphFile.flush();
            }
        }
    }
    directCallGraphFile.close();
}

void TemporalPass::printFunctionPtrAlloc(void){
    std::fstream funcPtrAllocFile;
    funcPtrAllocFile.open(FunctionPtrAllocPath, std::ios::out);
    for ( FunctionAssignmentToFunctionMap::iterator it = funAssignmentMap.begin(), 
                                                    eit = funAssignmentMap.end(); 
                                                    it != eit; it++ ){
        for ( std::set<BasicBlock*>::iterator it2 = it->second.begin(), 
                                            eit2 = it->second.end(); 
                                            it2 != eit2; it2++ ){
            funcPtrAllocFile << (*it2)->getParent()->getName().str() 
                          << "->" << it->first->getName().str() << "\n";
            funcPtrAllocFile.flush();
        }
    }
    funcPtrAllocFile.close();
}

void TemporalPass::printFunctionPtrAllocWithBb(void){
    std::fstream funcPtrAllocFile;
    funcPtrAllocFile.open(FunctionPtrAllocPath, std::ios::out);
    for ( FunctionAssignmentToFunctionMap::iterator it = funAssignmentMap.begin(), 
                                                    eit = funAssignmentMap.end(); 
                                                    it != eit; it++ ){
        for ( std::set<BasicBlock*>::iterator it2 = it->second.begin(), 
                                            eit2 = it->second.end(); 
                                            it2 != eit2; it2++ ){
            funcPtrAllocFile << (*it2)->getParent()->getName().str() 
                            << "|" << PreProcessor::getBasicBlockIndex(*it2)
                          << "->" << it->first->getName().str() << "\n";
            funcPtrAllocFile.flush();
        }
    }
    funcPtrAllocFile.close();
}

void TemporalPass::createFunctionPtrAlloc(SVFModule *svfModule){
    std::set<Function*>& moduleFuncs = PreProcessor::getModuleFuncs();
    std::map<Value*, std::vector<Function*>> globalVarToFuncMap;

    std::set<Value*> checkedGlobals;
    std::set<Value*> visitedNodes;

    /// identify global variables which hold function pointers
    for (SVFModule::global_iterator I = svfModule->global_begin(),  
                                    E = svfModule->global_end(); 
                                    I != E; ++I) {
        GlobalVariable *gvar = *I;

        if (gvar->hasInitializer()) {
            Constant *C = gvar->getInitializer();
            std::vector<Function*> functions;
            checkedGlobals.clear();
            visitedNodes.clear();
            findAllFunctions(C, functions, checkedGlobals);
            for (Function* func: functions) {
                globalVarToFuncMap[gvar].push_back(func);
                addUsers(gvar, func, globalVarToFuncMap, visitedNodes);
            }
        }

    }

    /// find instructions which:
    /// 1) store instruction which takes function address 
    /// 2) uses global var with func ptr
    /// 3) call site which passed function address as an argument
    for ( std::set<Function*>::iterator it = moduleFuncs.begin(),
                                     eit = moduleFuncs.end();
                                     it != eit; ++it){
        Function *fun = *it;

        for ( inst_iterator I = inst_begin(fun), E = inst_end(fun);
                                I != E; ++I ){
            Instruction *inst = &*I;
            if ( SVFUtil::isa<StoreInst>(inst) && isFunctionAssignment(inst) ){
                addFunctionPointerAssignment(fun, inst);
            }

            // If a globalvariable that has a function pointer is
            // accessed, then add all of the functions that it can point
            // to.
            //
            // Very coarse grained right now
            // First handle the geps
            if (GetElementPtrInst* gepInst = SVFUtil::dyn_cast<GetElementPtrInst>(inst)) {
                Value* gepPtrOperand = gepInst->getPointerOperand();
                if (Value* value = SVFUtil::dyn_cast<Value>(gepPtrOperand)) {
                    for (Function* targetFunc: globalVarToFuncMap[value]) {
                        addToFuncAssignmentMap(targetFunc, inst->getParent());
                    }
                }
            }
            // Then the store inst where the address of the globalvariable
            // is stored somewhere
            if (StoreInst* stInst = SVFUtil::dyn_cast<StoreInst>(inst)) {
                if (Value* value = 
                        SVFUtil::dyn_cast<Value>(
                                            stInst->getValueOperand())) {
                    for (Function* targetFunc: globalVarToFuncMap[value]) {
                        addToFuncAssignmentMap(targetFunc, inst->getParent());
                    }
                }
            }

            if (SVFUtil::isa<CallInst>(inst) && 
                    !SVFUtil::isa<DbgInfoIntrinsic>(inst)) {
                CallInst *callInst = SVFUtil::dyn_cast<CallInst>(inst);
                for ( int i = 0; i < callInst->arg_size(); i++ ){
                    Value *arg = callInst->getArgOperand(i);
                    if ( SVFUtil::isa<Function>(arg) )
                        addToFuncAssignmentMap(
                                SVFUtil::dyn_cast<Function>(arg), 
                                            callInst->getParent());
                }
            }
        }
    }
}

void TemporalPass::addUsers(Value *value, Function *func, 
               std::map<Value*, std::vector<Function*>>& globalVarToFuncMap,
               std::set<Value*>& visitedNodes){
    if ( std::find(visitedNodes.begin(), visitedNodes.end(), value) !=
                    visitedNodes.end() )
        return;
    visitedNodes.insert(value);
    for ( auto user: value->users() ){
        if ( SVFUtil::isa<LoadInst>(user) ){
            globalVarToFuncMap[user].push_back(func);
            addUsers(user, func, globalVarToFuncMap, visitedNodes);
        }else if ( SVFUtil::isa<CastInst>(user) ){
            globalVarToFuncMap[user].push_back(func);
            addUsers(user, func, globalVarToFuncMap, visitedNodes);
        }
    }
}

void TemporalPass::findAllFunctions(Value* value, 
                                    std::vector<Function*>& functions, 
                                    std::set<Value*>& checkedGlobals) {
    if (std::find(checkedGlobals.begin(), 
                  checkedGlobals.end(), 
                  value) != checkedGlobals.end())
        return; // we've already processed this in this iteration
    checkedGlobals.insert(value);
    if (Function* func = SVFUtil::dyn_cast<Function>(value))
        functions.push_back(func);
    if (User* userValue = SVFUtil::dyn_cast<User>(value)) {
        for (int i = 0; i < userValue->getNumOperands(); i++) {
            Value* subValue = userValue->getOperand(i);
            findAllFunctions(subValue, functions, checkedGlobals);
        }
    }
}


/*
 * Visit store instruction and add to FP assignment map, if function is being assigned as FP
 */
bool TemporalPass::isFunctionAssignment(Instruction *inst){
    // StoreInst itself should always not be a pointer type
    StoreInst *st = SVFUtil::dyn_cast<llvm::StoreInst>(inst);
    assert(!SVFUtil::isa<PointerType>(st->getType()));
    if (SVFUtil::isa<PointerType>(st->getValueOperand()->getType()) && 
            SVFUtil::isa<llvm::Function>(
                        st->getValueOperand()->stripPointerCasts()))
        return true;
    return false;
}

/*
 * Visit store instruction and add to FP assignment map, if function is being assigned as FP
 */
void TemporalPass::addFunctionPointerAssignment(Function *fun, 
                                                Instruction *inst) {
    // StoreInst itself should always not be a pointer type
    StoreInst *st = SVFUtil::dyn_cast<StoreInst>(inst);
    assert(!SVFUtil::isa<PointerType>(st->getType()));
    if (SVFUtil::isa<PointerType>(st->getValueOperand()->getType()) && 
                SVFUtil::isa<Function>(
                    st->getValueOperand()->stripPointerCasts()) ) {
        Function *targetFunc = SVFUtil::dyn_cast<Function>(
                                    st->getValueOperand()->stripPointerCasts());
        addToFuncAssignmentMap(targetFunc, inst->getParent());
        /*NodeID srcId = getObjectNode(st->getValueOperand());
        if ( srcId && pag->getObject(srcId) && pag->getObject(srcId)->isFunction() ){
            //outs() << "operand is a function\n";
            const llvm::Function *targetFunc = dyn_cast<llvm::Function>(pag->getObject(srcId)->getRefVal());
            pag->addToFuncAssignmentMap(targetFunc, fun);
        }*/
    }
}


