import os, sys, subprocess, signal
import logging
import optparse


def isValidOpts(opts):
    """
    Check if the required options are sane to be accepted
        - Check if the provided files exist
        - Check if two sections (additional data) exist
        - Read all target libraries to be debloated from the provided list
    :param opts:
    :return:
    """
    if ( not options.enabledconditions and not options.enabledfunctions) or not options.funcidtoname or not options.output:
        parser.error("All arguments (--enabledconditions or --enabledfunctions), --funcidtoname and --output should be provided")
        return False

    return True


def setLogPath(logPath):
    """
    Set the property of the logger: path, config, and format
    :param logPath:
    :return:
    """
    if os.path.exists(logPath):
        os.remove(logPath)

    rootLogger = logging.getLogger("coverage")
    if options.debug:
        logging.basicConfig(filename=logPath, level=logging.DEBUG)
        rootLogger.setLevel(logging.DEBUG)
    else:
        logging.basicConfig(filename=logPath, level=logging.INFO)
        rootLogger.setLevel(logging.INFO)

#    ch = logging.StreamHandler(sys.stdout)
    consoleHandler = logging.StreamHandler()
    rootLogger.addHandler(consoleHandler)
    return rootLogger
#    rootLogger.addHandler(ch)

if __name__ == '__main__':
    """
    Find system calls for function
    """
    usage = "Usage: %prog -c <Callgraph> -s <Separator in callgraph file llvm=-> glibc=: > -f <Function name>"

    parser = optparse.OptionParser(usage=usage, version="1")


    ### General Options ###
    parser.add_option("", "--enabledconditions", dest="enabledconditions", default=None, nargs=1,
                      help="File with enabled and disabled conditions from dynamic analysis with func Id")

    parser.add_option("", "--enabledfunctions", dest="enabledfunctions", default=None, nargs=1,
                      help="File with enabled functions executed from dynamic analysis with func Id")

    parser.add_option("", "--funcidtoname", dest="funcidtoname", default=None, nargs=1,
                      help="File with mapping between function id and name")

    parser.add_option("", "--output", dest="output", default=None, nargs=1,
                      help="Output file path")

    parser.add_option("-d", "--debug", dest="debug", action="store_true", default=False,
                      help="Debug enabled/disabled")

    (options, args) = parser.parse_args()
    if isValidOpts(options):
        rootLogger = setLogPath("convertfuncidtoname.log")

        outputFile = open(options.output, 'w')

        funcIdToNameMap = dict()

        funcIdToNameFile = open(options.funcidtoname, 'r')
        inputLine = funcIdToNameFile.readline()
        while ( inputLine ):
            #function name: checkConditionInt16 id: 0
            inputLine = inputLine.strip()
            if ( inputLine.startswith("function name: ") ):
                splittedInput = inputLine.split()
                funcIdToNameMap[splittedInput[4]] = splittedInput[2]
            inputLine = funcIdToNameFile.readline()

        if ( options.enabledconditions ):
            conditionFile = open(options.enabledconditions, 'r')
            inputLine = conditionFile.readline()
            while ( inputLine ):
                #5533|0-C:ISDISABLED
                inputLine = inputLine.strip()
                rootLogger.debug("inputLine: %s\n", inputLine)
                if ( "-S-T->" in inputLine and "-S-T->Default" not in inputLine ):
                    sep = "-S-T->"
                    caller = inputLine.split(sep)[0]
                    funcId = caller[0:caller.index('|')]
                    caller = caller[caller.index('|'):]
                    caller = funcIdToNameMap[funcId] + caller

                    callee = inputLine.split(sep)[1]
                    funcId = callee[0:callee.index('|')]
                    callee = callee[callee.index('|'):]
                    callee = funcIdToNameMap[funcId] + callee
                    
                    outputFile.write(caller + sep + callee + "\n")
                    outputFile.flush()
                elif ( inputLine.index('|') != -1 ):
                    funcId = inputLine[0:inputLine.index('|')]
                    inputLine = inputLine[inputLine.index('|'):]
                    inputLine = funcIdToNameMap[funcId] + inputLine
                    outputFile.write(inputLine + "\n")
                    outputFile.flush()
    
                inputLine = conditionFile.readline()

            funcIdToNameFile.close()
            conditionFile.close()
            outputFile.close()

        if ( options.enabledfunctions ):
            if ( not os.path.exists(options.enabledfunctions) ):
                funcIdToNameFile.close()
                outputFile.close()
                sys.exit(0)
            functionFile = open(options.enabledfunctions, 'r')
            inputLine = functionFile.readline()
            while ( inputLine ):
                #5533|0-C:ISDISABLED
                inputLine = inputLine.strip()
                rootLogger.debug("inputLine: %s\n", inputLine)
                funcId = inputLine
                funcName = funcIdToNameMap[funcId]
                outputFile.write(funcName + "\n")
                outputFile.flush()

                inputLine = functionFile.readline()
            outputFile.close()
            functionFile.close()
            funcIdToNameFile.close()
