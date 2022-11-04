"""
Extract the syscalls for each process

"""
import logging
import os
import sys
import json
import configFileParser

sys.path.insert(0, './python-utils/')

import util

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
    if not options.configinput:
        parser.error("All options --configinput should be provided.")
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

    parser.add_option("", "--configinput", dest="configinput", default=None, nargs=1,
                      help="Configuration input file")

    parser.add_option("-d", "--debug", dest="debug", action="store_true", default=False,
                      help="Debug enabled/disabled")

    (options, args) = parser.parse_args()
    if isValidOpts(options):
        rootLogger = setLogPath("configfileparsertest.log")
        configFileObj = configFileParser.ConfigFileParser(options.configinput, "", "#", rootLogger)
        rootLogger.info(str(configFileObj.extractDirectives()))
