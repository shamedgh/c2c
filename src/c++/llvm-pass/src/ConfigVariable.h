#include "Graphs/SVFG.h"
#include "WPA/Andersen.h"
#include "SVF-FE/PAGBuilder.h"
#include "PreProcessor.h"
#include "C2CUtils.h"

#ifndef C2CConfigVariable_H_
#define C2CConfigVariable_H_

namespace C2C
{

/// define types of config variable (extend if we find new config types)
enum ConfigType {
    SCALAR,
    STRUCTFIELD
};

/// where is the config variable stored? on heap or a global variable
enum MemType {
    UNKNOWN,
    GLOBAL,
    HEAP
};        

/**
 * We will use this class for any configuration variable
 * a variable can be a global scalar variable or a complex
 * struct-field 
*/
class ConfigVariable
{

public:
    /// Constructor
    ConfigVariable(llvm::GlobalVariable* globalVar_):
                          globalVar(globalVar_) {
        configType = SCALAR;
        memType = GLOBAL;
    }

    /// Constructor
    ConfigVariable(TypeIntPair structFieldPair_):
                          structFieldPair(structFieldPair_) {
        configType = STRUCTFIELD;
        memType = UNKNOWN;
    }

    /// Constructor
    ConfigVariable(llvm::GetElementPtrInst* gepInst, 
                    PreProcessor* preProcessor) {
        convertGepToStructField(structFieldPair, gepInst,
                                preProcessor->getStructEqMap());
        configType = STRUCTFIELD;
        memType = UNKNOWN;
    }

    /// Destructor
    virtual ~ConfigVariable()
    {
        destroy();
    }

    void destroy(){
        // TODO
    }

    bool isScalarType(void) const {
        return configType == SCALAR;
    }

    bool isStructFieldType(void) const {
        return configType == STRUCTFIELD;
    }

    bool isHeapBased(void) const {
        return memType == HEAP;
    }

    bool isGlobalBased(void) const {
        return memType == GLOBAL;
    }

    //void setMemType(MemType memType_){
    //    memType = memType_;
    //}

    bool operator==(const ConfigVariable& other) const
    {
        // TODO are we comparing the right things?
        if ( this->globalVar == nullptr && 
                other.globalVar != nullptr )
            return false;
        else if ( this->globalVar != nullptr && 
                other.globalVar == nullptr )
            return false;
        else if ( this->globalVar != nullptr &&
                other.globalVar != nullptr ){
            /// both are of global scalar variable type
            return this->globalVar == other.globalVar;
        }else {
            /// both are of struct-field type
            return this->structFieldPair.first == other.structFieldPair.first && 
                    this->structFieldPair.second == other.structFieldPair.second;
        }
        //if ( *(this->globalVar) == *(otherConfigVariable.globalVariable) )
        //TODO
//    if (this->row == otherPos.row && this->col == otherPos.col) return true;
//    else return false;
        return false;
    }

    struct HashFunction
    {
        size_t operator()(const ConfigVariable& configVariable) const
        {
            size_t hashVal = 0;
            if ( configVariable.globalVar != nullptr ) {
                hashVal += std::hash<llvm::GlobalVariable*>()(
                                    configVariable.globalVar);
            } else {
                hashVal = std::hash<llvm::Type*>()((llvm::Type*)
                                    configVariable.structFieldPair.first)
                          ^ (std::hash<int>()(configVariable.structFieldPair.second) << 1);
            }
            return hashVal;
        }
    };
    //size_t rowHash = std::hash<int>()(pos.row);
    //  size_t colHash = std::hash<int>()(pos.col) << 1;
    //  return rowHash ^ colHash;
    //}
  //};

    llvm::StructType* getStructType(void) const{
        assert ( configType == STRUCTFIELD && 
                    "getStructType called for non-STRUCT based config variable");
        return (llvm::StructType*)structFieldPair.first;
    }

    int getStructField(void) const{
        assert ( configType == STRUCTFIELD && 
                    "getStructField called for non-STRUCT based config variable");
        return structFieldPair.second;
    }

    std::string toString(void) const{
        std::string str = "ConfigVariable: ";
        if ( configType == SCALAR ){
            str += "type: Scalar, ";
            str += "global var: " + getValueString(globalVar);
        }else if ( configType == STRUCTFIELD ){
            str += "type: StructField, ";
            str += "structType: " + getStructType()->getStructName().str() + ", ";
            str += "fieldIndex: " + to_string(getStructField());
        }
        
        return str;
    }

    void setMemType(MemType memType_){
        memType = memType_;
    }

    void setIndCall(llvm::CallInst* callInst_) {
        callInst = callInst_;
    }

    bool hasIndCall(void) const {
        return callInst != nullptr;
    }

private:

    /// parent instruction of this conditional branch
    llvm::GlobalVariable* globalVar = nullptr;

    /// a pair representing the struct type and field this config variable is stored in
    TypeIntPair structFieldPair;

    /// which config type is this configVariable instance
    ConfigType configType;

    /// where is this config variable stored?
    /// TODO unlike the rest of the fields, we're not extracting this when 
    ///      we're identifying the conditional branches which depend on it
    ///      we should fix our conditional branch identification to extract
    ///      this information as well
    MemType memType = UNKNOWN;

    /// if this config variable is initialized by any indirect call, we'll keep it here for stats
    llvm::CallInst* callInst = nullptr;
};

}

#endif
