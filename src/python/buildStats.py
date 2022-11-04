"""
Build a combination of static stats and runtime stats
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
    if ( not opts.runtimefilepath or not opts.staticinput or not opts.outputpath ):
        parser.error("All options --enabled-edges --outputpath, --static-stats-input must be provided.")
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

def getCaller(enabledLine, rootLogger):
    caller = ""
    if ( "-C-T" in enabledLine ):
        caller = enabledLine.split("-C-T")[0]
    if ( "-C-F" in enabledLine ):
        caller = enabledLine.split("-C-F")[0]
    if ( caller == "" ):
        rootLogger.error("getCaller caller is empty: %s", enabledLine)
        sys.exit(-1)
    return caller

if __name__ == "__main__":

    """
    Combine runtime stats and static stats for C2C
    """
    usage = "Usage: %prog "

    parser = optparse.OptionParser(usage=usage, version="1")

    parser.add_option("", "--app", dest="appname", default=None, nargs=1,
                      help="Name of the app")

    parser.add_option("", "--enabled-edges", dest="runtimefilepath", default=":", nargs=1,
                      help="Path to file created at runtime showing which edges are enabled/disabled")

    parser.add_option("", "--static-stats-input", dest="staticinput", default=None, nargs=1,
                      help="File containing stats generated at compile time")

    parser.add_option("", "--outputpath", dest="outputpath", default=None, nargs=1,
                      help="Path to output file")

    parser.add_option("-d", "--debug", dest="debug", action="store_true", default=False,
                      help="Debug enabled/disabled")

    (options, args) = parser.parse_args()
    if isValidOpts(options):
        rootLogger = setLogPath("buildstats.log")

        '''
        1. parse static stats file
            - extract total edges
            - extract config-related edges
            - extract switch case count per switch statement
        2. parse runtime file
            - for conditional branches just keep count of disabled edges
            - for switch statements
                - if -S-T:ISENABLED nothing is disabled
                - if -S-T->Default everything is disabled, except default
                - if -S-T->funcId|bbId everything is disabled except this case and default
        '''

        totalBrEdgeCount = 0
        configBrEdgeCount = 0
        disabledEdgeCount = 0
        valueBasedCount = 0
        valueBased = dict()
        switchCaseCount = dict()
        SWITCHSEP = "-S-T:"

        statsInputFile = open(options.staticinput, 'r')
        statsLine = statsInputFile.readline()
        while ( statsLine ):
            statsLine = statsLine.strip()
            if ( statsLine.startswith("totalBrEdgeCount") ):
                totalBrEdgeCount = int(statsLine.split()[1].strip())
            if ( statsLine.startswith("configBrEdgeCount") ):
                configBrEdgeCount = int(statsLine.split()[1].strip())
            if ( SWITCHSEP in statsLine ):
                # funcName|bbId-S-T:caseCount (including default)
                switchFuncBb = statsLine.split(SWITCHSEP)[0].strip()
                caseCount = int(statsLine.split(SWITCHSEP)[1].strip())
                switchCaseCount[switchFuncBb] = caseCount
            statsLine = statsInputFile.readline()

        runtimeInputFile = open(options.runtimefilepath, 'r')
        enabledLine = runtimeInputFile.readline()
        while ( enabledLine ):
            enabledLine = enabledLine.strip()
            if ( "-C-" in enabledLine and enabledLine.endswith("ISDISABLED") ): # to count cond branch disabled edges
                disabledEdgeCount += 1
            if ( "-C-" in enabledLine and enabledLine.endswith("ISENABLED") ):  # to keep track of used/value based
                funcBb = getCaller(enabledLine, rootLogger)
                currVal = valueBased.get(funcBb, 0)
                currVal = currVal ^ 1
                valueBased[funcBb] = currVal
            if ( "-S-T->" in enabledLine ):     # special handling for switch cases
                splittedLine = enabledLine.split("-S-T->")
                funcBb = splittedLine[0].strip()
                if ( "Default" in enabledLine ):
                    disabledEdgeCount += (switchCaseCount[funcBb] - 1)
                else:
                    if ( switchCaseCount[funcBb] < 2 ):
                        rootLogger.error("switchCaseCount for %s is less than two: %d", funcBb, switchCaseCount[funcBb])
                        sys.exit(-1)
                    disabledEdgeCount += (switchCaseCount[funcBb] - 2)
            enabledLine = runtimeInputFile.readline()

        for funcBb, valEnabled in valueBased.items():
            if ( valEnabled == 1 ):
                valueBasedCount += 1

        outputFile = open(options.outputpath, 'w')
        outputFile.write(str(totalBrEdgeCount) + "," + str(configBrEdgeCount) + "," + str(disabledEdgeCount) + "," + str(valueBasedCount) + "\n")
