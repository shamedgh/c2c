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
    if not options.apptocommandmap or not options.outputpath:
        parser.error("All options --apptocommandmap, --outputpath should be provided.")
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

    parser.add_option("", "--apptocommandmap", dest="apptocommandmap", default=None, nargs=1,
                      help="File containing application to command mapping")

    parser.add_option("", "--outputpath", dest="outputpath", default=None, nargs=1,
                      help="Path to output folder")

    parser.add_option("", "--singleappname", dest="singleappname", default=None, nargs=1,
                      help="Name of single application to run, if passed the enable/disable in the JSON file will not be considered")

    parser.add_option("-d", "--debug", dest="debug", action="store_true", default=False,
                      help="Debug enabled/disabled")

    (options, args) = parser.parse_args()
    if isValidOpts(options):
        rootLogger = setLogPath("generatecdfdata.log")
        try:
            appToCommandFile = open(options.apptocommandmap, 'r')
            appToCommandStr = appToCommandFile.read()
            appToCommandMap = json.loads(appToCommandStr)
        except Exception as e:
            rootLogger.warning("Trying to load app to command map json from: %s, but doesn't exist: %s", options.apptocommandmap, str(e))
            rootLogger.debug("Finished loading json")
            sys.exit(-1)


        '''
        - identify compile options
        - build bitcode for target program using compile option i + (prev(i)s)
        - run wpa to build ccfg and generate config init to conditional branches mapping file
        - run spa to generate bb fpalloc
        - generate callgraph and run piecewise analysis
        '''
        conditionEnabledFilePath = "/tmp/tmp.conditions.enabled"
        executedFunctionsFilePath = "/tmp/tmp.functions.executed"

        llvmLinkCommand = "/home/hamed/svf/svf.new.improved/llvm-10.0.0.obj/bin/llvm-link /home/hamed/svf/svf.new.improved/SVF/instrumentation/checkCondition.bc {} -o /tmp/tmp.wext.func.bc"
        wpaCommand = "/home/hamed/svf/svf.new.improved/llvm-10.0.0.obj/bin/opt -load /home/hamed/svf/svf.new.improved/SVF/Debug-Build/lib/libSvf.so -wpa -print-fp -dump-callgraph -ander -type-based-prune -dump-ccfg -ccfg-file /tmp/tmp.ccfg -runtime-instrument -transition-func {} -condition-use-single-annotations -instrument-functions -condition-config-type-file {} -condition-ins-to-condition-file /tmp/inst.to.condition.out /tmp/tmp.wext.func.bc -o /tmp/tmp.instrumented.bc 2>&1 | tee /tmp/tmp.log"
        spaCommand = "/home/hamed/svf/svf.new.improved/SVF/Debug-Build/bin/spa -fpanalysis /tmp/tmp.wext.func.bc -spa-fp-file /tmp/tmp.basicblock.fpalloc"

        generateGraphCmd = "/home/hamed/config-driven-specialization/createCallgraphs.sh /tmp/tmp.ccfg " + conditionEnabledFilePath + " temporal-dummy main ngx_worker_process_cycle,ngx_single_process_cycle " + executedFunctionsFilePath + " temporal-dummy temporal-dummy temporal-dummy /tmp/tmp.basicblock.fpalloc /tmp/tmp.fpalloc.wo.dyn.conditionals /tmp/tmp.removed.dyn.fp.cfg /tmp/tmp.prefinal.cfg /tmp/tmp.direct.wo.dyn.conditionals.cfg /tmp/tmp.final.cfg /home/hamed/config-driven-specialization/python-utils/graphCleaner.py /home/hamed/config-driven-specialization/python-utils/createConditionalFpGraph.py"

        extractSyscallsCmd = "python3.7 /home/hamed/config-driven-specialization/configDrivenSyscallSpecialize.py --cfginput /home/hamed/config-driven-specialization/callgraphs/glibc.callgraph --apptopropertymap /home/hamed/config-driven-specialization/app.to.properties.for.cdf.json --binpath /home/hamed/config-driven-specialization/binaries.auto --cfgpath /tmp/ --othercfgpath /home/hamed/config-driven-specialization/otherCfgs/ --outputpath /home/hamed/config-driven-specialization/outputs/ --sensitivesyscalls /home/hamed/config-driven-specialization/sensitive.syscalls --sensitivestatspath /home/hamed/config-driven-specialization/stats/sensitive.stats --syscallreductionpath /home/hamed/config-driven-specialization/stats/syscallreduction.stats --sizereductionpath /home/hamed/config-driven-specialization/stats/sizereduction.stats --apptolibmap app.to.lib.map.json --singleappname {} --bitcodepath ~/library-debloating/libsrccodes/ --onlybb --libcfunctobbpath glibc.2.23.func.to.bbcount"



        for appName, appDict in appToCommandMap.items():
            if ( (not options.singleappname and appDict.get("enable","true") == "true") or (options.singleappname and appName == options.singleappname) ):

                srcLlvmDirectory = appDict.get("src-llvm-dir")
                if ( srcLlvmDirectory.endswith("/") ):
                    srcLlvmDirectory = srcLlvmDirectory[:-1]

                srcWorkingDirectory = appDict.get("src-working-dir")
                if ( srcWorkingDirectory.endswith("/") ):
                    srcWorkingDirectory = srcWorkingDirectory[:-1]

                transitionFunction = appDict.get("transition-function")
                configTypeFile = appDict.get("config-type-file")
                configureCmd = appDict.get("configure-cmd")
                configureCmds = appDict.get("configure-cmds")
                configureBaselineCmd = appDict.get("configure-baseline-cmd")
                configureHelpCmd = appDict.get("configure-help-cmd")
                configureModulePrefix = appDict.get("configure-module-prefix")
                configureModuleSuffix = appDict.get("configure-module-suffix")
                skipModules = appDict.get("skip-modules")
                makeCmd = appDict.get("make-cmd")

                binaryNameEndsWith = appDict.get("binary-ends-with")

                convertModuleNameCmd = appDict.get("convert-module-name", "")
                dirSplit = appDict.get("dir-split", None)
                dirCountPerLine = appDict.get("dir-count-per-line", 1)
                targetConfigFiles = appDict.get("config-files")

                compileOptExtractObj = compileOptionExtraction.CompileOptionExtraction(srcWorkingDirectory, configureCmd, configureBaselineCmd, configureHelpCmd, configureModulePrefix, configureModuleSuffix, convertModuleNameCmd, makeCmd, rootLogger, appName=appName)
                moduleOptionSet = compileOptExtractObj.extractCompileOptions()
                moduleOptionList = list(moduleOptionSet)
                moduleOptionList.insert(0, "")

                i = 0
                previousConfigFailed = False
                lastModuleAdded = ""
                for configureCmdItem in configureCmds:      # In this mechanism we specify a couple of module option settings
                #for moduleOption in moduleOptionList:      # In this approach we build the binary using different modules
                    if ( i < 100 ): #and not moduleOption.startswith("--without") and moduleOption not in skipModules):

                        # 1. Compile and generate bitcode with module x
                        configureCmd = configureCmdItem        #This should be used with the configureCmds for loop

                        ## This is because there may be compile options which we derive automatically which don't actually generate a binary
                        ## since the return codes don't always seem right (0 for non-error and else for error)
                        ## we're using this hack
                        #if ( previousConfigFailed ):
                        #    rootLogger.info("last config with module: %s failed, removing that", lastModuleAdded)
                        #    configureCmd = previousConfigureCmd
                        #    previousConfigFailed = False
                        #else:
                        #    previousConfigureCmd = configureCmd

                        #lastModuleAdded = moduleOption
                        #configureCmd = configureCmd + moduleOption + " "       #This should be used with the moduleOption for loop
                        bitcodePath = compileOptExtractObj.compileWithOptions(configureCmd)

                        findAppBinCmd = "find {} -name {}"
                        findAppBinCmdFull = findAppBinCmd.format(srcWorkingDirectory, appName)
                        returncode, out, err = util.runCommand(findAppBinCmdFull)
                        if ( returncode != 0 and returncode != 1 ):
                            rootLogger.error("Problem find app binary path: %s", findAppBinCmdFull)
                            rootLogger.error("Problem find app binary path: %s", err)
                            previousConfigFailed = True
                            #sys.exit(-1)

                        appBinPath = out.strip()
                        splittedAppBinPaths = appBinPath.split("\n")
                        if ( len(splittedAppBinPaths) > 1 ):
                            for currAppBinPath in splittedAppBinPaths:
                                if ( currAppBinPath.endswith(binaryNameEndsWith) ):
                                    appBinPath = currAppBinPath
                        copyAppBinCmd = "mkdir /home/hamed/config-driven-specialization/binaries.auto/{}; cp {} /home/hamed/config-driven-specialization/binaries.auto/{}/"
                        copyAppBinCmdFull = copyAppBinCmd.format(appName, appBinPath, appName)
                        returncode, out, err = util.runCommand(copyAppBinCmdFull)
                        if ( returncode != 0 and returncode != 1 ):
                            rootLogger.error("Problem find app binary path: %s", copyAppBinCmdFull)
                            rootLogger.error("Problem find app binary path: %s", err)
                            previousConfigFailed = True
                            continue
                            #sys.exit(-1)

                        #Extract dependent libraries and copy to binary folder:
                        returncode = util.copyAllDependentLibraries(appBinPath, "/home/hamed/config-driven-specialization/binaries.auto/" + appName, rootLogger)
                        if ( returncode != 0 ):
                            rootLogger.error("Failed to copy all dependent libraries\n")
                            previousConfigFailed = True
                            continue

                        # 2. Link to add instrumentation related functions
                        llvmLinkCommandFull = llvmLinkCommand.format(bitcodePath)
                        returncode, out, err = util.runCommand(llvmLinkCommandFull, cwd=srcWorkingDirectory)
                        if ( returncode != 0 and returncode != 1 ):
                            rootLogger.error("Error running command llvm-link: %s", llvmLinkCommandFull)
                            rootLogger.error("Error running command llvm-link: %s", err)
                            previousConfigFailed = True
                            continue
                            #sys.exit(-1)

                        # 3. Run SVF against that bitcode
                        wpaCommandFull = wpaCommand.format(transitionFunction, configTypeFile)
                        returncode, out, err = util.runCommand(wpaCommandFull)
                        if ( returncode != 0 and returncode != 1 ):
                            rootLogger.error("Error running command llvm-link: %s", wpaCommandFull)
                            rootLogger.error("Error running command llvm-link: %s", err)
                            sys.exit(-1)

                        # 4. Run spa with FP analysis to build conditional fp allocation file
                        spaCommandFull = spaCommand
                        returncode, out, err = util.runCommand(spaCommandFull)
                        if ( returncode != 0 and returncode != 1 ):
                            rootLogger.error("Error running command llvm-link: %s", spaCommandFull)
                            rootLogger.error("Error running command llvm-link: %s", err)
                            sys.exit(-1)

                        # 5. Start enabling configuration writes from inst-to-condition file
                        enabledCount = 0
                        configWriteCount = 0
                        cmd = "cat /tmp/inst.to.condition.out | cut -d':' -f1 | sort | uniq | wc -l"
                        returncode, out, err = util.runCommand(cmd)
                        if ( returncode != 0 and returncode != 1 ):
                            rootLogger.error("Error running cmd: %s", cmd)
                            sys.exit(-1)
                        configWriteCount = int(out.strip())

                        # Start from enabling only one config write, and go forward
                        allEnabledSet = set()
                        while ( enabledCount <= configWriteCount ):
                            prevEnabledSetSize = len(allEnabledSet)
                            rootLogger.info("Enabled count: %d", enabledCount)
                            enabledConfigWriteSet = set()
                            conditionEnabledSet = set()
                            conditionDisabledSet = set()
                            allConditionSet = set()
                            
                            instToCondFile = open("/tmp/inst.to.condition.out", 'r')
                            inputLine = instToCondFile.readline()
                            while ( inputLine ):
                                splittedInput = inputLine.split(":")
                                configWriteIndex = splittedInput[0].strip()
                                conditionBb = splittedInput[1].strip()

                                if ( len(enabledConfigWriteSet) < enabledCount ):
                                    enabledConfigWriteSet.add(configWriteIndex)

                                if ( conditionBb not in allConditionSet ):
                                    if ( configWriteIndex in enabledConfigWriteSet ):
                                        conditionEnabledSet.add(conditionBb + "-C-T:ISENABLED")
                                        conditionEnabledSet.add(conditionBb + "-C-F:ISENABLED")
                                        allEnabledSet.add(conditionBb)
                                    else:
                                        conditionDisabledSet.add(conditionBb + "-C-T:ISDISABLED")
                                        conditionDisabledSet.add(conditionBb + "-C-F:ISDISABLED")
                                allConditionSet.add(conditionBb)
                            
                                inputLine = instToCondFile.readline()

                            instToCondFile.close()

                            if ( len(allEnabledSet) == prevEnabledSetSize ):
                                rootLogger.info("Skipping enabledCount: %d because it overlaps with previous ones\n", enabledCount)
                                enabledCount += 1
                                continue

                            conditionEnabledFile = open(conditionEnabledFilePath, 'w')
                            for conditionEnabled in conditionEnabledSet:
                                conditionEnabledFile.write(conditionEnabled + "\n")
                                conditionEnabledFile.flush()

                            for conditionDisabled in conditionDisabledSet:
                                conditionEnabledFile.write(conditionDisabled + "\n")
                                conditionEnabledFile.flush()

                            conditionEnabledFile.close()

                            #We cannot use the executed function feature of extended temporal while generating the CDF because we don't run the program
                            #So we'll just create an empty file
                            executedFunctionsFile = open(executedFunctionsFilePath, 'w')
                            executedFunctionsFile.close()

                            # 6. Now that we have the enabled/disabled conditions file created, generate the final callgraph
                            returncode, out, err = util.runCommand(generateGraphCmd)
                            if ( returncode != 0 and returncode != 1 ):
                                rootLogger.error("Problem running command: %s", generateGraphCmd)
                                rootLogger.error("Problem: %s", err)
                                sys.exit(-1)

                            extractSyscallsCmdFull = extractSyscallsCmd.format(appName)
                            returncode, out, err = util.runCommand(extractSyscallsCmdFull)
                            if ( returncode != 0 and returncode != 1 ):
                                rootLogger.error("Error running command extract syscalls: %s", extractSyscallsCmdFull)
                                rootLogger.error("Error running command extract syscalls: %s", err)
                                sys.exit(-1)
                            splittedOut = err.split("\n")
                            for line in splittedOut:
                                if ( line.startswith("Finished extracting conditional(Bb) worker system calls with len") ):
                                    splittedLine = line.split()
                                    syscallCount = int(splittedLine[8])
                                    rootLogger.info("module count: %d, enabled conditions: %d, syscall count: %d", i, enabledCount, syscallCount)
                                if ( line.startswith("Accessible library functions after library specialization:") ):
                                    splittedLine = line.split()
                                    functionCount = int(splittedLine[6])
                                    rootLogger.info("module count: %d, enabled conditions: %d, function count: %d", i, enabledCount, functionCount)
                                if ( line.startswith("final basic block count:") ):
                                    splittedLine = line.split()
                                    bbCount = int(splittedLine[4])
                                    rootLogger.info("module count: %d, enabled conditions: %d, bb count: %d", i, enabledCount, bbCount)
                                if ( line.startswith("final total size:") ):
                                    splittedLine = line.split()
                                    totalSize = int(splittedLine[3])
                                    rootLogger.info("module count: %d, enabled conditions: %d, total size: %d", i, enabledCount, totalSize)

                            enabledCount += 30

                        i += 1

