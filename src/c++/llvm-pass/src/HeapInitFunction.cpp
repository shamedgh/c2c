#include "Graphs/ICFG.h"
#include "Util/ExtAPI.h"
#include "llvm/IR/InstIterator.h"
#include "C2CUtils.h"
#include "PreProcessor.h"
#include "HeapInitFunction.h"
#include "C2CLog.h"

using namespace llvm;
using namespace SVF;
using namespace C2C;

void HeapInitFunction::evaluate(void){
    if ( funcType == RET )
        evaluateRetBased();
    else if ( funcType == ARG )
        evaluateArgBased();
}

void HeapInitFunction::evaluateArgBased(void){
    std::unordered_set<Value*> visitedNodes;
    if ( SVFUtil::isa<CastInst>(memValue) )
        parseCastInst(SVFUtil::dyn_cast<CastInst>(memValue), 
                      nullptr, 
                      false,
                      visitedNodes);
    else if ( SVFUtil::isa<StoreInst>(memValue) )
        parseStoreInst(SVFUtil::dyn_cast<StoreInst>(memValue), 
                       nullptr, 
                       false,
                       visitedNodes);
}

void HeapInitFunction::evaluateRetBased(void){
    std::unordered_set<Value*> visitedNodes;
    for ( auto user: memValue->users() ){
        if ( SVFUtil::isa<CastInst>(user) )
            parseCastInst(SVFUtil::dyn_cast<CastInst>(user), 
                          memValue, 
                          true,
                          visitedNodes);
        else if ( SVFUtil::isa<StoreInst>(user) )
            parseStoreInst(SVFUtil::dyn_cast<StoreInst>(user), 
                           memValue, 
                           true,
                           visitedNodes);
    }
}

void HeapInitFunction::parseCastInst(CastInst *castInst, 
                                     Value *prevVal, 
                                     bool forward,
                                      std::unordered_set<Value*>& visitedNodes) {
    if ( visitedNodes.find(castInst) != visitedNodes.end() )
        return;
    visitedNodes.insert(castInst);
    std::unordered_set<StructType*> visitedStructs;
    Type *dstType = castInst->getDestTy();
    dstType = getBaseType(dstType);
    Type *srcType = castInst->getSrcTy();
    srcType = getBaseType(srcType);
    if ( forward && SVFUtil::isa<StructType>(dstType) )
        parseStruct(SVFUtil::dyn_cast<StructType>(dstType), visitedStructs);
    if ( !forward && SVFUtil::isa<StructType>(srcType) )
        parseStruct(SVFUtil::dyn_cast<StructType>(srcType), visitedStructs);
}


void HeapInitFunction::parseStoreInst(StoreInst *storeInst, 
                                      Value *prevVal, 
                                      bool forward, 
                                      std::unordered_set<Value*>& visitedNodes) {
    if ( visitedNodes.find(storeInst) != visitedNodes.end() )
        return;
    visitedNodes.insert(storeInst);
    std::unordered_set<StructType*> visitedStructs;
    Type *ptrType = storeInst->getPointerOperandType();
    ptrType = getBaseType(ptrType);
    Type *valueType = storeInst->getValueOperand()->getType();
    valueType = getBaseType(valueType);
    if ( forward && SVFUtil::isa<StructType>(ptrType) )
        parseStruct(SVFUtil::dyn_cast<StructType>(ptrType), visitedStructs);
    if ( !forward && SVFUtil::isa<StructType>(valueType) )
        parseStruct(SVFUtil::dyn_cast<StructType>(valueType), visitedStructs);
}

void HeapInitFunction::parseStruct(StructType *stType, 
                                    std::unordered_set<StructType*>& visitedNodes) {
    stType = getBaseStType(stType, PreProcessor::getStructEqMap());
    if ( visitedNodes.find(stType) != visitedNodes.end() )
        return;

    visitedNodes.insert(stType);

    if ( preProcessor->isConfigStruct(stType) )
         stTypes.insert(stType);
    for ( int i = 0; i < stType->getNumElements(); i++ ) {
        Type *elementType = stType->getElementType(i);
        if ( SVFUtil::isa<StructType>(elementType) )
            parseStruct(SVFUtil::dyn_cast<StructType>(elementType),
                            visitedNodes);
    }
}
