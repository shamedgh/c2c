import os, sys, subprocess, signal
import logging
import optparse
import re

import piecewise

sys.path.insert(0, './python-utils/')

import util
import binaryAnalysis

def cleanLib(libName, logger):
    logger.debug("cleanLib libName input: %s", libName)
    if ( ".so" in libName ):
        libName = re.sub("-.*so",".so",libName)
        libName = libName[:libName.index(".so")]
        #libName = libName + ".so"
    logger.debug("cleanLib libName output: %s", libName)
    return libName

def isValidOpts(opts):
    if ( not opts.folderpath or not opts.glibccfgpath or not opts.muslcfgpath or not opts.otherlibcfgpath or not opts.otherlibcfgpathempty):
        parser.error("All options --folderpath, --glibccfgpath, --muslcfgpath, --otherlibcfgpathempty and --otherlibcfgpath should be provided.")
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

def extractAllImportedFunctionsFromElfFile(elfFilePath, logger):
    funcSet = set()
    functionList = util.extractImportedFunctions(elfFilePath, logger)
    if ( not functionList ):
        logger.debug("Function extraction for file: %s failed (probably not an ELF file).", elfFilePath)
    else:
        for function in functionList:
            funcSet.add(function)
    return funcSet

def usesMusl(folder, logger):
    #return True
    for fileName in os.listdir(folder):
        if ( "musl" in fileName ):
            return True
    return False


if __name__ == '__main__':
    """
    Find system calls for function
    """
    usage = "Usage: %prog --binarypath <Binary Path> --binarycfgpath <Binary call graph> --libccfgpath <Libc call graph path> --otherlibcfgpath <Path to folder containing other libraries' cfg>"

    parser = optparse.OptionParser(usage=usage, version="1")

    parser.add_option("", "--folderpath", dest="folderpath", default=None, nargs=1,
                      help="Path to binary to analyze")

    parser.add_option("", "--glibccfgpath", dest="glibccfgpath", default=None, nargs=1,
                      help="Path to glibc call graph")

    parser.add_option("", "--muslcfgpath", dest="muslcfgpath", default=None, nargs=1,
                      help="Path to glibc call graph")

    parser.add_option("", "--otherlibcfgpathempty", dest="otherlibcfgpathempty", default=None, nargs=1,
                      help="Path to other library callgraphs (empty folder)")

    parser.add_option("", "--otherlibcfgpath", dest="otherlibcfgpath", default=None, nargs=1,
                      help="Path to other library callgraphs")

    parser.add_option("", "--output", dest="output", default="libstats.out", nargs=1,
                      help="Path to output file which holds stats")

    parser.add_option("-d", "--debug", dest="debug", action="store_true", default=False,
                      help="Debug enabled/disabled")

    (options, args) = parser.parse_args()
    if isValidOpts(options):
        rootLogger = setLogPath("libstatgenerator.log")
        libcRelatedList = ["ld", "libc", "libdl", "libcrypt", "libnss_compat", "libnsl", "libnss_files", "libnss_nis", "libpthread", "libm", "libresolv", "librt", "libutil", "libnss_dns"]

        outputFile = open(options.output, 'w')
        outputUniqFile = open(options.output + ".uniq", 'w')
        outputSortedFile = open(options.output + ".sorted", 'w')
        outputSortedByDiffFile = open(options.output + ".sortedbydiff", 'w')
        outputSortedByDirectFile = open(options.output + ".sortedbydirect", 'w')

        libToTotalSyscalls = dict()
        libToSpecializedTotalSyscalls = dict()
        libToSpecBenefit = dict()
        libToDirectSyscalls = dict()

        containerOutputPaths = os.listdir(options.folderpath)
        for containerOutputPath in containerOutputPaths:
            rootLogger.info("Analyzing folder: %s", containerOutputPath)
            isMusl = usesMusl(options.folderpath + "/" + containerOutputPath, rootLogger)
            elfFilePaths = os.listdir(options.folderpath + "/" + containerOutputPath)
            for elfFileName in elfFilePaths:
                if ( elfFileName.startswith("lib") and "so" in elfFileName ):
                    elfFileNameCleaned = cleanLib(elfFileName, rootLogger)
                    elfFilePath = options.folderpath + "/" + containerOutputPath + "/" + elfFileName
                    rootLogger.info("Analyzing file: %s", elfFilePath)
                    startFunctions = extractAllImportedFunctionsFromElfFile(elfFilePath, rootLogger)

                    # Without library specialization
                    if ( isMusl ):
                        piecewiseObj = piecewise.Piecewise(elfFilePath, "", options.muslcfgpath, options.otherlibcfgpathempty, rootLogger, cfginputseparator="->")
                    else:
                        piecewiseObj = piecewise.Piecewise(elfFilePath, "", options.glibccfgpath, options.otherlibcfgpathempty, rootLogger)
    
                    elfSyscalls = piecewiseObj.extractAccessibleSystemCallsFromBinary(startFunctions, altLibPath=options.folderpath + "/" + containerOutputPath, procLibraryDict=dict(), addLibcStartNodes=False)

                    # With library specialization
                    if ( isMusl ):
                        piecewiseObj = piecewise.Piecewise(elfFilePath, "", options.muslcfgpath, options.otherlibcfgpath, rootLogger, cfginputseparator="->")
                    else:
                        piecewiseObj = piecewise.Piecewise(elfFilePath, "", options.glibccfgpath, options.otherlibcfgpath, rootLogger)
    
                    elfSyscallsLibSpec = piecewiseObj.extractAccessibleSystemCallsFromBinary(startFunctions, altLibPath=options.folderpath + "/" + containerOutputPath, procLibraryDict=dict(), addLibcStartNodes=False)


                    elfProfiler = binaryAnalysis.BinaryAnalysis(elfFilePath, rootLogger)
                    libDirectSyscallSet, successCount, failedCount = elfProfiler.extractDirectSyscalls()
                    if ( not libDirectSyscallSet ):
                        libDirectSyscallSet = set()

                    if ( not libToTotalSyscalls.get(elfFileNameCleaned, None) or (len(elfSyscalls) > libToTotalSyscalls[elfFileNameCleaned]) ):
                        libToTotalSyscalls[elfFileNameCleaned] = len(elfSyscalls) + len(libDirectSyscallSet)
                        libToSpecializedTotalSyscalls[elfFileNameCleaned] = len(elfSyscallsLibSpec) + len(libDirectSyscallSet)
                        libToSpecBenefit[elfFileNameCleaned] = len(elfSyscalls) - len(elfSyscallsLibSpec)
                        libToDirectSyscalls[elfFileNameCleaned] = len(libDirectSyscallSet)
                
                    #1. Generate raw output
                    outputFile.write(elfFileName + ";" + str(len(elfSyscalls)) + ";" + str(len(elfSyscallsLibSpec)) + ";" + str(len(elfSyscalls) - len(elfSyscallsLibSpec)) + ";" + str(len(libDirectSyscallSet)) + "\n")
                    outputFile.flush()
        outputFile.close()

        #2. Generate Unique Output
        for libName, sycallCount in libToTotalSyscalls.items():
            if ( libName not in libcRelatedList ):
                elfSyscallsLen = libToTotalSyscalls[libName]
                elfSyscallsLibSpecLen = libToSpecializedTotalSyscalls[libName]
                elfSyscallsDiffLen = libToSpecBenefit[libName]
                libDirectSyscallSetLen = libToDirectSyscalls[libName]
                outputUniqFile.write(libName + ";" + str(elfSyscallsLen) + ";" + str(elfSyscallsLibSpecLen) + ";" + str(elfSyscallsDiffLen) + ";" + str(libDirectSyscallSetLen) + "\n")
                outputUniqFile.flush()
        outputUniqFile.close()

        #3. Generated sorted output based on number of total syscalls
        sortedLibToTotalSyscalls = dict(sorted(libToTotalSyscalls.items(), key=lambda item: item[1], reverse=True))
        for libName, sycallCount in sortedLibToTotalSyscalls.items():
            if ( libName not in libcRelatedList ):
                elfSyscallsLen = sortedLibToTotalSyscalls[libName]
                elfSyscallsLibSpecLen = libToSpecializedTotalSyscalls[libName]
                elfSyscallsDiffLen = libToSpecBenefit[libName]
                libDirectSyscallSetLen = libToDirectSyscalls[libName]
                outputSortedFile.write(libName + ";" + str(elfSyscallsLen) + ";" + str(elfSyscallsLibSpecLen) + ";" + str(elfSyscallsDiffLen) + ";" + str(libDirectSyscallSetLen) + "\n")
                outputSortedFile.flush()

        outputSortedFile.close()


        #4. Generated sorted output based on number of library specialization benefit
        sortedLibToSpecBenefit = dict(sorted(libToSpecBenefit.items(), key=lambda item: item[1], reverse=True))
        for libName, sycallCount in sortedLibToSpecBenefit.items():
            if ( libName not in libcRelatedList ):
                elfSyscallsLen = libToTotalSyscalls[libName]
                elfSyscallsLibSpecLen = libToSpecializedTotalSyscalls[libName]
                elfSyscallsDiffLen = sortedLibToSpecBenefit[libName]
                libDirectSyscallSetLen = libToDirectSyscalls[libName]
                outputSortedByDiffFile.write(libName + ";" + str(elfSyscallsLen) + ";" + str(elfSyscallsLibSpecLen) + ";" + str(elfSyscallsDiffLen) + ";" + str(libDirectSyscallSetLen) + "\n")
                outputSortedByDiffFile.flush()

        outputSortedByDiffFile.close()


        #5. Generated sorted output based on number of direct syscall invocations
        sortedLibToDirectSyscalls = dict(sorted(libToDirectSyscalls.items(), key=lambda item: item[1], reverse=True))
        for libName, sycallCount in sortedLibToDirectSyscalls.items():
            #if ( libName not in libcRelatedList ):
            elfSyscallsLen = libToTotalSyscalls[libName]
            elfSyscallsLibSpecLen = libToSpecializedTotalSyscalls[libName]
            elfSyscallsDiffLen = sortedLibToSpecBenefit[libName]
            libDirectSyscallSetLen = libToDirectSyscalls[libName]
            outputSortedByDirectFile.write(libName + ";" + str(elfSyscallsLen) + ";" + str(elfSyscallsLibSpecLen) + ";" + str(elfSyscallsDiffLen) + ";" + str(libDirectSyscallSetLen) + "\n")
            outputSortedByDirectFile.flush()

        outputSortedByDirectFile.close()
