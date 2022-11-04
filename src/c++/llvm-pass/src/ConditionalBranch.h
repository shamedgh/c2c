#include "Graphs/SVFG.h"
#include "WPA/Andersen.h"
#include "SVF-FE/PAGBuilder.h"
#include "ConfigVariable.h"
#include "PreProcessor.h"
#include "C2CUtils.h"
#include "C2CLog.h"

#ifndef C2CConditionalBranch_H_
#define C2CConditionalBranch_H_

namespace C2C
{

class ConditionalBranch
{

public:
    /// Constructor
    ConditionalBranch(llvm::Instruction* inst_):
                          inst(inst_) {
        if ( SVF::SVFUtil::isa<llvm::BranchInst>(inst) ){
            branchInst = SVF::SVFUtil::dyn_cast<llvm::BranchInst>(inst);
            /// is it a conditional branch?
            if ( branchInst->isConditional() ) {
                llvm::Value *condVal = branchInst->getCondition();
                cmpInst = SVF::SVFUtil::dyn_cast<llvm::CmpInst>(
                                    branchInst->getCondition());
                if ( cmpInst )
                    conditional = true;
                castInst = SVF::SVFUtil::dyn_cast<llvm::CastInst>(
                                    branchInst->getCondition());
                if ( castInst &&
                        isIntType(castInst) &&
                        getIntBitWidth(castInst) ){
                    condValueIsBool = true;
                    conditional = true;
                    constantSide = RIGHTCONSTANT;   /// since comparison is equal, doesn't matter
                }
            }
        }
        if ( SVF::SVFUtil::isa<llvm::SwitchInst>(inst) ){
            switchInst = SVF::SVFUtil::dyn_cast<llvm::SwitchInst>(inst);
            constantSide = RIGHTCONSTANT;   /// since comparison is equal, doesn't matter
            conditional = true;
        }
        /// TODO handle trunc instruction
        ///     example: %19 = trunc i8 %18 to i1
        ///              br i1 %19, label %20, label %35
        
        /// TODO we're making it general with instruction so we can 
        ///      potentially easily add support for switch-case insts
    }

    /// Destructor
    virtual ~ConditionalBranch()
    {
        destroy();
    }

    void destroy(){
        // TODO
    }

    bool isConditional(void) {
        return conditional;
    }

    bool isConfigDep(void){
        return configDep;
    }

    int getCmpInstOp(void){
        if ( switchInst )   /// switch inst operator is always equal
            return 1;
        if ( condValueIsBool )      /// as if the cmp is EQ to 1
            return 1;
        if ( cmpInst == nullptr )
            return -1;
        if ( cmpInst->getPredicate() == llvm::CmpInst::Predicate::ICMP_EQ )
            return 1;
        else if ( cmpInst->getPredicate() == llvm::CmpInst::Predicate::ICMP_NE )
            return (1 << 1);
        else if ( cmpInst->getPredicate() == llvm::CmpInst::Predicate::ICMP_UGT )
            return (1 << 2);
        else if ( cmpInst->getPredicate() == llvm::CmpInst::Predicate::ICMP_UGE )
            return (1 << 3);
        else if ( cmpInst->getPredicate() == llvm::CmpInst::Predicate::ICMP_ULT )
            return (1 << 4);
        else if ( cmpInst->getPredicate() == llvm::CmpInst::Predicate::ICMP_ULE )
            return (1 << 5);
        else if ( cmpInst->getPredicate() == llvm::CmpInst::Predicate::ICMP_SGT )
            return (1 << 6);
        else if ( cmpInst->getPredicate() == llvm::CmpInst::Predicate::ICMP_SGE )
            return (1 << 7);
        else if ( cmpInst->getPredicate() == llvm::CmpInst::Predicate::ICMP_SLT )
            return (1 << 8);
        else if ( cmpInst->getPredicate() == llvm::CmpInst::Predicate::ICMP_SLE )
            return (1 << 9);
        //assert(false && 
        //        "Unsupported cmpInst has been passed to extract operator!");
        C2CLogger(logWARNING) << "Unsupported cmpInst has been passed to extract operator,"
                              << " falling back to used-based cmp\n";
        return -1;
    }

    llvm::CmpInst* getCmpInst(void){
        return cmpInst;
    }

    void setConfigDep(bool value){
        configDep = value;
    }

    void setConditionValue(llvm::Value* value){
        conditionValue = value;
    }

    void setConditionConstantSide(int value){
        constantSide = value;
    }

    void setValueBasedMatching(bool value){
        valueBasedMatching = value;
    }

    llvm::Value* getConditionValue(void){
        return conditionValue;
    }

    int getConditionConstantSide(void){
        return constantSide;
    }

    bool getValueBasedMatching(void){
        return valueBasedMatching;
    }

    /// is condition value a constant ptr null
    bool isConstantPointerNull(void){
        return SVF::SVFUtil::isa<llvm::ConstantPointerNull>(conditionValue);
    }

    llvm::Instruction* getInstruction(void){
        return inst;
    }

    llvm::BasicBlock* getParentBb(void){
        return inst->getParent();
    }

    llvm::Function* getParentFunc(void){
        return getParentBb()->getParent();
    }

    void setConfigVariable(ConfigVariable* configVariable_){
        configVariable = configVariable_;
    }

    ConfigVariable* getConfigVariable(void){
        return configVariable;
    }

    std::string toString(void){
        std::string str = "ConditionalBranch: ";
        str += "funcId: " + 
                to_string(PreProcessor::getFunctionIndex(getParentFunc())) + ", ";
        str += "bbId: " + 
                to_string(PreProcessor::getBasicBlockIndex(getParentBb()));
        return str;
    }

    bool isSwitchBased(void){
        return switchInst != nullptr;
    }

    bool hasBoolConditionValue(void) {
        return condValueIsBool;
    }

private:

    /// parent instruction of this conditional branch
    llvm::Instruction* inst = nullptr;

    /// parent branch instruction of this conditional branch
    llvm::BranchInst* branchInst = nullptr;

    /// parent switch instruction of this conditional branch
    llvm::SwitchInst* switchInst = nullptr;

    /// compare instruction used for this conditional branch
    llvm::CmpInst* cmpInst = nullptr;

    /// if the conditional branch depends on a value being cast to i1
    llvm::CastInst* castInst = nullptr;

    /// is this branch actually conditional?
    bool conditional = false;

    /// does this conditional branch depend on configuration related value
    bool configDep = false;

    /// if the conditional value is a boolean itself, we don't need a cmp inst
    /// because the br can just check the value itself
    /// e.g. bool EnableSSL -> @EnableSSL = dso_local global i8 0
    ///                        %1 = trunc i8 @EnableSSL i1
    ///                        br %1, label %5, %8
    /// if this is true, we will treat the cond branch as if it were comparing the value with 1
    bool condValueIsBool = false;

    /// which config variable does this conditional branch depend on?
    ConfigVariable *configVariable;

    /// config type for this conditional branch is? scalar-var/struct-field/
    ConfigType configType;

    /// which side of the comparison is a constant?
    int constantSide;

    /// condition value - the runtime option will be compared with this value
    llvm::Value* conditionValue = nullptr;

    /// does this conditional branch support value-based matching?
    /// it does NOT if there is complex operations on the compare value 
    /// before the comparison and we cannot reason about it
    bool valueBasedMatching = true;
    
};

}

#endif
