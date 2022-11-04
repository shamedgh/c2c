#include "SVF-FE/LLVMModule.h"
#include "Util/BasicTypes.h"

#ifndef C2CUtil_H_
#define C2CUtil_H_


namespace C2C
{
    static int LEFTCONSTANT = 1;
    static int RIGHTCONSTANT = -1;

    typedef std::pair<llvm::Type*,int> TypeIntPair;

    std::string getValueString(llvm::Value*);

    std::string getTypeString(llvm::Type*);

    std::string getParentFuncName(llvm::CallInst*);

    llvm::Function* getParentFunc(llvm::CallInst*);

    static inline void appendToGlobalVars(
                            std::set<llvm::GlobalVariable*>& globalVarSet,
                            llvm::GlobalVariable* globalVar){
        if ( globalVar == nullptr )
            return;
        globalVarSet.insert(globalVar);
    }

    bool isStructType(const llvm::Value*);

    bool isStructType(llvm::Type*);

    llvm::Type* getBaseType(llvm::Type*);
    
    std::string cleanStructName(std::string);

    llvm::StructType* getBaseStType(llvm::StructType*, 
                                std::map<std::string, llvm::StructType*>&, 
                                bool initialize=false);

    template<typename T>
    bool isInSet(std::set<T>& set, T val) {
        return set.find(val) != set.end();
    }

    template<typename T>
    bool isInUnorderedSet(std::unordered_set<T>& set, T val) {
        return set.find(val) != set.end();
    }

    template<typename T>
    bool isInVector(std::vector<T>& vec, T val) {
        return std::find(vec.begin(), vec.end(), val) != vec.end();
    }

    bool isEqZeroCmp(llvm::CmpInst*);

    bool convertConstExprToStructField(TypeIntPair& structFieldPair,
                     llvm::ConstantExpr* constantExpr,
                     std::map<std::string, llvm::StructType*>& structEqMap);

    bool convertGepToStructField(TypeIntPair& structFieldPair,
                     llvm::GetElementPtrInst* gepInst,
                     std::map<std::string, llvm::StructType*>& structEqMap);

    int getCmpInstOperator(llvm::CmpInst *cmpInst);

    bool isConstant(llvm::Value*);

    bool isIntType(llvm::Value*);

    bool isNullPtr(llvm::Value*);

    bool isConstantInt(llvm::Value*);

    int getIntBitWidth(llvm::Value*);

    int getIntBitWidth(llvm::ConstantInt*);

    const SVF::SVFFunction* findFunctionByName(SVF::SVFModule*, std::string);

    void addListToSet(llvm::cl::list<std::string>&, std::set<std::string>&);

    void addListToUnorderedSet(llvm::cl::list<std::string>&, std::unordered_set<std::string>&);

    void populateStrSetFromFile(std::string, std::set<std::string>&);

    llvm::StructType* convertStructNameToType(llvm::Module*, SVF::SVFModule*, std::string);

    void convertStructNamesToType(llvm::Module *,
                                  SVF::SVFModule*,
                                  std::set<std::string>&, 
                                  std::unordered_set<llvm::StructType*>&);

    void printStructTypeSet(std::set<llvm::StructType*>&);

    void printStructTypeUnorderedSet(std::unordered_set<llvm::StructType*>&);

    void printGlobalVarSet(std::set<llvm::GlobalVariable*>&);

    void convertFuncNamesToFuncPtrs(SVF::SVFModule*,
                                    llvm::cl::list<std::string>&,
                                    std::set<llvm::Function*>&);

    llvm::Instruction* extractFirstInstruction(llvm::Function*);

    llvm::StructType* getStructType(llvm::GlobalVariable *,
                 std::map<std::string, llvm::StructType*>&);

    void splitAggregate(llvm::GlobalVariable*, std::set<llvm::Value*>&);

    llvm::Function *getDirectCallee(llvm::CallInst*);

    bool isLoadFromGlobal(llvm::Value*, llvm::Value*);

    bool isUnionAnon(llvm::Value*);

    void addToStructSet(llvm::StructType*, 
                        std::unordered_set<llvm::StructType*>&,
                        std::unordered_set<llvm::StructType*>&);

    bool matchWithWildcards(std::string,
                         std::unordered_set<std::string>&,
                         bool);

    bool hasEnding (std::string const &, std::string const &);

    bool hasBeginning (std::string const &, std::string const &);
}

#endif
