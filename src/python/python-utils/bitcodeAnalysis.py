import sys
import os
import util

class BitcodeAnalysis:
    """
    This class can be used to extract direct system calls and possibly other information from a binary
    """
    def __init__(self, bitcodePath, logger):
        self.bitcodePath = bitcodePath
        self.llvmCmd = "/home/hamed/svf/svf.new.improved/SVF/Debug-Build/bin/spa -bb-count {}"
        self.llcCmd = "/home/hamed/svf/svf.new.improved/llvm-10.0.0.obj/bin/llc -O0 -filetype=obj {} -o {}"
        self.funcToBbDict = dict()
        self.logger = logger

    def convertToObj(self, outputPath):
        llcFinalCmd = self.llcCmd.format(self.bitcodePath, outputPath)
        returncode, err, out = util.runCommand(llcFinalCmd)
        if ( returncode != 0 ):
            self.logger.error("llc command %s failed: %s", llcFinalCmd, error)
            return -1
        return 0

    def extractFuncToBbCount(self):
        llvmCmdFull = self.llvmCmd.format(self.bitcodePath)
        returncode, out, err = util.runCommand(llvmCmdFull)
        if ( returncode != 0 and returncode != 1 ):
            self.logger.error("Problem running command: %s", llvmCmdFull)
            self.logger.error("Error: %s", err)
            sys.exit(-1)
        splittedOut = err.split("\n")
        for line in splittedOut:
            if ( line != "" ):
                self.logger.debug("extractFuncToBbCount: %s", line)
                line = line.strip()
                funcName = line.split(":")[0]
                bbCount = int(line.split(":")[1])
                self.funcToBbDict[funcName] = bbCount

    # Extract basic block count for a single function
    def extractBbCount(self, funcName):
        self.extractFuncToBbCount()
        return self.funcToBbDict.get(funcName, 0)

    # Extract basic block count for a set of functions
    def extractBbCountTotal(self, funcNameSet):
        self.logger.debug("Invoked extractBbCountTotal for bitcodePath: %s", self.bitcodePath)
        self.extractFuncToBbCount()
        totalBbCount = 0
        for funcName in funcNameSet:
            self.logger.debug("extractBbCountTotal: looking for funcName: %s", funcName)
            totalBbCount += self.funcToBbDict.get(funcName, 0)
        return totalBbCount
