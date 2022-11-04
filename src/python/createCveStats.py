import sys

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

cveToCountOrig = dict()
while ( inputLine ):
    splittedInput = inputLine.split(";")
    cveId = splittedInput[0]
    syscallList = splittedInput[1]
    appList = splittedInput[2]
    appList = convertStrToList(appList)
    cveToCountOrig[cveId] = len(appList)
#    print (cveId + ";" + str(len(appList)))
    inputLine = inputFile1.readline()

inputFile2 = open(inputFilePathTemp, 'r')
inputLine = inputFile2.readline()
cveToCountTemp = dict()
while ( inputLine ):
    splittedInput = inputLine.split(";")
    cveId = splittedInput[0]
    syscallList = splittedInput[1]
    syscallList = convertStrToList(syscallList)
    cleanedSyscallList = set()
    appList = splittedInput[2]
    appList = convertStrToList(appList)
    cveToCountTemp[cveId] = len(appList)

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
cveToSyscall = dict()
while ( inputLine ):
    splittedInput = inputLine.split(";")
    cveId = splittedInput[0]
    syscallList = splittedInput[1]
    syscallList = convertStrToList(syscallList)
    cleanedSyscallList = set()
    appList = splittedInput[2]
    appList = convertStrToList(appList)
    cveToCountConfig[cveId] = len(appList)

    for syscall in syscallList:
        if syscall.startswith("__x64_sys_"):
            syscall = syscall.replace("__x64_sys_", "")
            cleanedSyscallList.add(syscall)

    cveToSyscall[cveId] = cleanedSyscallList
#    print (cveId + ";" + str(len(appList)))
    inputLine = inputFile3.readline()

for cve, count in cveToCountConfig.items():
    if ( cveToCountTemp.get(cve, 0) != cveToCountConfig[cve] ):
        print (cve + ";" + str(cveToSyscall[cve]) + ";" + ";" + str(cveToCountOrig.get(cve,0)) + ";" + str(cveToCountTemp.get(cve,0)) + ";" + str(cveToCountConfig.get(cve,0)))
