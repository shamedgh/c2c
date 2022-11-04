import sys
import os
import re

sys.path.insert(0, './python-utils/')

import util

class ConfigFileParser:
    """
    This class can be used to extract the compile-time options of a program and map them to their respective object files
    """
    def __init__(self, configFilePath, configFileFormat, commentChar, directiveSplit, directiveCountPerLine, logger):
        self.configFilePath = configFilePath
        self.configFileFormat = configFileFormat    #default: key: valiue
        if ( commentChar ):
            self.commentChar = commentChar
        else:
            self.commentChar = "#"

        if ( directiveSplit ):
            self.directiveSplit = directiveSplit
        else:
            self.directiveSplit = None

        if ( directiveCountPerLine ):
            self.directiveCountPerLine = directiveCountPerLine
        else:
            self.directiveCountPerLine = 1
        self.logger = logger

    def extractDirectives(self):
        directiveSet = set()
        configFile = open(self.configFilePath, 'r')
        configFileLine = configFile.readline()
        while ( configFileLine ):
            configFileLine = configFileLine.strip()
            if ( not configFileLine.startswith(self.commentChar) ):
                if ( configFileLine.startswith("{") ):
                    configFileLine = configFileLine[1:]
                configFileLine = configFileLine.replace("}", "")
                splittedLine = configFileLine.split()
                i = 0
                while ( i < len(splittedLine) and i < self.directiveCountPerLine ):
                    currDir = splittedLine[i]
                    if ( self.directiveSplit and self.directiveSplit in currDir ):
                        for currDirSplit in currDir.split(self.directiveSplit):
                            directiveSet.add(currDirSplit)
                    else:
                        directiveSet.add(currDir)
                    i += 1
            
            configFileLine = configFile.readline()
        return directiveSet
