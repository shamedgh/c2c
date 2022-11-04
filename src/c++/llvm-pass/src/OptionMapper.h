#include "Graphs/SVFG.h"
#include "WPA/Andersen.h"
#include "SVF-FE/PAGBuilder.h"
#include "C2CUtils.h"

#ifndef C2COptionMapper_H_
#define C2COptionMapper_H_

namespace C2C
{

class OptionMapper
{

public:
    /// Constructor
    OptionMapper(llvm::Value* value_):
                          value(value_) {
    }

    /// Destructor
    virtual ~OptionMapper()
    {
        destroy();
    }

    void destroy(){
        // TODO
    }

    void parse(void);

    llvm::Value* extractField(int);

private:

    /// parent value this OptionMapper instance is representing
    llvm::Value* value;

    /// parse global variable for option mapper fields
    void parseGlobalVariable(void);

    /// parse constant for option mapper fields
    void parseConstant(void);

    /// parse callsite
    void parseCallInst(void);

    /// fields of option mapper struct/callsite
    std::vector<llvm::Value*> fields;
};

}

#endif
