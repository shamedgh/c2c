import sys
import os
import util
import re

class BinaryAnalysis:
    """
    This class can be used to extract direct system calls and possibly other information from a binary
    """
    def __init__(self, binaryPath, logger):
        self.binaryPath = binaryPath
        self.funcSizeMap = dict()
        self.logger = logger

    def cleanName(self):
        self.logger.debug("cleanName input: %s", self.binaryPath)
        binName = self.binaryPath[self.binaryPath.rindex("/")+1:]
        if ( ".so" in binName ):
            binName = re.sub("-.*so",".so",binName)
            binName = binName[:binName.index(".so")]
            #libName = libName + ".so"
        self.logger.debug("cleanName output: %s", binName)
        return binName

    def extractIndirectSyscalls(self, libcGraphObj):
        syscallList = list()

        i = 0
        while i < 400:
            syscallList.append("syscall(" + str(i) + ")")
            syscallList.append("syscall(" + str(i) + ")")
            syscallList.append("syscall ( " + str(i) + " )")
            syscallList.append("syscall( " + str(i) + " )")
            i += 1

        functionList = util.extractImportedFunctions(self.binaryPath, self.logger)
        self.logger.debug("binary: %s functionList: %s", self.binaryPath, str(functionList))
        tmpSet = set()
        for function in functionList:
            leaves = libcGraphObj.getLeavesFromStartNode(function, syscallList, list())
            tmpSet = tmpSet.union(leaves)

        allSyscalls = set()
        for syscallStr in tmpSet:
            syscallStr = syscallStr.replace("syscall( ", "syscall(")
            syscallStr = syscallStr.replace("syscall ( ", "syscall(")
            syscallStr = syscallStr.replace(" )", ")")
            syscallNum = int(syscallStr[8:-1])
            allSyscalls.add(syscallNum)

        return allSyscalls


    def extractDirectSyscalls(self):
        #Dump binary to tmp file
        dumpFileName = self.binaryPath + ".dump"
        if ( "/" in dumpFileName ):
            dumpFileName = dumpFileName[dumpFileName.rindex("/")+1:]
        dumpFilePath = "/tmp/" + dumpFileName
        cmd = "objdump -d {} > " + dumpFilePath
        if ( os.path.isfile(self.binaryPath) ):
            cmd = cmd.format(self.binaryPath)
            returncode, out, err = util.runCommand(cmd)
            if ( returncode != 0 ):
                self.logger.debug("Couldn't create dump file for: %s with err: %s", self.binaryPath, dumpFilePath)
                return (None, -1, -1)
            #Find direct syscalls and arguments
            #Specify how many were found successfully and how many were not
            syscallSet, successCount, failedCount = self.parseObjdump(dumpFilePath)
            #Return syscall list along with number of not found syscalls
            self.logger.debug("Finished extracting direct syscalls for %s, deleting temp file: %s", self.binaryPath, dumpFilePath)
            os.unlink(dumpFilePath)
            return (syscallSet, successCount, failedCount)
        else:
            self.logger.debug("binary path doesn't exist: %s", self.binaryPath)
            return (None, -1, -1)

    
    def sanitizeFnName(self, instr):
        outstr = ""
        for s in instr:
            if s == "<":
                continue
            if s == ">":
                continue
            if s == ":":
                continue
            outstr += s
        return outstr
    
    def decimalify(self, token):
        number = ""
        intnum = -1
        if token[0] == "$":
            number = token[1:]
        try:
            intnum = int(number, 16)
        except ValueError:
            self.logger.debug("can't convert: %s", token)
            pass
        return intnum
    
    def extractNum(self, ins):
        num = -1
        split = ins.split()
        for i in range(len(split)):
            if split[i] == "mov":
                # Next token should be src,dest
                srcdst = split[i+1].split(",")
                src = srcdst[0]
                dst = srcdst[1]
                if dst == "%rax" or dst == "%eax" or dst == "%rcx" or dst == "%ecx":
                    self.logger.debug("src: %s", src)
                    num = self.decimalify(src)
             
        return num
    
    def extractNumForWrapper(self, ins):
        num = -1
        split = ins.split()
        for i in range(len(split)):
            if split[i] == "mov":
                # Next token should be src,dest
                srcdst = split[i+1].split(",")
                src = srcdst[0]
                dst = srcdst[1]
                if dst == "%edi" or dst == "%rdi":
                    self.logger.debug("src: %s", src)
                    num = self.decimalify(src)
             
        return num
    
    
    def parseObjdump(self, outputFileName):
        FnNameBodyMap = {}
        FnSysCallMap = {}
        failCount = 0
        successCount = 0
        f = open(outputFileName)
        fnName = ""
        for line in f:
            if "<" in line and ">:" in line:
                # Most likely new function start
                namesplit = line.split()
                fnName = self.sanitizeFnName(namesplit[1])
                FnNameBodyMap[fnName] = []
                FnSysCallMap[fnName] = []
                continue
            if fnName != "":
                FnNameBodyMap[fnName].append(line)
        f.close()
    
        # For each function
        syscallSet = set() 
        for fnName in FnNameBodyMap:
            body = FnNameBodyMap[fnName]
            for i in range(len(body)):
                line = body[i]
                if ("syscall" in line and "0f 05" in line) or ("syscall" in line and "e9" in line):
                    # Check the past three lines for the value of the rax register
                    tmpI = i-1
                    num = self.extractNum(body[tmpI])
                    while ( num == -1 and (i - tmpI) < 15 and tmpI > 0 ):
                        tmpI = tmpI - 1
                        num = self.extractNum(body[tmpI])
                    if num == -1:
                        failCount += 1
                        #self.logger.error("Can't reason about syscall in function: %s in line: %s", fnName, line)
                    else:
                        successCount += 1
                        syscallSet.add(num)
                        #FnSysCallMap[fnName].append(num)
                if ("syscall" in line and "e8" in line):
                    # Check the past three lines for the value of the rax register
                    tmpI = i-1
                    num = self.extractNumForWrapper(body[tmpI])
                    while ( num == -1 and (i - tmpI) < 15 and tmpI > 0 ):
                        tmpI = tmpI - 1
                        num = self.extractNumForWrapper(body[tmpI])
                    if num == -1:
                        failCount += 1
                        self.logger.debug("Can't reason about syscall in function: %s in line: %s", fnName, line)
                    else:
                        successCount += 1
                        syscallSet.add(num)
                        #FnSysCallMap[fnName].append(num)
   
        #for fnName in FnSysCallMap:
        #    for syscall in FnSysCallMap[fnName]:
        #        syscallSet.add(syscall)
        return (syscallSet, successCount, failCount)

    def getFuncSize(self, funcName):
        if ( self.funcSizeMap.get(funcName, None) ):
            return self.funcSizeMap[funcName]
        else:
            #self.logger.error("BinaryAnalysis(%s): size not found for function: %s", self.binaryPath, funcName)
            return 0

    def getTotalSize(self, visitedFuncs):
        total = 0
        if ( self.hasDebugSyms() ):
            cmd = "nm -AP {}"
            finalCmd = cmd.format(self.binaryPath)
            returncode, out, err = util.runCommand(finalCmd)
            if ( returncode != 0 ):
                self.logger.debug("Running cmd: %s - %s", finalCmd, err)
                self.logger.debug("Exiting...")
                sys.exit(-1)
            self.parseNmOutput(out)
    
        else:
            self.logger.debug("binary doesn't have debug symbols, installing packages first")
            pkgName = self.installDebugSyms()
            if ( pkgName ):
                self.buildFuncToSizeMap(pkgName)
            else:
                self.logger.debug("Skipping extracting size for library: %s", self.binaryPath)
                return -1

        for funcName in visitedFuncs:
            total += self.getFuncSize(funcName)

        return total

    def parseNmOutput(self, output):
        for line in output.splitlines():
            lineStr = line.strip()#.decode("utf-8")
            tokens = lineStr.split()
            if len (tokens) > 4:
                funcName = tokens[1]
                funcSize = tokens[4]
                self.funcSizeMap[funcName] = int(funcSize, 16)

    def hasDebugSyms(self):
        cmd = "nm -AP {}"
        finalCmd = cmd.format(self.binaryPath)
        returncode, out, err = util.runCommand(finalCmd)    #nm doesn't return correct error code when target doesn't have symbols
        self.logger.debug("return code: %d", returncode)
        self.logger.debug("out: %s", out)
        self.logger.debug("err: %s", err)
        err = err.strip()
        if ( err.endswith("no symbols") ):
            return False
        else:
            self.logger.debug("%s has debug symbols", self.binaryPath)
        return True

    def installDebugSyms(self):
        pkgName = util.getPkgNameFromLibPath(self.binaryPath, self.logger)
        if ( not pkgName ):
            pkgName = self.cleanName()
        pkgName = pkgName + "-dbg"
        cmd = "sudo apt install {}"
        finalCmd = cmd.format(pkgName)
        returncode, out, err = util.runCommand(finalCmd)
        if ( returncode != 0 ):
            self.logger.debug("Running package installation failed: %s", err)
            self.logger.debug("Failed to install debug symbols for: %s", pkgName)
            pkgName = None
            #sys.exit(-1)
            #TODO fix package name from json or something?
        return pkgName

    def buildFuncToSizeMap(self, pkgName):
        cmd = "dpkg -L {}"
        finalCmd = cmd.format(pkgName)
        returncode, out, err = util.runCommand(finalCmd)
        if ( returncode != 0 ):
            self.logger.debug("Extracting files installed by package %s failed - err: %s", pkgName, err)
            sys.exit(-1)

        """
        /.
        /usr
        /usr/lib
        /usr/lib/debug
        /usr/lib/debug/.build-id
        /usr/lib/debug/.build-id/d8
        /usr/lib/debug/.build-id/d8/c3aa54d81c80bfc5134b8339a669190fd52517.debug
        /usr/lib/debug/.build-id/ef
        /usr/lib/debug/.build-id/ef/3e006dfe3132a41d4d4dc0e407d6ea658e11c4.debug
        /usr/lib/debug/.build-id/ef/8c6e4915db70788108eee460d867a7436f9a18.debug
        /usr/share
        /usr/share/doc
        /usr/share/doc/zlib1g-dbg
        /usr/share/doc/zlib1g-dbg/copyright
        /usr/share/doc/zlib1g-dbg/changelog.Debian.gz
        """

        dbgFilePaths = set()
        for outLine in out.splitlines():
            outLine = outLine.strip()
            if ( outLine.endswith(".debug") ):
                self.logger.debug("adding debug file: %s", outLine)
                dbgFilePaths.add(outLine)

        nmCmd = "nm --debug-syms {} -AP {}"
        for dbgFilePath in dbgFilePaths:
            nmFinalCmd = nmCmd.format(dbgFilePath, self.binaryPath)
            returncode, out, err = util.runCommand(nmFinalCmd)
            if ( returncode != 0 ):
                self.logger.debug("Error running nm with debug symbols cmd: %s - err: %s", nmFinalCmd, err)
                self.logger.debug("Skipping file %s", dbgFilePath)
                continue
            self.parseNmOutput(out)
