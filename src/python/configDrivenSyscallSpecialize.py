"""
Extract the syscalls for each process

"""
import logging
import os
import sys
import json

sys.path.insert(0, './python-utils/')

import util
import graph
import binaryAnalysis
import bitcodeAnalysis
import syscall

sys.path.insert(0, './library-debloating')
import piecewise
import re
import optparse

def clean(libName, logger):
    logger.debug("cleanLib libName input: %s", libName)
    if ( ".so" in libName ):
        libName = re.sub("-.*so",".so",libName)
        libName = libName[:libName.index(".so")]
        #libName = libName + ".so"
    logger.debug("cleanLib libName output: %s", libName)
    return libName    

def isValidOpts(opts):
    """
    Check if the required options are sane to be accepted
        - Check if the provided files exist
        - Check if two sections (additional data) exist
        - Read all target libraries to be debloated from the provided list
    :param opts:
    :return:
    """
    if not options.cfginput or not options.othercfgpath or not options.apptopropertymap or not options.binpath or not options.cfgpath or not options.outputpath or not options.apptolibmap or not options.sensitivesyscalls or not options.sensitivestatspath or not options.syscallreductionpath or not options.sizereductionpath:
        parser.error("All options -c, --othercfgpath, --apptopropertymap, --binpath, --outputpath, --apptolibmap, --sensitivesyscalls, --sensitivestatspath, --syscallreductionpath, --sizereductionpath and --cfgpath should be provided.")
        return False

    return True

def getSize(binbasepath, bininput, appNameWSuffix, visitedFuncPerLibraryDict, bitcodeFolderPath, logger):
    #### Extract total size of visited functions ####
    libToPath = util.readLibrariesWithLdd(binbasepath + "/" + bininput + "/" + appNameWSuffix)      #We need the path in the /lib for dpkg
    logger.debug("libToPath: %s", str(libToPath))
    totalSize = 0
    totalFuncCount = 0
    findCmd = "find {} -name {}*.so.*"
    libFolderPath = binbasepath + "/" + bininput + "/" 
    for libName, funcSet in visitedFuncPerLibraryDict.items():
        rootLogger.debug("Extracting size for libName: %s with funcSet size: %d", libName, len(funcSet))
        totalFuncCount += len(funcSet)
        libPath = libToPath.get(libName, None)
        currSize = -1
        if ( os.path.exists(libPath) ):
            binAnalysisObj = binaryAnalysis.BinaryAnalysis(libPath, rootLogger)
            currSize = binAnalysisObj.getTotalSize(funcSet)
        rootLogger.debug("trying to retrieve size for library: %s returned: %d", libName, currSize)
        if ( currSize == -1 and bitcodeFolderPath ):
            #extracting symbols failed through installing package, falling back to bitcode compilation
            findCmd = "find {} -name {}*.precodegen.bc"
            findCmdFull = findCmd.format(bitcodeFolderPath, libName)
            rootLogger.debug("Extracting debug symbols failed, trying to generate object file using llc with cmd: %s", findCmdFull)
            returncode, out, err = util.runCommand(findCmdFull)
            if ( returncode != 0 and returncode != 1 ):
                rootLogger.debug("Problem running command: %s", findCmdFull)
                rootLogger.debug("Problem: %s", err)
                sys.exit(-1)
            rootLogger.debug("find bitcode returned: %s", out)
            splittedOut = out.split("\n")
            for line in splittedOut:
                if ( line != "" ):
                    rootLogger.debug("line: %s", line)
                    bitcodeName = line[line.rindex("/")+1:]
                    cleanedLibName = clean(bitcodeName, rootLogger)
                    if ( libName == cleanedLibName ):
                        rootLogger.debug("running llc for bitcode: %s for libName: %s", bitcodeName, cleanedLibName )
                        bitcodePath = line.strip()
                        bitcodeAnalysisObj = bitcodeAnalysis.BitcodeAnalysis(bitcodePath, rootLogger)
                        libTmpPath = "/tmp/tmplib.o"
                        objCreated = bitcodeAnalysisObj.convertToObj(libTmpPath)
                        if ( objCreated != -1 ):
                            binAnalysisObj = binaryAnalysis.BinaryAnalysis(libTmpPath, rootLogger)
                            currSize = binAnalysisObj.getTotalSize(funcSet)
                            if ( currSize != -1 ):
                                rootLogger.debug("currSize for library: %s:%d funcset: %d", libName, currSize, len(funcSet))
                                totalSize += currSize
                            else:
                                rootLogger.debug("Giving up extracting function size for %s", libName)

        elif ( currSize == -1 ):
            rootLogger.debug("Extracting debug symbols failed, no bitcode path specified, cannot retrieve size for library: %s", libName)
        else:
            currSize = binAnalysisObj.getTotalSize(funcSet)
            rootLogger.debug("currSize for library: %s:%d funcSet: %d", libName, currSize, len(funcSet))
            totalSize += currSize
    rootLogger.debug("size before adding library/binary: %d", totalSize)
    binAnalysisObj = binaryAnalysis.BinaryAnalysis(binbasepath + "/" + bininput + "/" + appNameWSuffix, rootLogger)
    totalSize += binAnalysisObj.getTotalSize(binaryVisitedFuncs)
    rootLogger.debug("final total size: %d", totalSize)
    rootLogger.debug("final library count: %d", len(visitedFuncPerLibraryDict.keys()))
    return (totalSize, totalFuncCount) #len(visitedFuncPerLibraryDict.keys()))

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

if __name__ == "__main__":

    """
    Find system calls for function
    """
    usage = "Usage: %prog -f <Target program cfg> -c <glibc callgraph file>"

    parser = optparse.OptionParser(usage=usage, version="1")

    parser.add_option("-c", "--cfginput", dest="cfginput", default=None, nargs=1,
                      help="Libc CFG input for creating graph from CFG")

    parser.add_option("", "--cfginputseparator", dest="cfginputseparator", default=":", nargs=1,
                      help="Libc CFG separator")

    parser.add_option("", "--apptopropertymap", dest="apptopropertymap", default=None, nargs=1,
                      help="File containing application to property mapping")

    parser.add_option("", "--binpath", dest="binpath", default=None, nargs=1,
                      help="Path to binary folders")

    parser.add_option("", "--cfgpath", dest="cfgpath", default=None, nargs=1,
                      help="Path to call function graphs")

    parser.add_option("", "--othercfgpath", dest="othercfgpath", default=None, nargs=1,
                      help="Path to other call graphs")

    parser.add_option("", "--outputpath", dest="outputpath", default=None, nargs=1,
                      help="Path to output folder")

    parser.add_option("", "--apptolibmap", dest="apptolibmap", default=None, nargs=1,
                      help="JSON containing app to library mapping")

    parser.add_option("", "--sensitivesyscalls", dest="sensitivesyscalls", default=None, nargs=1,
                      help="File containing list of sensitive system calls considered for stats")

    parser.add_option("", "--sensitivestatspath", dest="sensitivestatspath", default=None, nargs=1,
                      help="Path to file to store sensitive syscall stats")

    parser.add_option("", "--syscallreductionpath", dest="syscallreductionpath", default=None, nargs=1,
                      help="Path to file to store system call reduction stats")

    parser.add_option("", "--sizereductionpath", dest="sizereductionpath", default=None, nargs=1,
                      help="Path to file to store size reduction stats")

    parser.add_option("", "--bitcodepath", dest="bitcodepath", default=None, nargs=1,
                      help="Path to find bitcodes")

    parser.add_option("", "--libcfunctobbpath", dest="libcfunctobbpath", default=None, nargs=1,
                      help="Path to libc functions to basic block count")

    parser.add_option("", "--singleappname", dest="singleappname", default=None, nargs=1,
                      help="Name of single application to run, if passed the enable/disable in the JSON file will not be considered")

    parser.add_option("", "--onlybb", dest="onlybb", action="store_true", default=False,
                      help="Run for only BB mode and return denylist")

    parser.add_option("-d", "--debug", dest="debug", action="store_true", default=False,
                      help="Debug enabled/disabled")

    (options, args) = parser.parse_args()
    if isValidOpts(options):
        rootLogger = setLogPath("configdrivenspecialization.log")
        try:
            appToPropertyFile = open(options.apptopropertymap, 'r')
            appToPropertyStr = appToPropertyFile.read()
            appToPropertyMap = json.loads(appToPropertyStr)
        except Exception as e:
            rootLogger.warning("Trying to load app to property map json from: %s, but doesn't exist: %s", options.apptopropertymap, str(e))
            rootLogger.debug("Finished loading json")
            sys.exit(-1)

        sensitiveSyscallSet = set()

        sensitiveSyscallFile = open(options.sensitivesyscalls, 'r')
        sensitiveSyscallLine = sensitiveSyscallFile.readline()
        while ( sensitiveSyscallLine ):
            sensitiveSyscallSet.add(sensitiveSyscallLine.strip())
            sensitiveSyscallLine = sensitiveSyscallFile.readline()

        sensitiveSyscallOutfile = open(options.sensitivestatspath, 'w')
        syscallReductionFile = open(options.syscallreductionpath, 'w')
        sizeReductionFile = open(options.sizereductionpath, 'w')
        syscallDiffFile = open(options.outputpath + "/syscall.diffs", 'w')
        sensitiveSyscallStatLine = "{};{};{};{}\n"
        #syscallReductionStatLine = "{};{};{};{}\n"
        #sizeReductionStatLine = "{};{};{};{};{};{};{};{};{}\n"
        syscallReductionStatLine = "{};{};{};{};{};{};{}\n"
        sizeReductionStatLine = "{};{};{};{};{};{};{}\n"

        syscallTranslator = syscall.Syscall(rootLogger)
        syscallMap = syscallTranslator.createMap()

        cfginput = options.cfginput
        binbasepath = options.binpath
        if ( binbasepath.endswith("/") ):
            binbasepath = binbasepath[:-1]
        cfgbasepath = options.cfgpath
        outputbasepath = options.outputpath
        binprofiler = True

        syscallReductionFile.write(syscallReductionStatLine.format("Application", "# Piecewise Master", "# Piecewise Worker", "# Temporal Master Syscalls", "# Temporal Worker Syscalls", "# C2C Master", "# C2C Worker"))
        syscallReductionFile.flush()

        sizeReductionFile.write(sizeReductionStatLine.format("App","Piecewise Master", "Piecewise Worker", "Temp Master", "Temp Worker", "Config Bb Master", "Config Bb Worker"))
        sizeReductionFile.flush()

        libSecEvalOutputFilePath = appToPropertyMap.get("sec-eval-lib-output", None)
        temporalSecEvalOutputFilePath = appToPropertyMap.get("sec-eval-temporal-output", None)
        conditionalSecEvalOutputFilePath = appToPropertyMap.get("sec-eval-conditional-output", None)
        libSecEvalOutputFile = open(libSecEvalOutputFilePath, 'w')
        temporalSecEvalOutputFile = open(temporalSecEvalOutputFilePath, 'w')
        conditionalSecEvalOutputFile = open(conditionalSecEvalOutputFilePath, 'w')

        for app in appToPropertyMap["apps"]:
            for appName, appDict in app.items():
                if ( (not options.singleappname and appDict.get("enable","true") == "true") or (options.singleappname and appName == options.singleappname) ):
                    rootLogger.info("Extracting system calls for %s", appName)
                    sizeDict = dict()
                    funcCountDict = dict()
                    mastermain = appDict.get("master", None)
                    workermain = appDict.get("worker", None)
                    bininput = appDict.get("bininput", None)
                    appNameSuffix = appDict.get("appname.suffix", None)
                    output = appDict.get("output", None)
                    output = outputbasepath + "/" + output
                    targetcfg = appDict.get("cfg", None)
                    if ( targetcfg ):
                        svftargetcfg = targetcfg.get("svf", None)
                        temporaltargetcfg = targetcfg.get("svftypefp", None)
                        conditionaltargetcfgMod = targetcfg.get("svftypeconditional.mod", None)
                        conditionaltargetcfgBb = targetcfg.get("svftypeconditional.bb", None)
                        #targetcfg = targetcfg.get("svftypefp", None)

                    if ( options.onlybb or not os.path.exists(output) ):
                        rootLogger.info("%s doesn't exist, generating first", output)
                        # The call graph for the following libraries have been created with the application
                        # No need to consider their call graph again
                        aprRelatedList = ["libaprutil-1", "libapr-1"]
                        uvRelatedList = ["libuv"]
                        eventRelatedList = ["libevent-2"]
                        #nginxRelatedList = ["libssl", "libcrypto", "libz"]

                        exceptList = list()
                        exceptList.extend(aprRelatedList)
                        exceptList.extend(uvRelatedList)
                        exceptList.extend(eventRelatedList)

                        # Generate list for main function and worker functions (in case there are multiple)
                        startFuncsStr = workermain
                        workerMainList = set()
                        if ( "," in startFuncsStr ):
                            workerMainList = set(startFuncsStr.split(","))
                        else:
                            workerMainList.add(startFuncsStr)
                        startFuncsStr = mastermain
                        masterMainList = set()
                        if ( "," in startFuncsStr ):
                            masterMainList = set(startFuncsStr.split(","))
                        else:
                            masterMainList.add(startFuncsStr)

                        masterMainListWPrefix = set()
                        for masterFunc in masterMainList:
                            if ( masterFunc != "main" ):
                                masterFunc = appName + "." + masterFunc
                            masterMainListWPrefix.add(masterFunc)

                        workerMainListWPrefix = set()
                        for workerFunc in workerMainList:
                            if ( workerFunc != "main" ):
                                workerFunc = appName + "." + workerFunc
                            workerMainListWPrefix.add(workerFunc)

                        if ( not options.onlybb ):
                            piecewiseObj = piecewise.Piecewise(binbasepath + "/" + bininput + "/" + appName, cfgbasepath + "/" + svftargetcfg, cfginput, options.othercfgpath, rootLogger, options.cfginputseparator)
                            piecewiseMasterSyscalls, visitedFuncPerLibraryDict, binaryVisitedFuncs = piecewiseObj.extractAccessibleSystemCalls(masterMainListWPrefix, exceptList)
                            rootLogger.info("Finished extracting piecewise master system calls with len: %d for %s", len(piecewiseMasterSyscalls), appName)
                            sizeDict["piecewiseMaster"], funcCountDict["piecewiseMaster"] = getSize(binbasepath, bininput, appName, visitedFuncPerLibraryDict, options.bitcodepath, rootLogger)
                            funcCountDict["piecewiseMaster"] += len(binaryVisitedFuncs)
                            if ( mastermain == workermain ):
                                piecewiseWorkerSyscalls = piecewiseMasterSyscalls
                                sizeDict["piecewiseWorker"] = sizeDict["piecewiseMaster"]
                                funcCountDict["piecewiseWorker"] = funcCountDict["piecewiseMaster"]
                            else:
                                piecewiseWorkerSyscalls, visitedFuncPerLibraryDict, binaryVisitedFuncs = piecewiseObj.extractAccessibleSystemCalls(workerMainListWPrefix, exceptList)
                                sizeDict["piecewiseWorker"], funcCountDict["piecewiseWorker"] = getSize(binbasepath, bininput, appName, visitedFuncPerLibraryDict, options.bitcodepath, rootLogger)
                                funcCountDict["piecewiseWorker"] += len(binaryVisitedFuncs)
                            rootLogger.info("Finished extracting piecewise worker system calls with len: %d for %s", len(piecewiseWorkerSyscalls), appName)

                            temporalObj = piecewise.Piecewise(binbasepath + "/" + bininput + "/" + appName, cfgbasepath + "/" + temporaltargetcfg, cfginput, options.othercfgpath, rootLogger, options.cfginputseparator)
                            temporalMasterSyscalls, visitedFuncPerLibraryDict, binaryVisitedFuncs = temporalObj.extractAccessibleSystemCalls(masterMainListWPrefix, exceptList)
                            sizeDict["temporalMaster"], funcCountDict["temporalMaster"] = getSize(binbasepath, bininput, appName, visitedFuncPerLibraryDict, options.bitcodepath, rootLogger)
                            funcCountDict["temporalMaster"] += len(binaryVisitedFuncs)
                            rootLogger.info("Finished extracting temporal master system calls with len: %d for %s", len(temporalMasterSyscalls), appName)
                            if ( mastermain == workermain ):
                                temporalWorkerSyscalls = temporalMasterSyscalls
                                sizeDict["temporalWorker"] = sizeDict["temporalMaster"]
                                funcCountDict["temporalWorker"] = funcCountDict["temporalMaster"]
                            else:
                                temporalWorkerSyscalls, visitedFuncPerLibraryDict, binaryVisitedFuncs = temporalObj.extractAccessibleSystemCalls(workerMainListWPrefix, exceptList)
                                sizeDict["temporalWorker"], funcCountDict["temporalWorker"] = getSize(binbasepath, bininput, appName, visitedFuncPerLibraryDict, options.bitcodepath, rootLogger)
                                funcCountDict["temporalWorker"] += len(binaryVisitedFuncs)
                            rootLogger.info("Finished extracting temporal worker system calls with len: %d for %s", len(temporalWorkerSyscalls), appName)

                        appNameWSuffix = appName
                        if ( appNameSuffix ):
                            appNameWSuffix = appName + appNameSuffix

                        if ( not options.onlybb ):
                            masterMainListWPrefix = set()
                            for masterFunc in masterMainList:
                                if ( masterFunc != "main" ):
                                    masterFunc = appNameWSuffix + "." + masterFunc
                                masterMainListWPrefix.add(masterFunc)
                        workerMainListWPrefix = set()
                        for workerFunc in workerMainList:
                            if ( workerFunc != "main" ):
                                workerFunc = appNameWSuffix + "." + workerFunc
                                rootLogger.debug("workerFunc w. Suffix: %s", workerFunc)
                            workerMainListWPrefix.add(workerFunc)
                        ''' disable module debloating '''
                        #conditionalModObj = piecewise.Piecewise(binbasepath + "/" + bininput + "/" + appNameWSuffix, cfgbasepath + "/" + conditionaltargetcfgMod, cfginput, options.othercfgpath, rootLogger, options.cfginputseparator)

                        conditionalModMasterSyscalls = set()
                        conditionalModWorkerSyscalls = set()
                        #    conditionalModMasterSyscalls, visitedFuncPerLibraryDict, binaryVisitedFuncs = conditionalModObj.extractAccessibleSystemCalls(masterMainListWPrefix, exceptList)
                        #    sizeDict["conditionalModMaster"], funcCountDict["conditionalModMaster"] = getSize(binbasepath, bininput, appNameWSuffix, visitedFuncPerLibraryDict, options.bitcodepath, rootLogger)
                        #    funcCountDict["conditionalModMaster"] += len(binaryVisitedFuncs)
                        #    rootLogger.info("Finished extracting conditional(Mod) master system calls with len: %d for %s", len(conditionalModMasterSyscalls), appName)
                        #workerMainListWPrefix = set()
                        #for workerFunc in workerMainList:
                        #    if ( workerFunc != "main" ):
                        #        workerFunc = appNameWSuffix + "." + workerFunc
                        #        rootLogger.debug("workerFunc w. Suffix: %s", workerFunc)
                        #    workerMainListWPrefix.add(workerFunc)

                        #if ( not options.onlybb ):
                        #    if ( mastermain == workermain ):
                        #        conditionalModWorkerSyscalls = conditionalModMasterSyscalls
                        #        sizeDict["conditionalModWorker"] = sizeDict["conditionalModMaster"]
                        #        funcCountDict["conditionalModWorker"] = funcCountDict["conditionalModMaster"]
                        #    else:
                        #        conditionalModWorkerSyscalls, visitedFuncPerLibraryDict, binaryVisitedFuncs = conditionalModObj.extractAccessibleSystemCalls(workerMainListWPrefix, exceptList)
                        #        sizeDict["conditionalModWorker"], funcCountDict["conditionalModWorker"] = getSize(binbasepath, bininput, appNameWSuffix, visitedFuncPerLibraryDict, options.bitcodepath, rootLogger)
                        #        funcCountDict["conditionalModWorker"] += len(binaryVisitedFuncs)
                        #    rootLogger.info("Finished extracting conditional(Mod) worker system calls with len: %d for %s", len(conditionalModWorkerSyscalls), appName)

                        conditionalBbObj = piecewise.Piecewise(binbasepath + "/" + bininput + "/" + appNameWSuffix, cfgbasepath + "/" + conditionaltargetcfgBb, cfginput, options.othercfgpath, rootLogger, options.cfginputseparator)
                        if ( not options.onlybb ):
                            conditionalBbMasterSyscalls, visitedFuncPerLibraryDict, binaryVisitedFuncs = conditionalBbObj.extractAccessibleSystemCalls(masterMainListWPrefix, exceptList)
                            sizeDict["conditionalBbMaster"], funcCountDict["conditionalBbMaster"] = getSize(binbasepath, bininput, appNameWSuffix, visitedFuncPerLibraryDict, options.bitcodepath, rootLogger)
                            funcCountDict["conditionalBbMaster"] += len(binaryVisitedFuncs)
                            rootLogger.info("Finished extracting conditional(Bb) master system calls with len: %d for %s", len(conditionalBbMasterSyscalls), appName)
                        if ( mastermain == workermain and not options.onlybb ):
                            conditionalBbWorkerSyscalls = conditionalBbMasterSyscalls
                            sizeDict["conditionalBbWorker"] = sizeDict["conditionalBbMaster"]
                            funcCountDict["conditionalBbWorker"] = funcCountDict["conditionalBbMaster"]
                        else:
                            conditionalBbWorkerSyscalls, visitedFuncPerLibraryDict, binaryVisitedFuncs = conditionalBbObj.extractAccessibleSystemCalls(workerMainListWPrefix, exceptList)
                            sizeDict["conditionalBbWorker"], funcCountDict["conditionalBbWorker"] = getSize(binbasepath, bininput, appNameWSuffix, visitedFuncPerLibraryDict, options.bitcodepath, rootLogger)
                            funcCountDict["conditionalBbWorker"] += len(binaryVisitedFuncs)
                        rootLogger.info("Finished extracting conditional(Bb) worker system calls with len: %d for %s", len(conditionalBbWorkerSyscalls), appName)



                        if ( options.onlybb ):
                            totalBbCount = 0
                            #bitcodePath = options.bitcodepath
                            #findCmd = "find {} -name {}*.precodegen.bc"
                            #for libName, funcSet in visitedFuncPerLibraryDict.items():
                            #    # find bitcode for library name
                            #    if ( libName == "libc" ):
                            #        libcFuncToBbCountDict = dict()      #We have to handle libc separately, since we can't generate the bitcode and run an LLVM pass against it
                            #        libcFuncToBbFile = open(options.libcfunctobbpath, 'r')
                            #        inputLine = libcFuncToBbFile.readline()
                            #        while ( inputLine ):
                            #            inputLine = inputLine.strip()
                            #            splittedInput = inputLine.split(":")
                            #            funcName = splittedInput[0]
                            #            bbCount = int(splittedInput[1])
                            #            libcFuncToBbCountDict[funcName] = bbCount
                            #            inputLine = libcFuncToBbFile.readline()
                            #        for function in funcSet:
                            #            if ( libcFuncToBbCountDict.get(funcName, -1) == -1 ):
                            #                rootLogger.error("Can't find bb count for libc function: %s", function)
                            #            totalBbCount += libcFuncToBbCountDict.get(funcName, 0)
                            #    else:
                            #        findCmdFull = findCmd.format(bitcodePath, libName)
                            #        returncode, out, err = util.runCommand(findCmdFull)
                            #        if ( returncode != 0 and returncode != 1 ):
                            #            rootLogger.error("Problem running command: %s", findCmdFull)
                            #            rootLogger.error("Problem: %s", err)
                            #            sys.exit(-1)
                            #        splittedOut = out.split("\n")
                            #        for line in splittedOut:
                            #            if ( line != "" ):
                            #                rootLogger.debug("line: %s", line)
                            #                bitcodeName = line[line.rindex("/")+1:]
                            #                cleanedLibName = clean(bitcodeName, rootLogger)
                            #                if ( libName == cleanedLibName ):
                            #                    rootLogger.info("adding bitcode: %s for libName: %s", bitcodeName, cleanedLibName )
                            #                    bitcodeAnalysisObj = bitcodeAnalysis.BitcodeAnalysis(line.strip(), rootLogger)
                            #                    totalBbCount += bitcodeAnalysisObj.extractBbCountTotal(funcSet)
                            #rootLogger.info("basic block count before adding binary: %d", totalBbCount)
                            #bitcodeAnalysisObj = bitcodeAnalysis.BitcodeAnalysis("/tmp/tmp.instrumented.bc", rootLogger)
                            #totalBbCount += bitcodeAnalysisObj.extractBbCountTotal(binaryVisitedFuncs)
                            #rootLogger.info("final basic block count: %d", totalBbCount)
                            #rootLogger.info("final library count: %d", len(visitedFuncPerLibraryDict.keys()))



                                    
                                


                        # Convert syscall numbers to names and generated prohibited list
                        piecewiseWorkerSyscallNames = set()
                        piecewiseMasterSyscallNames = set()
                        temporalWorkerSyscallNames = set()
                        temporalMasterSyscallNames = set()
                        conditionalModWorkerSyscallNames = set()
                        conditionalModMasterSyscallNames = set()
                        conditionalBbWorkerSyscallNames = set()
                        conditionalBbMasterSyscallNames = set()

                        denyPiecewiseWorkerSyscallNames = set()
                        denyPiecewiseMasterSyscallNames = set()
                        denyTemporalWorkerSyscallNames = set()
                        denyTemporalMasterSyscallNames = set()
                        denyConditionalModWorkerSyscallNames = set()
                        denyConditionalModMasterSyscallNames = set()
                        denyConditionalBbWorkerSyscallNames = set()
                        denyConditionalBbWorkerSyscallNums = set()
                        denyConditionalBbMasterSyscallNames = set()

                        if ( not options.onlybb ):
                            for syscall in piecewiseWorkerSyscalls:
                                if ( syscallMap.get(syscall, None) ):
                                    piecewiseWorkerSyscallNames.add(syscallMap[syscall])
                            for syscall in piecewiseMasterSyscalls:
                                if ( syscallMap.get(syscall, None) ):
                                    piecewiseMasterSyscallNames.add(syscallMap[syscall])
                            for syscall in temporalWorkerSyscalls:
                                if ( syscallMap.get(syscall, None) ):
                                    temporalWorkerSyscallNames.add(syscallMap[syscall])
                            for syscall in temporalMasterSyscalls:
                                if ( syscallMap.get(syscall, None) ):
                                    temporalMasterSyscallNames.add(syscallMap[syscall])
                            for syscall in conditionalModWorkerSyscalls:
                                if ( syscallMap.get(syscall, None) ):
                                    conditionalModWorkerSyscallNames.add(syscallMap[syscall])
                            for syscall in conditionalModMasterSyscalls:
                                if ( syscallMap.get(syscall, None) ):
                                    conditionalModMasterSyscallNames.add(syscallMap[syscall])
                            for syscall in conditionalBbMasterSyscalls:
                                if ( syscallMap.get(syscall, None) ):
                                    conditionalBbMasterSyscallNames.add(syscallMap[syscall])
                        for syscall in conditionalBbWorkerSyscalls:
                            if ( syscallMap.get(syscall, None) ):
                                conditionalBbWorkerSyscallNames.add(syscallMap[syscall])

                        
                        if ( not options.onlybb ):
                            syscallDiffFile.write("temporalWorker-conditionalBbWorker: \n" +  str(set(temporalWorkerSyscallNames-conditionalBbWorkerSyscallNames)) + "\n")
                            syscallDiffFile.write("piecewiseMaster-conditionalBbWorker: \n" + str(set(piecewiseMasterSyscallNames-conditionalBbWorkerSyscallNames)) + "\n")
                            #rootLogger.info("//////////////////////////////////////////// syscallCount: appName: %s lib-spec (main): %d temporal: %d conditional(bb): %d////////////////////////////////////", appName, len(piecewiseMasterSyscallNames), len(temporalWorkerSyscallNames), len(conditionalBbWorkerSyscallNames))
                            #rootLogger.info("//////////////////////////////////////////// funcCount: appName: %s lib-spec (main): %d temporal: %d conditional(bb): %d////////////////////////////////////", appName, funcCountDict["piecewiseMaster"], funcCountDict["temporalWorker"], funcCountDict["conditionalBbWorker"])
                            rootLogger.info("piecewiseMaster-temporalWorker: \n%s\n", str(set(piecewiseMasterSyscallNames-temporalWorkerSyscallNames)))
                            #rootLogger.info("piecewiseWorker-temporalWorker: \n%s\n", str(set(piecewiseWorkerSyscallNames-temporalWorkerSyscallNames)))
                            #rootLogger.info("temporalWorker-conditionalModWorker: \n%s\n", str(set(temporalWorkerSyscallNames-conditionalModWorkerSyscallNames)))
                            rootLogger.info("temporalWorker-conditionalBbWorker: \n%s\n", str(set(temporalWorkerSyscallNames-conditionalBbWorkerSyscallNames)))
                            #rootLogger.info("conditionalModWorker-conditionalBbWorker: \n%s\n", str(set(conditionalModWorkerSyscallNames-conditionalBbWorkerSyscallNames)))
                            #rootLogger.info("piecewiseMaster-conditionalModMaster: \n%s\n", str(set(piecewiseMasterSyscallNames-conditionalModMasterSyscallNames)))
                            #rootLogger.info("piecewiseMaster-conditionalModWorker: \n%s\n", str(set(piecewiseMasterSyscallNames-conditionalModWorkerSyscallNames)))
                            rootLogger.info("piecewiseMaster-conditionalBbWorker: \n%s\n", str(set(piecewiseMasterSyscallNames-conditionalBbWorkerSyscallNames)))

                        i = 0
                        while ( i < 400 ):
                            if ( not options.onlybb ):
                                if i not in piecewiseWorkerSyscalls:
                                    if ( syscallMap.get(i, None) ):
                                        denyPiecewiseWorkerSyscallNames.add(syscallMap[i])
                                if i not in piecewiseMasterSyscalls:
                                    if ( syscallMap.get(i, None) ):
                                        denyPiecewiseMasterSyscallNames.add(syscallMap[i])
                                if i not in temporalWorkerSyscalls:
                                    if ( syscallMap.get(i, None) ):
                                        denyTemporalWorkerSyscallNames.add(syscallMap[i])
                                if i not in temporalMasterSyscalls:
                                    if ( syscallMap.get(i, None) ):
                                        denyTemporalMasterSyscallNames.add(syscallMap[i])
                                if i not in conditionalModWorkerSyscalls:
                                    if ( syscallMap.get(i, None) ):
                                        denyConditionalModWorkerSyscallNames.add(syscallMap[i])
                                if i not in conditionalModMasterSyscalls:
                                    if ( syscallMap.get(i, None) ):
                                        denyConditionalModMasterSyscallNames.add(syscallMap[i])
                                if i not in conditionalBbMasterSyscalls:
                                    if ( syscallMap.get(i, None) ):
                                        denyConditionalBbMasterSyscallNames.add(syscallMap[i])
                            if i not in conditionalBbWorkerSyscalls:
                                if ( syscallMap.get(i, None) ):
                                    denyConditionalBbWorkerSyscallNums.add(i)
                                    denyConditionalBbWorkerSyscallNames.add(syscallMap[i])
                            i += 1

                        if ( options.onlybb ):
                            outputFile = open("/tmp/c2c-syscall-filter.out", 'w')
                            for syscallNum in denyConditionalBbWorkerSyscallNums:
                                outputFile.write(str(syscallNum) + "\n")
                                outputFile.flush()
                            outputFile.close()

                        outputDict = dict()
                        if ( not options.onlybb ):
                            outputDict['piecewiseMaster'] = piecewiseMasterSyscallNames
                            outputDict['piecewiseWorker'] = piecewiseWorkerSyscallNames
                            outputDict['temporalMaster'] = temporalMasterSyscallNames
                            outputDict['temporalWorker'] = temporalWorkerSyscallNames
                            outputDict['conditionalModMaster'] = conditionalModMasterSyscallNames
                            outputDict['conditionalModWorker'] = conditionalModWorkerSyscallNames
                            outputDict['conditionalBbMaster'] = conditionalBbMasterSyscallNames
                            outputDict['conditionalBbWorker'] = conditionalBbWorkerSyscallNames

                            for key, val in sizeDict.items():
                                outputDict[key + "Size"] = val
                                outputDict[key + "Count"] = funcCountDict[key]

                            outputDict['denyPiecewiseMaster'] = denyPiecewiseMasterSyscallNames
                            outputDict['denyPiecewiseWorker'] = denyPiecewiseWorkerSyscallNames
                            outputDict['denyTemporalMaster'] = denyTemporalMasterSyscallNames
                            outputDict['denyTemporalWorker'] = denyTemporalWorkerSyscallNames
                            outputDict['denyConditionalModMaster'] = denyConditionalModMasterSyscallNames
                            outputDict['denyConditionalModWorker'] = denyConditionalModWorkerSyscallNames
                            outputDict['denyConditionalBbMaster'] = denyConditionalBbMasterSyscallNames
                        outputDict['denyConditionalBbWorker'] = denyConditionalBbWorkerSyscallNames

                        util.writeDictToFile(outputDict, output)

                        if ( not options.onlybb ):
                            #Write result for each application in file for shellcode security evaluation
                            libSecEvalOutputFile.write(appName + ":" + util.cleanStrList(denyPiecewiseMasterSyscallNames).replace(" ", "")+ "\n")
                            libSecEvalOutputFile.flush()
                            temporalSecEvalOutputFile.write(appName + ":" + util.cleanStrList(denyTemporalWorkerSyscallNames).replace(" ", "") + "\n")
                            temporalSecEvalOutputFile.flush()
                            conditionalSecEvalOutputFile.write(appName + ":" + util.cleanStrList(denyConditionalBbWorkerSyscallNames).replace(" ", "") + "\n")
                            conditionalSecEvalOutputFile.flush()


                    piecewiseMasterSize = sizeDict.get('piecewiseMaster', 0)
                    piecewiseWorkerSize = sizeDict.get('piecewiseWorker', 0)
                    temporalMasterSize = sizeDict.get('temporalMaster', 0)
                    temporalWorkerSize = sizeDict.get('temporalWorker', 0)
                    conditionalModMasterSize = sizeDict.get('conditionalModMaster', 0)
                    conditionalModWorkerSize = sizeDict.get('conditionalModWorker', 0)
                    conditionalBbMasterSize = sizeDict.get('conditionalBbMaster', 0)
                    conditionalBbWorkerSize = sizeDict.get('conditionalBbWorker', 0)
                    # Generate statistics on sensitive system calls
                    if ( not options.onlybb and os.path.exists(output) ):
                        rootLogger.info("%s exists, creating stats", output)
                        outputDict = util.readDictFromFile(output)
                        piecewiseMasterSyscalls = outputDict['piecewiseMaster']
                        piecewiseWorkerSyscalls = outputDict['piecewiseWorker']
                        temporalMasterSyscalls = outputDict['temporalMaster']
                        temporalWorkerSyscalls = outputDict['temporalWorker']
                        conditionalModMasterSyscalls = outputDict['conditionalModMaster']
                        conditionalModWorkerSyscalls = outputDict['conditionalModWorker']
                        conditionalBbMasterSyscalls = outputDict['conditionalBbMaster']
                        conditionalBbWorkerSyscalls = outputDict['conditionalBbWorker']

                        piecewiseMasterSize = outputDict['piecewiseMasterSize']
                        piecewiseWorkerSize = outputDict['piecewiseWorkerSize']
                        temporalMasterSize = outputDict['temporalMasterSize']
                        temporalWorkerSize = outputDict['temporalWorkerSize']
                        conditionalModMasterSize = outputDict.get('conditionalModMasterSize',0)
                        conditionalModWorkerSize = outputDict.get('conditionalModWorkerSize',0)
                        conditionalBbMasterSize = outputDict['conditionalBbMasterSize']
                        conditionalBbWorkerSize = outputDict['conditionalBbWorkerSize']
                        


                        sensitiveSyscallStatLine = "{};{};{};{}\n"
                        #syscallReductionStatLine = "{};{};{};{};{};{};{};{};{}\n"
                        #sizeReductionStatLine = "{};{};{};{};{};{};{};{};{}\n"
                        syscallReductionStatLine = "{};{};{};{};{};{};{}\n"
                        sizeReductionStatLine = "{};{};{};{};{};{};{}\n"

                        #syscallReductionFile.write(syscallReductionStatLine.format(appName, len(piecewiseMasterSyscalls), len(piecewiseWorkerSyscalls), len(temporalMasterSyscalls), len(temporalWorkerSyscalls), len(conditionalModMasterSyscalls), len(conditionalModWorkerSyscalls), len(conditionalBbMasterSyscalls), len(conditionalBbWorkerSyscalls)))
                        syscallReductionFile.write(syscallReductionStatLine.format(appName, len(piecewiseMasterSyscalls), len(piecewiseWorkerSyscalls), len(temporalMasterSyscalls), len(temporalWorkerSyscalls), len(conditionalBbMasterSyscalls), len(conditionalBbWorkerSyscalls)))
                        syscallReductionFile.flush()
                        
                        #sizeReductionFile.write(sizeReductionStatLine.format(appName, piecewiseMasterSize, piecewiseWorkerSize, temporalMasterSize, temporalWorkerSize, conditionalModMasterSize, conditionalModWorkerSize, conditionalBbMasterSize, conditionalBbWorkerSize))
                        sizeReductionFile.write(sizeReductionStatLine.format(appName, piecewiseMasterSize, piecewiseWorkerSize, temporalMasterSize, temporalWorkerSize, conditionalBbMasterSize, conditionalBbWorkerSize))
                        sizeReductionFile.flush()

                        for syscall in sensitiveSyscallSet:
                            if ( syscall in piecewiseMasterSyscalls ):
                                sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "piecewise-master", 1))
                            else:
                                sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "piecewise-master", 0))
                            if ( syscall in piecewiseWorkerSyscalls ):
                                sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "piecewise-worker", 1))
                            else:
                                sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "piecewise-worker", 0))
                            if ( syscall in temporalMasterSyscalls ):
                                sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "temporal-master", 1))
                            else:
                                sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "temporal-master", 0))
                            if ( syscall in temporalWorkerSyscalls ):
                                sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "temporal-worker", 1))
                            else:
                                sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "temporal-worker", 0))
                            #if ( syscall in conditionalModMasterSyscalls ):
                            #    sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "conditional-mod-master", 1))
                            #else:
                            #    sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "conditional-mod-master", 0))
                            #if ( syscall in conditionalModWorkerSyscalls ):
                            #    sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "conditional-mod-worker", 1))
                            #else:
                            #    sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "conditional-mod-worker", 0))
                            if ( syscall in conditionalBbMasterSyscalls ):
                                sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "conditional-bb-master", 1))
                            else:
                                sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "conditional-bb-master", 0))
                            if ( syscall in conditionalBbWorkerSyscalls ):
                                sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "conditional-bb-worker", 1))
                            else:
                                sensitiveSyscallOutfile.write(sensitiveSyscallStatLine.format(syscall, appName, "conditional-bb-worker", 0))
                            sensitiveSyscallOutfile.flush()

                else:
                    rootLogger.info("App %s is disabled, skipping...", appName)

        libSecEvalOutputFile.close()
        temporalSecEvalOutputFile.close()
        conditionalSecEvalOutputFile.close()

        sensitiveSyscallOutfile.close()
        syscallReductionFile.close()
        sizeReductionFile.close()
