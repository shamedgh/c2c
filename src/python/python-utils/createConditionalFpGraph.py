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
    if not options.ccfg or not options.funcpointerfile or not options.enabledconditions:
        parser.error("The ccfg, fp graph and enabled options must be specified.")
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
    parser.add_option("", "--funcpointerfile", dest="funcpointerfile", default=None, nargs=1,
                      help="CFG with functions assigned as function pointers")

    parser.add_option("-o", "--output", dest="output", default="fp.wo.conditions", nargs=1,
                      help="Path to store cleaned CFG output")

    parser.add_option("", "--removedfuncpointerout", dest="removedfuncpointerout", default="removed.fp", nargs=1,
                      help="Function assignments which are removed because of conditional statements which are false")

    parser.add_option("", "--ccfg", dest="ccfg", default=None, nargs=1,
                      help="Conditional control flow graph")

    parser.add_option("", "--enabledconditions", dest="enabledconditions", default=None, nargs=1, 
                      help="Enabled conditions")

    parser.add_option("-d", "--debug", dest="debug", action="store_true", default=False,
                      help="Debug enabled/disabled")

    (options, args) = parser.parse_args()
    if isValidOpts(options):
        rootLogger = setLogPath("createconditionalfpgraph.log")
        myGraph = graph.Graph(rootLogger)
        rootLogger.info("Creating CFG...")

        if ( options.ccfg ):
            rootLogger.info("options.ccfg enabled, running create ccfg function")
            enabledConditionSet = set()
            disabledConditionSet = set()
            if ( options.enabledconditions ):
                conditionFile = open(options.enabledconditions, 'r')
                inputLine = conditionFile.readline()
                while ( inputLine ):
                    inputLine = inputLine.strip()
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

                    #if ( inputLine.endswith("-C:ISENABLED") ):
                    #    inputLine = inputLine.replace("-C:ISENABLED", "")
                    #    enabledConditionSet.add(inputLine)
                    #elif ( inputLine.endswith("-C:ISDISABLED") ):
                    #    inputLine = inputLine.replace("-C:ISDISABLED", "")
                    #    disabledConditionSet.add(inputLine)
                    inputLine = conditionFile.readline()
            removeIndirectEdges = False
            intraproceduralOnly = True 
            myGraph.createConditionalControlFlowGraph(options.ccfg, False, None, enabledConditionSet, disabledConditionSet, removeIndirectEdges, intraproceduralOnly)

            edgeSet = set()
            removedEdgeSet = set()
            outputFile = open(options.output, 'w')
            removedFpFile = open(options.removedfuncpointerout, 'w')
            fpFile = open(options.funcpointerfile, 'r')
            fpLine = fpFile.readline()
            while ( fpLine ):
                fpLine = fpLine.strip()
                assignerBb = fpLine.split("->")[0]
                assignerFunc = assignerBb
                if ( "|" in assignerBb ):
                    assignerFunc = assignerBb[:assignerBb.index("|")]
                else:
                    rootLogger.error("func pointer file doesn't have | in assigner: %s\n", fpLine)
                assigneeFunc = fpLine.split("->")[1]

                if ( (assignerFunc + "|0") == assignerBb or myGraph.isAccessible(assignerFunc + "|0", assignerBb) ):
                    edge = assignerFunc + "->" + assigneeFunc
                    if ( edge not in edgeSet ):
                        edgeSet.add(edge)
                        outputFile.write(edge + "\n")
                        outputFile.flush()
                else:
                    edge = assignerFunc + "->" + assigneeFunc
                    if ( edge not in removedEdgeSet ):
                        removedEdgeSet.add(edge)
                        removedFpFile.write(edge + "\n")
                        removedFpFile.flush()
                    
                    rootLogger.debug("assigner: %s to assignee: %s is not accessible\n", assignerFunc, assigneeFunc)

                fpLine = fpFile.readline()
            fpFile.close()
            outputFile.close()
            removedFpFile.close()
