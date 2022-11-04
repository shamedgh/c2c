import sys
sys.path.insert(0, './python-utils/')

import util

cmd = "python3.7 /home/hamed/config-driven-specialization/configDrivenSyscallSpecialize.py --cfginput /home/hamed/config-driven-specialization/callgraphs/glibc.callgraph --apptopropertymap /home/hamed/config-driven-specialization/app.to.properties.json --binpath /home/hamed/config-driven-specialization/binaries.auto --cfgpath /tmp/ --othercfgpath /home/hamed/config-driven-specialization/otherCfgs/ --outputpath /home/hamed/config-driven-specialization/outputs/ --sensitivesyscalls /home/hamed/config-driven-specialization/sensitive.syscalls --sensitivestatspath /home/hamed/config-driven-specialization/stats/sensitive.stats --syscallreductionpath /home/hamed/config-driven-specialization/stats/syscallreduction.stats --apptolibmap app.to.lib.map.json --singleappname nginx --onlybb"

r, o, e = util.runCommand(cmd)

splittedE = e.split("\n")
for split in splittedE:
    if ( split.startswith("Finished extracting conditional(Bb) worker system calls with len") ):
        print (split + "\n")
