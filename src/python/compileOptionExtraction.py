import sys
import os
import re

sys.path.insert(0, './python-utils/')

import util

class CompileOptionExtraction:
    """
    This class can be used to extract the compile-time options of a program and map them to their respective object files
    """
    def __init__(self, srcPath, configureCmd, configureBaselineCmd, configureHelpCmd, configureModulePrefix, configureModuleSuffix, modifyModuleNameCmd, makeCmd, cleanCmd, logger, appName=""):
        self.srcPath = srcPath
        self.configureCmd = configureCmd
        self.configureBaselineCmd = configureBaselineCmd
        self.configureHelpCmd = configureHelpCmd
        self.configureModulePrefix = configureModulePrefix
        self.configureModuleSuffix = configureModuleSuffix
        self.modifyModuleNameCmd = modifyModuleNameCmd
        self.makeCmd = makeCmd
        self.cleanCmd = cleanCmd
        self.logger = logger
        self.appName = appName

    def extractCompileOptions(self):
        moduleOptionSet = set()
        configureHelpCmdFull = self.configureHelpCmd
        returncode, out, err = util.runCommand(configureHelpCmdFull, cwd=self.srcPath)
        if ( returncode != 0 and returncode != 1 ):
            self.logger.error("Problem running configure command: %s", configureHelpCmdFull)
            self.logger.error("Error: %s", err)
            self.logger.error("Out: %s", out)
            self.logger.error("Exiting...")
            sys.exit(-1)
        splittedOut = out.splitlines()
        for line in splittedOut:
            line = line.strip()
            #if ( line.startswith(self.configureModulePrefix) ):
            splittedLine = line.split()
            for item in splittedLine:
                item = item.strip()
                if ( (self.configureModulePrefix != "" and item.startswith(self.configureModulePrefix)) or ( self.configureModuleSuffix != "" and item.endswith(self.configureModuleSuffix)) ):
                    if ( "=" in item ):
                        item = item.split("=")[0]
                    if ( self.modifyModuleNameCmd != "" ):
                        modifyModuleNameCmdFinal = self.modifyModuleNameCmd.format(item)
                        returncode, out, err = util.runCommand(modifyModuleNameCmdFinal)
                        if ( returncode != 0 ):
                            self.logger.error("Can't modify module option text for cmd: %s returned: %s", modifyModuleNameCmdFinal, err)
                            sys.exit(-1)
                        item = out.strip()
                    moduleOptionSet.add(item)
                    self.logger.debug("Adding config option: %s", item)
                    continue
        return moduleOptionSet

    def compileWithOptions(self, configureCmd):
        returncode, out, err = util.runCommand(self.cleanCmd, cwd=self.srcPath)
        if ( returncode != 0 and returncode != 1 ):
            self.logger.error("Problem running make clean command: %s", self.cleanCmd)
        configureCmdFull = configureCmd
        returncode, out, err = util.runCommand(configureCmdFull, cwd=self.srcPath)
        if ( returncode != 0 and returncode != 1 ):
            self.logger.error("Problem running configure command: %s", configureCmdFull)
        
        # compile program
        makeCmdFull = self.makeCmd
        returncode, out, err = util.runCommand(makeCmdFull, cwd=self.srcPath)
        if ( returncode != 0 and returncode != 1 ):
            self.logger.error("Problem running make command: %s", makeCmdFull)

        # fine bitcode
        findBitcodeCmd = "find {} -name \"{}.0.0.preopt.bc\""
        findBitcodeCmdFull = findBitcodeCmd.format(self.srcPath, self.appName)
        returncode, out, err = util.runCommand(findBitcodeCmdFull, cwd=self.srcPath)
        if ( returncode != 0 and returncode != 1 ):
            self.logger.error("Problem running make command: %s", findBitcodeCmdFull)
        return out.strip()


    def mapCompileOptionsToObjFiles(self):
        # extract all options
        moduleOptionType = dict()
        moduleOptionSet = self.extractCompileOptions()

        # run make clean
        returncode, out, err = util.runCommand(self.cleanCmd, cwd=self.srcPath)
        if ( returncode != 0 and returncode != 1 ):
            self.logger.error("Problem running make clean command: %s", self.cleanCmd)

        # create baseline, configure with no options
        self.logger.info("Configuring baseline...")
        configureCmdFull = self.configureBaselineCmd
        returncode, out, err = util.runCommand(configureCmdFull, cwd=self.srcPath)
        if ( returncode != 0 and returncode != 1 ):
            self.logger.error("Problem running configure command: %s", configureCmdFull)
            self.logger.error("Error: %s", err)
            self.logger.error("Out: %s", out)
            self.logger.error("Exiting...")
            sys.exit(-1)

        # compile baseline
        self.logger.info("Compiling baseline...")
        makeCmdFull = self.makeCmd
        returncode, out, err = util.runCommand(makeCmdFull, cwd=self.srcPath)
        if ( returncode != 0 and returncode != 1 ):
            self.logger.error("Problem running configure command: %s", makeCmdFull)
            self.logger.error("Error: %s", err)
            self.logger.error("Out: %s", out)
            self.logger.error("Exiting...")
            sys.exit(-1)

        baselineObjFileSet = self.extractObjFiles()
        moduleToObjFiles = dict()
        objFileToModules = dict()
        moduleToObjFiles["baseline"] = baselineObjFileSet

        # configure with each option
        count = 0
        for moduleOption in moduleOptionSet:
            moduleOptionType[moduleOption] = 0
            self.logger.debug("Analyzing module option: %s", moduleOption)
            #if ( moduleOption != "--enable-unixd=static" and moduleOption != "--enable-unixd=static" and moduleOption != "--enable-unixd=static" and moduleOption != "--enable-unixd=static"):
            #    self.logger.debug("Skipping analyzing %s", moduleOption)
            #    continue
            self.logger.info("Building with option: %s", moduleOption)
            returncode, out, err = util.runCommand(self.cleanCmd, cwd=self.srcPath)
            if ( returncode != 0 and returncode != 1 ):
                self.logger.error("Problem running make clean command: %s", self.cleanCmd)
            configureCmdFull = self.configureCmd + moduleOption
            returncode, out, err = util.runCommand(configureCmdFull, cwd=self.srcPath)
            if ( returncode != 0 and returncode != 1 ):
                self.logger.error("Problem running configure command: %s", configureCmdFull)
            
            # compile program
            makeCmdFull = self.makeCmd
            returncode, out, err = util.runCommand(makeCmdFull, cwd=self.srcPath)
            if ( returncode != 0 and returncode != 1 ):
                self.logger.error("Problem running make command: %s", makeCmdFull)

            # extract list of object files
            objFileSet = self.extractObjFiles()
            if ( len(objFileSet) > 0 ):
                baselineIntersect = objFileSet.intersection(baselineObjFileSet)
                if ( len(baselineIntersect) == len(objFileSet) and len(baselineIntersect) == len(baselineObjFileSet) ):
                    self.logger.debug("%s has the same set of files as the baseline.", moduleOption)
                    continue                
                
                if ( len(baselineObjFileSet-objFileSet) > 0 ):
                    moduleOptionType[moduleOption] -= 1
                elif ( len(objFileSet - baselineObjFileSet) > 0 ):
                    moduleOptionType[moduleOption] += 1

                if ( moduleOptionType[moduleOption] == 0 ):
                    self.logger.debug("%s both increases the object files and decreases them. len(baselineObjFileSet-objFileSet): %d, len(objFileSet - baselineObjFileSet): %d, baselineObjFileSet-objFileSet: %s, objFileSet - baselineObjFileSet: %s", moduleOption, len(baselineObjFileSet-objFileSet), len(objFileSet - baselineObjFileSet), str(set(baselineObjFileSet-objFileSet)), str(set(objFileSet - baselineObjFileSet)))

                if ( moduleOptionType[moduleOption] == -1 ):
                    objFileSet = baselineObjFileSet-objFileSet
                if ( moduleOptionType[moduleOption] == 1 ):
                    objFileSet = objFileSet-baselineObjFileSet

                moduleToObjFiles[moduleOption] = objFileSet
                for objFile in objFileSet:
                    tmpSet = objFileToModules.get(objFile, set())
                    tmpSet.add(moduleOption)
                    objFileToModules[objFile] = tmpSet

                self.logger.debug("%s: (moduleObjFiles-baseLine): %s", moduleOption, str(objFileSet-baselineObjFileSet))
            count += 1

        for moduleOption, objFileSet in moduleToObjFiles.items():
            self.logger.debug("%s: (moduleObjFiles-baseLine): %s", moduleOption, str(objFileSet-baselineObjFileSet))

        return moduleToObjFiles, objFileToModules, moduleOptionType


    def extractObjFiles(self):
        # extract list of object files
        findObjFileCmd = "find {} -name *.o"
        findObjFileCmdFinal = findObjFileCmd.format(self.srcPath)
        returncode, out, err = util.runCommand(findObjFileCmdFinal)
        if ( returncode != 0 and returncode != 1 ):
            self.logger.error("Problem running configure command: %s", findObjFileCmdFinal)
            sys.exit(-1)
        return set(out.splitlines())

