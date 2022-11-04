"""
Extract the syscalls for each process

"""
import logging
import os
import sys
import json
import compileOptionExtraction
import configFileParser

sys.path.insert(0, './python-utils/')

import util
import graph
import binaryAnalysis
import syscall

import re
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
    if not options.apptomodulemap or not options.outputpath:
        parser.error("All options --apptomodulemap, --outputpath should be provided.")
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

if __name__ == "__main__":

    """
    Find system calls for function
    """
    usage = "Usage: %prog -f <Target program cfg> -c <glibc callgraph file>"

    parser = optparse.OptionParser(usage=usage, version="1")

    parser.add_option("", "--apptomodulemap", dest="apptomodulemap", default=None, nargs=1,
                      help="File containing application to module mapping")

    parser.add_option("", "--outputpath", dest="outputpath", default=None, nargs=1,
                      help="Path to output folder")

    parser.add_option("", "--bitcodeoutputpath", dest="bitcodeoutputpath", default=None, nargs=1,
                      help="Path to bitcode output folder")

    parser.add_option("", "--singleappname", dest="singleappname", default=None, nargs=1,
                      help="Name of single application to run, if passed the enable/disable in the JSON file will not be considered")

    parser.add_option("", "--configpath", dest="configpath", default="", nargs=1,
                      help="Path of config files (will be added to config names of each app)")

    parser.add_option("-d", "--debug", dest="debug", action="store_true", default=False,
                      help="Debug enabled/disabled")

    (options, args) = parser.parse_args()
    if isValidOpts(options):
        rootLogger = setLogPath("mapruntimetocompile.log")
        try:
            appToModuleFile = open(options.apptomodulemap, 'r')
            appToModuleStr = appToModuleFile.read()
            appToModuleMap = json.loads(appToModuleStr)
        except Exception as e:
            rootLogger.warning("Trying to load app to property map json from: %s, but doesn't exist: %s", options.apptomodulemap, str(e))
            rootLogger.debug("Finished loading json")
            sys.exit(-1)


        '''
        1. input json with the following information:
        1.1. input1: directive -> object file (from LLVM pass)
        1.2. input2: list of module options for configure (from text parser)
        1.3. input3: path to target application
        1.4. input4: compile command
        '''

        llvmPassCmd = os.environ["C2CBUILD"] + "/bin/c2c -module-debloating {}"
        buildWithAllOptionsCmd = os.environ["APPSRCFOLDER"] + "/c2c-build.sh"
        srcLlvmDirectory = os.environ["APPSRCFOLDER"]
        if ( srcLlvmDirectory.endswith("/") ):
            srcLlvmDirectory = srcLlvmDirectory[:-1]
        srcWorkingDirectory = os.environ["APPSRCWORKING"]
        if ( srcWorkingDirectory.endswith("/") ):
            srcWorkingDirectory = srcWorkingDirectory[:-1]

        configDirectiveToObj = dict()

        findObjFilesCmd = "find {} -name *.o"
        for appName, appDict in appToModuleMap.items():
            if ( (not options.singleappname and appDict.get("enable","true") == "true") or (options.singleappname and appName == options.singleappname) ):

                # first of all build app with most complete module set up to build runtime-to-obj map
                rootLogger.info("Starting to build most complete build to map runtime options to obj files")
                returncode, out, err = util.runCommand(buildWithAllOptionsCmd, cwd=srcLlvmDirectory)
                if ( returncode != 0 ):
                    rootLogger.error("Error running command: %s", buildWithAllOptionsCmd)
                    rootLogger.error("Exiting module debloating for %s...", appName)
                    sys.exit(-1)

                directiveToObjOutput = options.outputpath + "/" + appDict.get("dir-to-obj")
                cleanCmd = appDict.get("clean-cmd", "make clean")   # if app uses something else specify in json
                configureCmd = appDict.get("configure-cmd")
                configureBaselineCmd = appDict.get("configure-baseline-cmd")
                configureHelpCmd = appDict.get("configure-help-cmd")
                configureModulePrefix = appDict.get("configure-module-prefix", "")
                configureModuleSuffix = appDict.get("configure-module-suffix", "")
                convertModuleNameCmd = appDict.get("convert-module-name", "")
                dirSplit = appDict.get("dir-split", None)
                dirCountPerLine = appDict.get("dir-count-per-line", 1)
                targetConfigFiles = appDict.get("config-files")
                makeCmd = appDict.get("make-cmd")

                compileOptionCacheFilePath = options.outputpath + "/." + srcWorkingDirectory[srcWorkingDirectory.rindex("/")+1:] + ".cache"
                
                # 1. Extract compile-time options and map to object files
                if ( not os.path.exists(compileOptionCacheFilePath) ):
                    compileOptExtractObj = compileOptionExtraction.CompileOptionExtraction(srcWorkingDirectory, configureCmd, configureBaselineCmd, configureHelpCmd, configureModulePrefix, configureModuleSuffix, convertModuleNameCmd, makeCmd, cleanCmd, rootLogger)
                    moduleToObjFilesDict, objFilesToModulesDict, moduleOptionType = compileOptExtractObj.mapCompileOptionsToObjFiles()
                    allDict = dict()
                    allDict["m2o"] = moduleToObjFilesDict
                    allDict["o2m"] = objFilesToModulesDict
                    allDict["mType"] = moduleOptionType
                    util.writeDictToFile(allDict, compileOptionCacheFilePath)
                else:
                    allDict = util.readDictFromFile(compileOptionCacheFilePath)
                    moduleToObjFilesDict = allDict["m2o"]
                    objFilesToModulesDict = allDict["o2m"]
                    moduleOptionType = allDict["mType"]
                
                # 2. Extract runtime directives and map to object files
                if ( not os.path.exists(directiveToObjOutput) ):
                    findObjFilesCmdFinal = findObjFilesCmd.format(srcLlvmDirectory)
                    returncode, out, err = util.runCommand(findObjFilesCmdFinal)
                    if ( returncode != 0 ):
                        rootLogger.error("Error running command: %s", findObjFilesCmdFinal)
                        rootLogger.error("Exiting...")
                        sys.exit(-1)
                    objFiles = out.split()
                    for objFile in objFiles:
                        #fileCmd = "file {}"
                        #fileCmdFinal = fileCmd.format(objFile)
                        #returncode, out, err = util.runCommand(fileCmdFinal)
                        #if ( returncode != 0 ):
                        rootLogger.debug("Running llvm pass for obj-file: %s", objFile)
                        llvmPassCmdFinal = llvmPassCmd.format(objFile)
                        returncode, out, err = util.runCommand(llvmPassCmdFinal)
                        if ( returncode != 0 ):
                            rootLogger.error("Error running llvm pass for obj file (skipping): %s", objFile)
                            rootLogger.error("cmd: %s", llvmPassCmdFinal)
                            rootLogger.error("err: %s", err)
                            continue
                        rootLogger.debug("out: %s", out)
                        configNames = out.splitlines()
                        for configName in configNames:
                            configName = configName.replace("\00", "")
                            configName = configName.strip()
                            if ( configName.startswith("configName: ") ):
                                configName = configName.replace("configName: ", "")
                                objSet = configDirectiveToObj.get(configName, set())
                                objSet.add(objFile)
                                configDirectiveToObj[configName] = objSet
                                rootLogger.debug("adding %s to config directive: %s", objFile, configName)
                    util.writeDictToFile(configDirectiveToObj, directiveToObjOutput)

                # 3. Identify required compile-time options based on configuration file directives
                if ( os.path.exists(directiveToObjOutput) ):
                    configDirectiveToObj = util.readDictFromFile(directiveToObjOutput)
                    for targetConfigName, targetConfigFile in targetConfigFiles.items():
                        enabledCompileTimeModuleSet = set()
                        configFileParserObj = configFileParser.ConfigFileParser(options.configpath + "/" + targetConfigFile, "", "#", dirSplit, dirCountPerLine, rootLogger)
                        configFileDirectiveSet = configFileParserObj.extractDirectives()
                        configFileObjFileSet = set()
                        for configFileDirective in configFileDirectiveSet:
                            rootLogger.debug("Identifying compile-time modules for directive: %s", configFileDirective)
                            objFileSet = configDirectiveToObj.get(configFileDirective, None)
                            if ( objFileSet ):
                                configFileObjFileSet.update(objFileSet)
                            else:
                                rootLogger.warning("No object file identified for directive: %s", configFileDirective)
                        rootLogger.debug("list of required object files for target configuration file %s:", targetConfigFile)
                        for objFile in configFileObjFileSet:
                            objFile = objFile.replace(srcLlvmDirectory, srcWorkingDirectory)
                            moduleSet = objFilesToModulesDict.get(objFile, set())
                            rootLogger.debug(objFile + ":")
                            for module in moduleSet:
                                rootLogger.debug("\t" + module + ":" + str(moduleOptionType.get(module, 0)))
                                if ( moduleOptionType.get(module, 0) != -1 ):
                                    enabledCompileTimeModuleSet.add(module)
                        rootLogger.info("Config file: %s modules required: (%d): %s", targetConfigFile, len(enabledCompileTimeModuleSet), str(enabledCompileTimeModuleSet))
                        compileOptExtractObj = compileOptionExtraction.CompileOptionExtraction(srcWorkingDirectory, configureCmd, configureBaselineCmd, configureHelpCmd, configureModulePrefix, configureModuleSuffix, convertModuleNameCmd, makeCmd, cleanCmd, rootLogger, appName=appName)
                        for enabledModule in enabledCompileTimeModuleSet:
                            configureCmd = configureCmd + " " + enabledModule
                            rootLogger.info("\t" + enabledModule)
                        bitcodePath = compileOptExtractObj.compileWithOptions(configureCmd)
                        if ( bitcodePath and bitcodePath != "" ):
                            copyCmd = "cp {} {}/{}.{}.bc"
                            copyCmdFinal = copyCmd.format(bitcodePath, options.bitcodeoutputpath, appName, targetConfigName)
                            returncode, out, err = util.runCommand(copyCmdFinal)
                            if ( returncode != 0 ):
                                rootLogger.error("Error running command: %s", copyCmdFinal)
                                rootLogger.error("Exiting...")
                                sys.exit(-1)
                        else:
                            rootLogger.error("bitcode not found for building module-debloated version of %s, exiting!", appName)
                            sys.exit(-1)
