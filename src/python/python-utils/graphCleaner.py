import os, sys, subprocess, signal
import logging
import optparse

import graph
import callfunctiongraph

def isValidOpts(opts):
    """
    Check if the required options are sane to be accepted
        - Check if the provided files exist
        - Check if two sections (additional data) exist
        - Read all target libraries to be debloated from the provided list
    :param opts:
    :return:
    """
    if not options.cleancfg and not options.ccfg and not options.fpanalysis and not options.minremovable and not options.fpanalysisnew and not options.isaccessible:
        parser.error("At least one of the functionalities: ccfg, isaccessible, cleancfg, fpanalysis or minremovable should be used")
        return False
    if not options.cfginput:
        parser.error("CFG Input must be specifiec with -c")
        return False

    if options.cleancfg and (not options.cfginput or not options.separator or not options.input):
        parser.error("All options -c, -i and -s should be provided.")
        return False
    elif options.isaccessible and (not options.startfunc or (not options.targetfunc and not options.targetfuncfile)):
        parser.error("qwerqwer All options -c, --isaccessible, --startfunc and either --targetfunc or --targetfuncfile) should be provided.")
        return False
    elif (options.ccfg and ( not options.startfunc or (not options.targetfunc and not options.targetfuncfile)) and ( not options.converttocg )):
        parser.error("When ccfg is chosen either --startfunc and either --targetfunc or --targetfuncfile should be provided or --converttocg.")
        return False
    elif (options.fpanalysis or options.fpanalysisnew) and (not options.funcname or not options.funcpointerfile or not options.directgraphfile or not options.output):
        parser.error("All options --funcname, --output, --directgraphfile, --funcpointerfile should be provided.")
        return False
    elif options.minremovable and (not options.conditionalgraphfile or not options.minremovestart or not options.minremoveend or not options.minremovemaxdepth):
        parser.error("All options --minremovestart, --conditionalgraphfile, --minremoveend and --minremovemaxdepth should be provided.")
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
    parser.add_option("-c", "--cfginput", dest="cfginput", default=None, nargs=1,
                      help="CFG input for creating graph from CFG")

    parser.add_option("-s", "--separator", dest="separator", default="->", nargs=1,
                      help="CFG file separator per line")

    parser.add_option("-o", "--output", dest="output", default=None, nargs=1,
                      help="Path to store cleaned CFG output")

    parser.add_option("", "--isaccessible", dest="isaccessible", action="store_true", default=False, 
                      help="Check accessibility")

    ### Conditional CFG Options ###
    parser.add_option("", "--ccfg", dest="ccfg", action="store_true", default=False,
                      help="Conditional control flow graph")

    parser.add_option("", "--keepallconditional", dest="keepallconditional", action="store_true", default=False,
                      help="Keep all conditional edges?")

    parser.add_option("", "--enabledconditions", dest="enabledconditions", default=None, nargs=1, 
                      help="Enabled conditions")

    parser.add_option("", "--removeindirectedges", dest="removeindirectedges", action="store_true", default=False, 
                      help="Remove indirect call edges")

    parser.add_option("", "--startfunc", dest="startfunc", default=None, nargs=1,
                      help="Start function")

    parser.add_option("", "--targetfunc", dest="targetfunc", default=None, nargs=1,
                      help="Target function")

    parser.add_option("", "--targetfuncfile", dest="targetfuncfile", default=None, nargs=1,
                      help="Target function file path")

    parser.add_option("", "--printpaths", dest="printpaths", action="store_true", default=False,
                      help="Enable printing all paths")

    parser.add_option("", "--converttocg", dest="converttocg", default=None, nargs=1,
                      help="Convert to call graph and write to file")

    ### Kernel CFG Cleaner Options ###
    parser.add_option("", "--cleancfg", dest="cleancfg", action="store_true", default=False,
                      help="Clean CFG based on start nodes")

    parser.add_option("-i", "--input", dest="input", default=None, nargs=1,
                      help="Starting points which should be removed or kept")

    parser.add_option("-v", "--inverse", dest="inverse", action="store_true", default=False, help="Starting points which should be removed or kept")

    ### Function Pointer Analysis ###
    parser.add_option("", "--fpanalysisnew", dest="fpanalysisnew", action="store_true", default=False,
                      help="Fun function pointer analysis")

    parser.add_option("", "--fpanalysis", dest="fpanalysis", action="store_true", default=False,
                      help="Fun function pointer analysis")

    parser.add_option("", "--directgraphfile", dest="directgraphfile", default=None, nargs=1,
                      help="CFG input for direct graph to be applied to the original CFG")

    parser.add_option("", "--funcpointerfile", dest="funcpointerfile", default=None, nargs=1,
                      help="CFG with functions assigned as function pointers")

    parser.add_option("", "--removedfuncpointerfile", dest="removedfuncpointerfile", default=None, nargs=1,
                      help="Function assignments removed based on conditional statements")

    parser.add_option("", "--runtimeexecutedfunctionsfile", dest="runtimeexecutedfunctionsfile", default=None, nargs=1,
                      help="File containing functions which were executed at runtime")

    parser.add_option("-f", "--funcname", dest="funcname", default=None, nargs=1,
                      help="Function name(s)")

    ### Configuration-Guarded Edge Identification ###
    parser.add_option("", "--minremovable", dest="minremovable", action="store_true", default=False,
                      help="Test minimum removable functionality")

    parser.add_option("", "--conditionalgraphfile", dest="conditionalgraphfile", default=None, nargs=1,
                      help="CFG input for conditional graph to be applied to the original CFG")

    parser.add_option("", "--minremovestart", dest="minremovestart", default=None, nargs=1,
                      help="Start node for minimum removable edge")

    parser.add_option("", "--minremoveend", dest="minremoveend", default=None, nargs=1,
                      help="End node for minimum removable edge")

    parser.add_option("", "--minremovemaxdepth", dest="minremovemaxdepth", default=None, nargs=1,
                      help="Max depth for minimum removable edge")


    parser.add_option("-d", "--debug", dest="debug", action="store_true", default=False,
                      help="Debug enabled/disabled")

    (options, args) = parser.parse_args()
    if isValidOpts(options):
        rootLogger = setLogPath("graphcleaner.log")
        myGraph = graph.Graph(rootLogger)
        rootLogger.info("Creating CFG...")
        if ( not options.ccfg ):
            myGraph.createGraphFromInput(options.cfginput, options.separator)

        if ( options.cleancfg ):
            keepList = list()
            allStartingNodes = myGraph.extractStartingNodes()
            rootLogger.info("CFG start nodes: %s", str(allStartingNodes))
            rootLogger.info("CFG len(start nodes): %d", len(allStartingNodes))
            rootLogger.info("CFG node count: %d", myGraph.getNodeCount())
            #allNodesBase = myGraph.getAllNodes()
            myCfg = callfunctiongraph.CallFunctionGraph(myGraph, rootLogger, options.cfginput)
            
            #allNodesCfg = set()
            #nodeDfsDict = myCfg.createAllDfs(myGraph.extractStartingNodes())
            #for key, value in nodeDfsDict.items():
            #    allNodesCfg.add(key)
            #    allNodesCfg.update(value)

            #rootLogger.debug("allNodesBase - allNodesCfg = %s", str(allNodesBase-allNodesCfg))

            inputFile = open(options.input, 'r')
            inputLine = inputFile.readline()
            while ( inputLine ):
                keepList.append(inputLine.strip())
                inputLine = inputFile.readline()

            rootLogger.info("Starting to remove starting nodes")
            if ( options.inverse ):
                nodeDfsDict = myCfg.removeSelectStartNodes(keepList, True)
            else:
                nodeDfsDict = myCfg.removeSelectStartNodes(keepList, False)

            #Apply modification to input CFG
            if ( not options.output ):
                outputPath = options.cfginput + ".start.nodes.only"
            allNodes = set()
            for key, value in nodeDfsDict.items():
                allNodes.add(key)
                allNodes.update(value)

            outputFile = open(outputPath, 'w')
            cfgFile = open(options.cfginput, 'r')
            cfgLine = cfgFile.readline()
            while ( cfgLine ):
                caller = cfgLine.split(options.separator)[0].strip()
                rootLogger.debug("Removing %s from CFG file", caller)
                if ( caller in allNodes ):
                    outputFile.write(cfgLine)
                cfgLine = cfgFile.readline()

            outputFile.close()
            cfgFile.close()

        elif ( options.isaccessible and not options.ccfg):
            if ( options.targetfunc ):
                if ( options.printpaths ):
                    allPaths = myGraph.printAllPaths(options.startfunc, options.targetfunc, False)
                    rootLogger.info("allPaths: %s", allPaths)
                else:
                    isAccessible = myGraph.isAccessible(options.startfunc, options.targetfunc)
                    rootLogger.info("isAccessible: %s", isAccessible)
            elif ( options.targetfuncfile ):
                targetFuncFile = open(options.targetfuncfile, 'r')
                inputLine = targetFuncFile.readline()
                while ( inputLine ):
                    inputLine = inputLine.strip()
                    if ( options.printpaths ):
                        allPaths = myGraph.printAllPaths(options.startfunc, inputLine)
                        rootLogger.info("allPaths to %s: %s", inputLine, allPaths)
                    else:
                        isAccessible = myGraph.isAccessible(options.startfunc, inputLine)
                        rootLogger.info("%s isAccessible: %s", inputLine, isAccessible)
                    
                    inputLine = targetFuncFile.readline()
            #rootLogger.info("isAccessible: %s", isAccessible)
        elif ( options.ccfg ):
            rootLogger.info("options.ccfg enabled, running create ccfg function")
            enabledConditionSet = set()
            disabledConditionSet = set()
            if ( options.enabledconditions ):
                conditionFile = open(options.enabledconditions, 'r')
                inputLine = conditionFile.readline()
                while ( inputLine ):
                    inputLine = inputLine.strip()
                    #if ( inputLine.endswith("-C:ISENABLED") ):
                    #    inputLine = inputLine.replace("-C:ISENABLED", "")
                    #    enabledConditionSet.add(inputLine)
                    #elif ( inputLine.endswith("-C:ISDISABLED") ):
                    #    inputLine = inputLine.replace("-C:ISDISABLED", "")
                    #    disabledConditionSet.add(inputLine)
                    if ( inputLine.endswith("-C-T:ISENABLED") ):
                        inputLine = inputLine.replace(":ISENABLED", "")
                        enabledConditionSet.add(inputLine)
                    elif ( inputLine.endswith("-C-T:ISDISABLED") ):
                        inputLine = inputLine.replace(":ISDISABLED", "")
                        disabledConditionSet.add(inputLine)
                    elif ( inputLine.endswith("-C-F:ISENABLED") ):
                        inputLine = inputLine.replace(":ISENABLED", "")
                        enabledConditionSet.add(inputLine)
                    elif ( inputLine.endswith("-C-F:ISDISABLED") ):
                        inputLine = inputLine.replace(":ISDISABLED", "")
                        disabledConditionSet.add(inputLine)
                    elif ( inputLine.endswith("-S-T:ISENABLED") ):
                        inputLine = inputLine.replace(":ISENABLED", "")
                        enabledConditionSet.add(inputLine)
                    elif ( "-S-T->" in inputLine and inputLine.endswith(":ISENABLED") ):
                        inputLine = inputLine.replace(":ISENABLED", "")
                        enabledConditionSet.add(inputLine)
                        # when a switch-case is not config-related we need to enable
                        # all cases, but how can we know that it's not config based?
                        # in the if/else case no C-T or C-F in the enabled file meant
                        # that it's not config-based
                        # here for any case to know that no other case has been enabled
                        # either we will add the following to the cases
                        # now each case can check for this general enabled instance to
                        # to figure out whether or not any other case was enabled in this file
                        caller = inputLine.split("-S-T->")[0]
                        enabledConditionSet.add(caller+"-S-T->")    # generalize so that we know at least one case is enabled
                    inputLine = conditionFile.readline()
                
            myGraph.createConditionalControlFlowGraph(options.cfginput, options.keepallconditional, None, enabledConditionSet, disabledConditionSet, options.removeindirectedges)
            #isAccessible = myGraph.isAccessible(options.startfunc, options.targetfunc)
            if ( options.converttocg ):
                rootLogger.info("Converting CCFG to call graph and writing to: %s", options.converttocg)
                callGraph = myGraph.convertCcfgToCallGraph()
                callGraph.dumpToFile(options.converttocg)
            elif ( options.targetfunc ):
                if ( options.printpaths ):
                    allPaths = myGraph.printAllPaths(options.startfunc, options.targetfunc, False)
                    rootLogger.info("allPaths: %s", allPaths)
                else:
                    isAccessible = myGraph.isAccessible(options.startfunc, options.targetfunc)
                    rootLogger.info("isAccessible: %s", isAccessible)
            elif ( options.targetfuncfile ):
                targetFuncFile = open(options.targetfuncfile, 'r')
                inputLine = targetFuncFile.readline()
                while ( inputLine ):
                    inputLine = inputLine.strip()
                    if ( options.printpaths ):
                        allPaths = myGraph.printAllPaths(options.startfunc, inputLine)
                        rootLogger.info("allPaths to %s: %s", inputLine, allPaths)
                    else:
                        isAccessible = myGraph.isAccessible(options.startfunc, inputLine)
                        rootLogger.info("%s isAccessible: %s", inputLine, isAccessible)
                    
                    inputLine = targetFuncFile.readline()
            #rootLogger.info("isAccessible: %s", isAccessible)
        elif ( options.fpanalysis ):
            myGraph.pruneInaccessibleFunctionPointers(options.funcname, options.funcpointerfile, options.directgraphfile, options.separator, options.output, options.removedfuncpointerfile, options.runtimeexecutedfunctionsfile)
        elif ( options.fpanalysisnew ):
            myGraph.pruneAllFunctionPointersNotAccessibleFromChild(options.funcname, options.funcpointerfile, options.directgraphfile, options.separator, options.output)
        elif ( options.minremovable ):
            myGraph.minimumRemovableEdges(options.conditionalgraphfile, options.separator, options.minremovestart, options.minremoveend, int(options.minremovemaxdepth))
