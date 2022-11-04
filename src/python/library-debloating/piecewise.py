import sys
import os
import re

sys.path.insert(0, './python-utils/')

import util
import graph
import binaryAnalysis

class Piecewise:
    libcStartNodes = ['_start', '__libc_start_main', '__libc_csu_init', 'preinit_array_start', '_init', '_dl_start', '_dl_start_final', '_dl_sysdep_start', '__mach_init', '_hurd_startup', 'dl_main', '_dl_allocate_tls_init', '_dl_start_user', '_dl_init_first', '_dl_start_user']
    """
    This class can be used to perform debloating based on the piece-wise paper (they should've released and extendable code, but didn't)
    """
    def __init__(self, binaryPath, binaryCfgPath, libcCfgPath, cfgPath, logger, cfginputseparator=":"):
        self.binaryPath = binaryPath
        self.binaryCfgPath = binaryCfgPath
        self.libcCfgPath = libcCfgPath
        self.cfgPath = cfgPath
        self.libcSeparator = cfginputseparator
        self.logger = logger

    def getLibcStartNodes(self):
        return Piecewise.libcStartNodes

    def cleanLib(self, libName):
        self.logger.debug("cleanLib libName input: %s", libName)
        if ( ".so" in libName ):
            libName = re.sub("-.*so",".so",libName)
            libName = libName[:libName.index(".so")]
            #libName = libName + ".so"
        self.logger.debug("cleanLib libName output: %s", libName)
        return libName

    def createCompleteGraphWithAllNodes(self, exceptList=list()):
        # 1. extract list of required libraries
        # 2. for each library and program:
        # 3.     extract exported functions
        # 4.     create graph with labeled functions (add libname to internal function names)
        # 5. consider start nodes of program (probably main) and count number of accessible functions
        libcRelatedList = ["ld", "libc", "libdl", "libcrypt", "libnss_compat", "libnsl", "libnss_files", "libnss_nis", "libpthread", "libm", "libresolv", "librt", "libutil", "libnss_dns"]

    def createCompleteGraph(self, exceptList=list(), altLibPath=None):
        '''TODO
        1. Extract required libraries from binary (ldd)
        2. Find call graph for each library from specified folder (input: callgraph folder)
        3. Create start->leaves graph from complete call graph
        4. Create complete global graph for application along with all libraries
            Complete graph:
                Application: entire graph
                Libc: entire graph
                Other Libraries: start->leave partition
        '''
        #libcRelatedList = ["ld", "libc", "libdl", "libcrypt", "libnss_compat", "libnsl", "libnss_files", "libnss_nis", "libpthread", "libm", "libresolv", "librt", "libutil", "libnss_dns"]
        #We're removing libc from libc related list to consider it along with the other libraries
        libcRelatedList = ["ld", "libdl", "libcrypt", "libnss_compat", "libnsl", "libnss_files", "libnss_nis", "libpthread", "libm", "libresolv", "librt", "libutil", "libnss_dns"]
        librarySyscalls = set()  #Only for libraries which we DO NOT have the CFG
        libraryToPathDict = util.readLibrariesWithLddWithFullname(self.binaryPath)

        libcExportedFunctions = set()   #the libc start nodes are broken among different libraries, we need them in analyzing the libc callgraph
        for libraryName, libPath in libraryToPathDict.items():
            self.logger.debug("createCompleteGraph: extracting libc-related start nodes iterating over libName: %s libPath: %s", libraryName, libPath)
            libPathInAlt = self.existsInAltPath(libraryName, altLibPath)
            if ( libPathInAlt ):
                libPath = libPathInAlt#.strip().split("/")[-1]
            else:
                self.logger.debug("Didn't find library: %s in altpath either. Using system library or skipping!", libraryName)
            if ( ".so" in libraryName ):
                libraryName = self.cleanLib(libraryName)
                if ( libraryName in libcRelatedList ):
                    if ( os.path.isfile(libPath) ):
                        libcExportedFunctions.update(set(util.extractExportedFunctionsWithNm(libPath, self.logger)))

        libraryToFuncDict = dict()
        binaryToFuncDict = dict()

        startNodeToLibDict = dict()

        #libcGraph = graph.Graph(self.logger)
        #libcGraph.createGraphFromInput(self.libcCfgPath, self.libcSeparator)

        completeGraph = graph.Graph(self.logger)
        binaryName = self.binaryPath
        if ( "/" in binaryName ):
            binaryName = binaryName[binaryName.rindex('/')+1:]
        binaryGraphTemp = graph.Graph(self.logger)
        binaryGraphTemp.createGraphFromInput(self.binaryCfgPath)
        binaryLeafNodes = binaryGraphTemp.getAllLeafNodes()
        nonPrefixNodes = set()
        nonPrefixNodes.add("main")
        nonPrefixNodes.update(binaryLeafNodes)
        binaryWithPrefixCfgPath = util.addPrefixToCallgraph(self.binaryCfgPath, binaryName, nonPrefixNodes)
        result = completeGraph.createGraphFromInput(binaryWithPrefixCfgPath)
        if ( result == -1 ):
            self.logger.debug("Failed to create graph for input: %s", binaryWithPrefixCfgPath)
            sys.exit(-1)
        binaryAllNodes = set()
        tempNodes = completeGraph.getAllNodes()
        for node in tempNodes:
            binaryAllNodes.add(node)

        libWithCallgraphSet = set()
        for libraryName, libPath in libraryToPathDict.items():
            self.logger.debug("createCompleteGraph: iterating over libName: %s libPath: %s", libraryName, libPath)
            libPathInAlt = self.existsInAltPath(libraryName, altLibPath)
            if ( libPathInAlt ):
                libPath = libPathInAlt#.strip().split("/")[-1]
            else:
                self.logger.debug("Didn't find library: %s in altpath either. Using system library or skipping!", libraryName)
            if ( ".so" in libraryName ):
                self.logger.debug("Checking library: %s with path: %s", libraryName, libPath)
                libraryFullName = libraryName
                libraryCfgVersionedFileName = libraryFullName + ".callgraph.out"
                libraryCfgVersionedFilePath = self.cfgPath + "/" + libraryCfgVersionedFileName
                libraryCfgFileName = self.cleanLib(libraryName) + ".callgraph.out"
                libraryCfgFilePath = self.cfgPath + "/" + libraryCfgFileName
                libraryName = self.cleanLib(libraryName)
                if ( libraryName not in libcRelatedList and libraryName not in exceptList ):
                    if ( os.path.isfile(libraryCfgFilePath) ):

                        separator = "->"
                        if ( libraryName == "libc" ):
                            separator = ":"

                        libWithCallgraphSet.add(libraryName)
                        self.logger.debug("The library call graph exists for: %s", libraryName)

                        #We will generate the library callgraph by itself to extract leaf nodes (should not add prefix to them)
                        libraryGraphTemp = graph.Graph(self.logger)
                        libraryGraphTemp.createGraphFromInput(libraryCfgFilePath)
                        libraryLeafNodes = libraryGraphTemp.getAllLeafNodes()

                        libraryStartNodes = set(util.extractExportedFunctionsWithNm(libPath, self.logger))
                        if ( libraryName == "libc" ):
                            libraryStartNodes.update(libcExportedFunctions)
                        libraryToFuncDict[libraryName] = set(libraryStartNodes)  #TODO we're omitting the leaf nodes for now, because we can't differentiate between the library functions and functions called from other libraries

                        nonPrefixNodes = set()
                        nonPrefixNodes.update(libraryLeafNodes)
                        nonPrefixNodes.update(libraryStartNodes)
                        self.logger.debug("Finished extracting start nodes for library: %s", libraryName)
                        libraryWithPrefixCfgFilePath = util.addPrefixToCallgraph(libraryCfgFilePath, libraryName, nonPrefixNodes, separator)
                        self.logger.debug("Finished adding prefix to library functions: %s", libraryName)
                        completeGraph.createGraphFromInput(libraryWithPrefixCfgFilePath, separator)
                        graphTotalNodes = completeGraph.getNodeCount()
                        self.logger.debug("Finished adding library: %s to complete graph, total nodes: %d", libraryName, graphTotalNodes)

                    else:
                        self.logger.debug("Skipping library: %s because down't have callgraph: %s", libraryName, libraryCfgFilePath)
                else:
                    self.logger.debug("Skipping except list library: %s", libraryName)
            else:
                self.logger.debug("Skipping non-library: %s in binary dependencies (can happen because of /proc", libraryName)

        for libraryName, libPath in libraryToPathDict.items():
            self.logger.debug("createCompleteGraph: iterating over libName: %s libPath: %s", libraryName, libPath)
            libPathInAlt = self.existsInAltPath(libraryName, altLibPath)
            if ( libPathInAlt ):
                libPath = libPathInAlt#.strip().split("/")[-1]
            else:
                self.logger.debug("Didn't find library: %s in altpath either. Using library from system or skipping!", libraryName)
            if ( ".so" in libraryName ):
                self.logger.debug("Checking library: %s", libraryName)
                libraryFullName = libraryName
                libraryName = self.cleanLib(libraryName)
                if ( libraryName not in libWithCallgraphSet and libraryName not in libcRelatedList and libraryName not in exceptList ):
                    if ( os.path.isfile(libPath) ):#or altBinaryPath ):
                        #We don't have the CFG for this library, all exported functions will be considered as starting nodes in our final graph
                        self.logger.debug("The library call graph doesn't exist, considering all imported functions for: %s", libraryName)
                        self.logger.debug("libPath: %s", libPath)
                        libraryProfiler = binaryAnalysis.BinaryAnalysis(libPath, self.logger)
                        directSyscallSet, successCount, failedCount  = libraryProfiler.extractDirectSyscalls()
                        indirectSyscallSet = libraryProfiler.extractIndirectSyscalls(completeGraph)
                        self.logger.debug("libName: %s directSyscalls: %s", libraryName, str(directSyscallSet))
                        self.logger.debug("libName: %s indirectSyscalls: %s", libraryName, str(indirectSyscallSet))

                        librarySyscalls.update(directSyscallSet)
                        librarySyscalls.update(indirectSyscallSet)
                    else:
                        self.logger.debug("Skipping library: %s because path: %s doesn't exist", libraryName, libPath)
                else:
                    self.logger.debug("Skipping except list or with-callgraph library: %s", libraryName)
            else:
                self.logger.debug("Skipping non-library: %s in binary dependencies (can happen because of /proc", libraryName)

        return completeGraph, librarySyscalls, libraryToFuncDict, binaryAllNodes


        
        #for libraryName, libPath in libraryToPathDict.items():
        #    self.logger.info("Checking library: %s", libraryName)
        #    libraryCfgFileName = self.cleanLib(libraryName) + ".callgraph.out"
        #    libraryCfgFilePath = self.cfgPath + "/" + libraryCfgFileName
        #    if ( libraryName not in libcRelatedList and libraryName not in exceptList ):
        #        if ( os.path.isfile(libraryCfgFilePath) ):
        #            #We have the CFG for this library
        #            self.logger.info("The library call graph exists for: %s", libraryName)

        #            libraryGraph = graph.Graph(self.logger)
        #            libraryGraph.createGraphFromInput(libraryCfgFilePath)
        #            self.logger.info("Finished create graph object for library: %s", libraryName)
        #            libraryStartNodes = libraryGraph.extractStartingNodes()
        #            self.logger.info("Finished extracting start nodes for library: %s", libraryName)

        #            #We're going keep a copy of the full library call graph, for later stats creation
        #            libraryCfgGraphs[libraryName] = libraryGraph

        #            #(Step 3 in todo list): We're going to make a smaller graph containing only start nodes and end nodes
        #            #libraryStartToEndGraph = graph.Graph(self.logger)

        #            for startNode in libraryStartNodes:
        #                if ( startNodeToLibDict.get(startNode, None) ):
        #                    self.logger.warning("library startNode seen in more than one library: %s and %s", libraryName, startNodeToLibDict[startNode])
        #                startNodeToLibDict[startNode] = libraryName
        #                leaves = libraryGraph.getLeavesFromStartNode(startNode, list(), list())
        #                for leaf in leaves:
        #                    #self.logger.debug("Adding edge %s->%s from library: %s to complete graph.", startNode, leaf, libraryName)
        #                    #libraryStartToEndGraph.addEdge(startNode, leaf)
        #                    completeGraph.addEdge(startNode, leaf)
        #            #libraryGraphs[libraryName] = libraryStartToEndGraph
        #        elif ( os.path.isfile(libPath) ):
        #            #We don't have the CFG for this library, all exported functions will be considered as starting nodes in our final graph
        #            self.logger.info("The library call graph doesn't exist, considering all imported functions for: %s", libraryName)
        #            libraryProfiler = binaryAnalysis.BinaryAnalysis(libPath, self.logger)
        #            directSyscallSet, successCount, failedCount  = libraryProfiler.extractDirectSyscalls()
        #            indirectSyscallSet = libraryProfiler.extractIndirectSyscalls(libcGraph)

        #            librarySyscalls.update(directSyscallSet)
        #            librarySyscalls.update(indirectSyscallSet)
        #        else:
        #            self.logger.warning("Skipping library: %s because path: %s doesn't exist", libraryName, libPath)
        #    else:
        #        self.logger.info("Skipping except list library: %s", libraryName)

        #return completeGraph, librarySyscalls, libraryCfgGraphs, libcGraph

    def extractAccessibleSystemCalls(self, startNodes, exceptList=list()):
        libraryToVisitedFuncs = dict()
        startNodes.update(Piecewise.libcStartNodes)
        #completeGraph, librarySyscalls, libraryCfgGraphs, libcGraph = self.createCompleteGraph(exceptList)
        completeGraph, librarySyscalls, libraryToFuncDict, binaryFuncSet = self.createCompleteGraph(exceptList)

        accessibleFuncs = set()
        allVisitedNodes = set()
        accessibleSyscalls = set()
        for startNode in startNodes:
            self.logger.debug("Iterating startNode: %s", startNode)
            currentSyscalls, currentVisitedNodes = completeGraph.getSyscallFromStartNodeWithVisitedNodes(startNode)
            accessibleSyscalls.update(currentSyscalls)
            accessibleFuncs = completeGraph.dfs(startNode)
            if ( "nginx.ngx_http_xslt_filter_preconfiguration" in accessibleFuncs ):
                self.logger.debug("visited ngx_http_xslt_filter_preconfiguration\n")
            allVisitedNodes.update(accessibleFuncs)

        self.logger.debug("printing functions visited per library:")
        for libraryName, libraryFuncs in libraryToFuncDict.items():
            self.logger.debug("extractAccessibleSystemCalls iterating over library: %s", libraryName)
            libraryVisitedSet = set()
            libraryPrefix = libraryName + "."
            for function in allVisitedNodes:
                if ( function.startswith(libraryPrefix) or function in libraryFuncs ):
                    functionName = function
                    if ( function.startswith(libraryPrefix) ):
                        functionName = function.replace(libraryPrefix, "")
                    libraryVisitedSet.add(functionName)
                    if ( libraryName == "libssl" and function in libraryFuncs ):
                        self.logger.debug("adding function %s to library: %s", function, libraryPrefix)
            libraryToVisitedFuncs[libraryName] = libraryVisitedSet
            self.logger.debug("visited nodes per library: %s: %d", libraryName, len(libraryVisitedSet))
        binaryVisitedFuncs = set()
        binaryName = self.binaryPath
        if ( "/" in binaryName ):
            binaryName = binaryName[binaryName.rindex('/')+1:]
        for function in allVisitedNodes:
            if ( function in binaryFuncSet ):
                if ( function.startswith(binaryName + ".") ):
                    function = function.replace(binaryName + ".", "")
                if ( function.startswith("libc.") ):
                    self.logger.debug("function starts with libc. in binary nodes: %s", function)
                binaryVisitedFuncs.add(function)


        #for function in allVisitedNodes:
        #    if ( "xml" in function or "libxml2" in function or "libxslt" in function ):
        #        self.logger.debug(function)

        #for accessibleFunc in accessibleFuncs:
        #    self.logger.debug("Iterating accessible function: %s", accessibleFunc)
        #    currentSyscalls, currentVisitedNodes = libcGraph.getSyscallFromStartNodeWithVisitedNodes(accessibleFunc)
        #    accessibleSyscalls.update(currentSyscalls)
        #    allVisitedNodes.update(currentVisitedNodes)

        self.logger.debug("Accessible library functions after library specialization: %d", len(allVisitedNodes))
        self.logger.debug("Accessible system calls after library specialization: %d, %s", len(accessibleSyscalls), str(accessibleSyscalls))
        self.logger.debug("len(librarySyscalls): %d", len(librarySyscalls))
        accessibleSyscalls.update(librarySyscalls)
        self.logger.debug("Accessible system calls after adding libraries without cfg: %d, %s", len(accessibleSyscalls), str(accessibleSyscalls))
        return accessibleSyscalls, libraryToVisitedFuncs, binaryVisitedFuncs

    def extractAccessibleSystemCallsFromIndirectFunctions(self, directCfg, separator, exceptList=list()):
        indirectFunctionToSyscallMap = dict()

        tempGraph = graph.Graph(self.logger)
        result = tempGraph.createGraphFromInput(self.binaryCfgPath)
        indirectFunctions = tempGraph.extractIndirectOnlyFunctions(directCfg, separator)
        completeGraph, librarySyscalls, libraryCfgGraphs, libcGraph = self.createCompleteGraph(exceptList)

        for startNode in indirectFunctions:
            accessibleFuncs = set()
            allVisitedNodes = set()
            accessibleSyscalls = set()
            self.logger.debug("Iterating indirect-only function: %s", startNode)
            accessibleFuncs.update(completeGraph.getLeavesFromStartNode(startNode, list(), list(indirectFunctions)))

            for accessibleFunc in accessibleFuncs:
                self.logger.debug("Iterating accessible function: %s", accessibleFunc)
                currentSyscalls, currentVisitedNodes = libcGraph.getSyscallFromStartNodeWithVisitedNodes(accessibleFunc)
                accessibleSyscalls.update(currentSyscalls)
                allVisitedNodes.update(currentVisitedNodes)
            indirectFunctionToSyscallMap[startNode] = accessibleSyscalls
        return indirectFunctionToSyscallMap

    # This function can used instead of createCompleteGraph when we don't have access or do not require the 
    # callgraph of the binary itself (all the code in the binary is required)
    # Any imported function in the binary will be used as the starting points of this complete graph
    # The graph in this case will only consist of the libraries
    # TODO (02/2021): We have a bug here, we shouldn't check libraries with callgraphs and without in the same loop
    # We should either first create the complete graph for all libraries with a callgraph and then perform 
    # another loop for the libraries without a callgraph, or extract the start node from all libraries without 
    # a callgraph and then consider those start nodes for the complete graph
    # This bug also applies to the original createCompleteGraph
    def createCompleteGraphWithoutBinary(self, exceptList=list(), altLibPath=None, procLibraryDict=dict()):
        '''TODO
        1. Extract required libraries from binary (ldd)
        2. Find call graph for each library from specified folder (input: callgraph folder)
        3. Create start->leaves graph from complete call graph
        4. Create complete global graph for application along with all libraries
            Complete graph:
                Application: entire graph
                Libc: entire graph
                Other Libraries: start->leave partition
        '''
        libcRelatedList = ["ld", "libc", "libdl", "libcrypt", "libnss_compat", "libnsl", "libnss_files", "libnss_nis", "libpthread", "libm", "libresolv", "librt", "libutil", "libnss_dns"]
        libraryCfgGraphs = dict()
        librarySyscalls = set()  #Only for libraries which we DO NOT have the CFG
        if ( procLibraryDict and len(procLibraryDict) != 0 ):
            libraryToPathDict = procLibraryDict
            self.logger.debug("library debloating createCompleteGraphWithoutBinary library name and path received, no need for ldd")
        else:
            libraryToPathDict = util.readLibrariesWithLddWithFullname(self.binaryPath)
        #dict format: libraryName (with version and .so) -> libFullPath (might be not found if ldd is used)

        startNodeToLibDict = dict()

        libcGraph = graph.Graph(self.logger)
        libcGraph.createGraphFromInput(self.libcCfgPath, self.libcSeparator)

        completeGraph = graph.Graph(self.logger)
        result = completeGraph.createGraphFromInput(self.libcCfgPath, self.libcSeparator)

        if ( result == -1 ):
            self.logger.debug("Failed to create graph for input: %s", self.libcCfgPath)
            sys.exit(-1)

        libWithCallgraphSet = set()
        # Fixing bug: should create callgraph first, then extract start nodes and find accessible system calls        
        for libraryName, libPath in libraryToPathDict.items():
            self.logger.debug("createCompleteGraphWithoutBinary: iterating over libName: %s libPath: %s", libraryName, libPath)
            libPathInAlt = self.existsInAltPath(libraryName, altLibPath)
            if ( libPathInAlt ):
                libPath = libPathInAlt#.strip().split("/")[-1]
            else:
                self.logger.debug("Didn't find library: %s in altpath either. Using system library or skipping!", libraryName)
            if ( ".so" in libraryName ):
                self.logger.debug("Checking library: %s with path: %s", libraryName, libPath)

                ### Modified readLibsWithLdd to return full library name with version
                #altBinaryPath = self.existsInAltPath(libraryName, altLibPath)
                #if libPath == "not found":
                #    libraryFullName = altBinaryPath.strip().split("/")[-1]
                #else:
                #    libraryFullName = libPath.strip().split("/")[-1]
                libraryFullName = libraryName
                libraryCfgVersionedFileName = libraryFullName + ".callgraph.out"
                libraryCfgVersionedFilePath = self.cfgPath + "/" + libraryCfgVersionedFileName
                libraryCfgFileName = self.cleanLib(libraryName) + ".callgraph.out"
                libraryCfgFilePath = self.cfgPath + "/" + libraryCfgFileName
                libraryName = self.cleanLib(libraryName)
                if ( libraryName not in libcRelatedList and libraryName not in exceptList ):
                    #altBinaryPath = self.existsInAltPath(libraryName, altLibPath)  #Using the cleaned version causes problem for libapr
                    #if ( libPath == "not found" or libPath == "" ):
                    #    self.logger.debug("libPath: %s", libPath)
                    #    altBinaryPath = self.existsInAltPath(libraryFullName, altLibPath)
                    #else:
                    #    altBinaryPath = libPath
                    if ( os.path.isfile(libraryCfgFilePath) ):

                        ###if ( os.path.isfile(libraryCfgVersionedFilePath) ):
                        ###    libraryCfgFilePath = libraryCfgVersionedFilePath
                        ###else:
                        ###    self.logger.warning("The library callgraph exists, but the version does not match: %s", libraryCfgVersionedFileName)
                        #We have the CFG for this library
                        libWithCallgraphSet.add(libraryName)
                        self.logger.debug("The library call graph exists for: %s", libraryName)

                        libraryGraph = graph.Graph(self.logger)
                        libraryGraph.createGraphFromInput(libraryCfgFilePath)
                        self.logger.debug("Finished create graph object for library: %s", libraryName)
                        #libraryStartNodes = libraryGraph.extractStartingNodes()
                        libraryStartNodes = util.extractExportedFunctionsWithNm(libPath, self.logger)
                        self.logger.debug("Finished extracting start nodes for library: %s", libraryName)

                        #We're going keep a copy of the full library call graph, for later stats creation
                        libraryCfgGraphs[libraryName] = libraryGraph

                        #(Step 3 in todo list): We're going to make a smaller graph containing only start nodes and end nodes
                        #libraryStartToEndGraph = graph.Graph(self.logger)

                        for startNode in libraryStartNodes:
                            if ( startNodeToLibDict.get(startNode, None) ):
                                self.logger.debug("library startNode seen in more than one library: %s and %s", libraryName, startNodeToLibDict[startNode])
                            startNodeToLibDict[startNode] = libraryName
                            leaves = libraryGraph.getLeavesFromStartNode(startNode, list(), list())
                            for leaf in leaves:
                                #self.logger.debug("Adding edge %s->%s from library: %s to complete graph.", startNode, leaf, libraryName)
                                #libraryStartToEndGraph.addEdge(startNode, leaf)
                                completeGraph.addEdge(startNode, leaf)
                        #libraryGraphs[libraryName] = libraryStartToEndGraph
                    else:
                        self.logger.debug("Skipping library: %s because doesn't have callgraph: %s", libraryName, libraryCfgFilePath)
                else:
                    self.logger.debug("Skipping except list library: %s", libraryName)
            else:
                self.logger.debug("Skipping non-library: %s in binary dependencies (can happen because of /proc", libraryName)

        for libraryName, libPath in libraryToPathDict.items():
            self.logger.debug("createCompleteGraphWithoutBinary: iterating over libName: %s libPath: %s", libraryName, libPath)
            libPathInAlt = self.existsInAltPath(libraryName, altLibPath)
            if ( libPathInAlt ):
                libPath = libPathInAlt#.strip().split("/")[-1]
            else:
                self.logger.debug("Didn't find library: %s in altpath either. Using library from system or skipping!", libraryName)
            if ( ".so" in libraryName ):
                self.logger.debug("Checking library: %s", libraryName)
                libraryFullName = libraryName
                libraryName = self.cleanLib(libraryName)
                if ( libraryName not in libWithCallgraphSet and libraryName not in libcRelatedList and libraryName not in exceptList ):
                    #altBinaryPath = self.existsInAltPath(libraryName, altLibPath)  #Using the cleaned version causes problem for libapr
                    #altBinaryPath = self.existsInAltPath(libraryFullName, altLibPath)
                    if ( os.path.isfile(libPath) ):#or altBinaryPath ):
                        #We don't have the CFG for this library, all exported functions will be considered as starting nodes in our final graph
                        self.logger.debug("The library call graph doesn't exist, considering all imported functions for: %s", libraryName)
                        self.logger.debug("libPath: %s", libPath)
                        libraryProfiler = binaryAnalysis.BinaryAnalysis(libPath, self.logger)
                        directSyscallSet, successCount, failedCount  = libraryProfiler.extractDirectSyscalls()
                        indirectSyscallSet = libraryProfiler.extractIndirectSyscalls(completeGraph)
                        self.logger.debug("libName: %s directSyscalls: %s", libraryName, str(directSyscallSet))
                        self.logger.debug("libName: %s indirectSyscalls: %s", libraryName, str(indirectSyscallSet))

                        librarySyscalls.update(directSyscallSet)
                        librarySyscalls.update(indirectSyscallSet)
                    else:
                        self.logger.debug("Skipping library: %s because path: %s doesn't exist", libraryName, libPath)
                else:
                    self.logger.debug("Skipping except list library: %s", libraryName)
            else:
                self.logger.debug("Skipping non-library: %s in binary dependencies (can happen because of /proc", libraryName)

        return completeGraph, librarySyscalls, libraryCfgGraphs

    def extractAccessibleSystemCallsFromBinary(self, startNodes, exceptList=list(), altLibPath=None, procLibraryDict=dict(), addLibcStartNodes=True):
        if ( addLibcStartNodes ):
            startNodes.update(Piecewise.libcStartNodes)
        self.logger.debug("Extracting acessible system calls from binary")
        completeGraph, librarySyscalls, libraryCfgGraphs = self.createCompleteGraphWithoutBinary(exceptList, altLibPath, procLibraryDict)

        accessibleSyscalls = set()
        for startNode in startNodes:
            currentSyscalls = completeGraph.getSyscallFromStartNode(startNode)
            self.logger.debug("Iterating startNode: %s syscalls: %s", startNode, str(currentSyscalls))
            accessibleSyscalls.update(currentSyscalls)

        self.logger.debug("Accessible system calls after library specialization: %d, %s", len(accessibleSyscalls), str(accessibleSyscalls))
        self.logger.debug("len(librarySyscalls): %d", len(librarySyscalls))
        accessibleSyscalls.update(librarySyscalls)
        self.logger.debug("Accessible system calls after adding libraries without cfg: %d, %s", len(accessibleSyscalls), str(accessibleSyscalls))
        return accessibleSyscalls
        
    # checks if the library exists in the specified alternate path
    def existsInAltPath(self, libraryName, altLibPath):
        if altLibPath is None:
            return None
        self.logger.debug("existsInAltPath looking for: %s", libraryName)

        contents = os.listdir(altLibPath)

        for fileName in contents:
            cleanedLibName = self.cleanLib(libraryName)
            cleanedFileName = self.cleanLib(fileName)
            if ( cleanedLibName == cleanedFileName ):
            #if c.find(libraryName) != -1:
                self.logger.debug("existsInAltPath returning: %s", (os.path.abspath(altLibPath) + "/" + fileName))
                return os.path.abspath(altLibPath) + "/" + fileName

        return None

    # def getAltBinaryPath(self, libraryName, altLibPath):
    #     library = ""

    #     contents = os.listdir(altLibPath)

    #     for c in contents:
    #         if c.find(libraryName) != -1:
    #             return True

    #     return os.path.abspath(altLibPath) + "/" + libraryName
