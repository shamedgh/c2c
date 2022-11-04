import sys

def cleanSyscallList(syscallList):
    cleanedSyscallList = set()
    for syscall in syscallList:
        if syscall.startswith("__x64_sys_"):
            syscall = syscall.replace("__x64_sys_", "")
        cleanedSyscallList.add(syscall)
    return cleanedSyscallList

def convertStrToList(appList):
    appList = appList.replace("{", "")
    appList = appList.replace("]", "")
    appList = appList.replace("'", "")
    appList = appList.replace(" ", "")
    return appList.split(",")

inputFilePathOrig = sys.argv[1]
inputFilePathTemp = sys.argv[2]
inputFilePathConfig = sys.argv[3]
#outputFilePath = sys.argv[2]

inputFile1 = open(inputFilePathOrig, 'r')
inputLine = inputFile1.readline()

syscallToCveList = dict()

cveToCountOrig = dict()
syscallToCountOrig = dict()
while ( inputLine ):
    splittedInput = inputLine.split(";")
    cveId = splittedInput[0]
    syscallList = splittedInput[1]
    appList = splittedInput[2]
    appList = convertStrToList(appList)
    cveToCountOrig[cveId] = len(appList)
    syscallToCountOrig[syscallList] = len(appList)
    tmpSet = syscallToCveList.get(syscallList, set())
    tmpSet.add(cveId)
    syscallToCveList[syscallList] = tmpSet
#    print (cveId + ";" + str(len(appList)))
    inputLine = inputFile1.readline()

inputFile2 = open(inputFilePathTemp, 'r')
inputLine = inputFile2.readline()
cveToCountTemp = dict()
syscallToCountTemp = dict()
while ( inputLine ):
    splittedInput = inputLine.split(";")
    cveId = splittedInput[0]
    syscallList = splittedInput[1]
    cleanedSyscallList = set()
    appList = splittedInput[2]
    appList = convertStrToList(appList)
    cveToCountTemp[cveId] = len(appList)
    syscallToCountTemp[syscallList] = len(appList)
    tmpSet = syscallToCveList.get(syscallList, set())
    tmpSet.add(cveId)
    syscallToCveList[syscallList] = tmpSet

#    for syscall in syscallList:
#        if syscall.startswith("__x64_sys_"):
#            syscall = syscall.replace("__x64_sys_", "")
#            cleanedSyscallList.add(syscall)

#    cveToSyscall[cveId] = cleanedSyscallList
#    print (cveId + ";" + str(len(appList)))
    inputLine = inputFile2.readline()

inputFile3 = open(inputFilePathConfig, 'r')
inputLine = inputFile3.readline()
cveToCountConfig = dict()
syscallToCountConfig = dict()
cveToSyscall = dict()
while ( inputLine ):
    splittedInput = inputLine.split(";")
    cveId = splittedInput[0]
    syscallList = splittedInput[1]
    tmpSet = syscallToCveList.get(syscallList, set())
    tmpSet.add(cveId)
    syscallToCveList[syscallList] = tmpSet
    cleanedSyscallList = set()
    appList = splittedInput[2]
    appList = convertStrToList(appList)
    cveToCountConfig[cveId] = len(appList)
    syscallToCountConfig[syscallList] = len(appList)

#    print (cveId + ";" + str(len(appList)))
    inputLine = inputFile3.readline()


for syscallListStr, count in syscallToCountConfig.items():
    if ( syscallToCountTemp.get(syscallListStr, 0) != syscallToCountConfig[syscallListStr] ):
        syscallList = convertStrToList(syscallListStr)
        print (str(cleanSyscallList(syscallList)) + ";" + str(len(syscallToCveList[syscallListStr])) + ";" + str(syscallToCveList[syscallListStr]) + ";" + str(syscallToCountOrig.get(syscallListStr,0)) + ";" + str(syscallToCountTemp.get(syscallListStr,0)) + ";" + str(syscallToCountConfig.get(syscallListStr,0)))
