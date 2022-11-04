import sys

sys.path.insert(0, './python-utils')

import util

findAppBinCmd = "find {} -name {}"
findAppBinCmdFull = findAppBinCmd.format("/home/hamed/webserver-asr/config-driven-programs/module-mapping-work-dir/nginx-1.17.1", "nginx")
returncode, out, err = util.runCommand(findAppBinCmdFull)
if ( returncode != 0 and returncode != 1 ):
    print("Problem find app binary path: " + findAppBinCmdFull)
    print("Problem find app binary path: " + err)
    sys.exit(-1)
print ("out: " + out)

binaryNameEndsWith = "obj/nginx"
appBinPath = out.strip()
splittedAppBinPaths = appBinPath.splitlines()
print ("splitted: " + str(splittedAppBinPaths))
if ( len(splittedAppBinPaths) > 1 ):
    for currAppBinPath in splittedAppBinPaths:
        if ( currAppBinPath.endswith(binaryNameEndsWith) ):
            appBinPath = currAppBinPath

print ("appBinPath: " + appBinPath)
