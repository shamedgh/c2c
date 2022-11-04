#include <iostream>
#include <sstream>
#include "llvm/Support/raw_ostream.h"

#ifndef C2CLogging_H_
#define C2CLogging_H_

namespace C2C
{

enum LogLevel
    {logERROR, logWARNING, logINFO, logDEBUG}; 

class C2CLog
{

public:
    C2CLog(LogLevel logLevel = logERROR) {
    }

    template <typename T>
    C2CLog & operator<<(T const & value)
    {
        buffer << value;
        return *this;
    }

    ~C2CLog()
    {
        //std::cerr << buffer.str();
    }

private:
    //std::ostringstream buffer;
    std::string bufferStr;
//    llvm::raw_string_ostream buffer(bufferStr);
    llvm::raw_ostream &buffer = llvm::outs();
};

extern LogLevel logLevel;

#define C2CLogger(level) \
if (level > logLevel) ; \
else C2CLog(level)

}

#endif
