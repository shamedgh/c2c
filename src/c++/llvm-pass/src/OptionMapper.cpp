#include "Graphs/ICFG.h"
#include "Util/ExtAPI.h"
#include "llvm/IR/InstIterator.h"
#include "C2CUtils.h"
#include "PreProcessor.h"
#include "OptionMapper.h"
#include "C2CLog.h"

using namespace llvm;
using namespace SVF;
using namespace C2C;

void OptionMapper::parse(void){
    value = value->stripPointerCasts();
    if ( SVFUtil::isa<Constant>(value) )
        parseConstant();
    else if ( SVFUtil::isa<GlobalVariable>(value) )
        parseGlobalVariable();
    else if ( SVFUtil::isa<CallInst>(value) )
        parseCallInst();
}

/*
 * at this point we assume that the constant is of a struct type
 * we might have to add other settings? TODO
*/
void OptionMapper::parseConstant(void){
    llvm::Function *configFunction = NULL;
    llvm::StringRef *configNameStr = NULL;

    Constant *constant = SVFUtil::dyn_cast<Constant>(value);
    if ( !constant )
        return;

    if ( !getBaseType(constant->getType())->isStructTy() )
        return;     // TODO do we need to handle this?

    StructType *structType = SVFUtil::dyn_cast<StructType>(
                                        getBaseType(constant->getType()));
    structType = getBaseStType(structType, PreProcessor::getStructEqMap());

    for (int i = 0; i < structType->getNumElements(); i++) {
        Constant *innerConstant = constant->getAggregateElement(i);
        if ( isUnionAnon(innerConstant) )
            innerConstant = innerConstant->getAggregateElement(int(0));
        fields.push_back(innerConstant->stripPointerCasts());
    }
}

void OptionMapper::parseGlobalVariable(void){
    
}

void OptionMapper::parseCallInst(void){
    CallInst *callInst = SVFUtil::dyn_cast<CallInst>(value);
    assert(callInst && "parseCallInst called with non-callInst!");
    for ( int i = 0; i < callInst->arg_size(); i++ )
        fields.push_back(callInst->getArgOperand(i));
}

/*
*/
Value* OptionMapper::extractField(int fieldIndex){
    assert( fieldIndex < fields.size() &&
                "extractField must be passed a field index within bounds of vector!");
    return fields[fieldIndex]->stripPointerCasts();
}
