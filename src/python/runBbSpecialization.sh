#/bin/bash

APPNAME=$1
export OUTPUTFOLDER=/mnt/c2c/outputs/$APPNAME
export BASELINEFOLDER=$OUTPUTFOLDER/baseline
export TEMPORALFOLDER=$OUTPUTFOLDER/temporal/

# create output folder for app
mkdir -p $OUTPUTFOLDER;

# create output folder for previous work callgraphs (temporal, piecewise)
mkdir -p $BASELINEFOLDER;
mkdir -p $TEMPORALFOLDER;

# run piecewise
cd $C2CHOME
if [ -f "$BASELINEFOLDER/piecewise.cfg" ]; 
then
    echo "skipping piecewise analysis because files exist.";
else
    wpa -ander -dump-callgraph \
            $BITCODEPATH/$APPNAME.bc
    python3.8 $PYTHONFOLDER/convertSvfCfgToHumanReadable.py \
          $C2CHOME/callgraph_final.dot > $BASELINEFOLDER/piecewise.cfg
fi

# run temporal
cd $C2CHOME
if [ -f "$TEMPORALFOLDER/temporal.svf.type.cfg" ]; 
then
    echo "skipping temporal analysis because files exist.";
else
    $C2CBUILD/bin/c2c -temporal -fp-alloc -fp-alloc-path $TEMPORALFOLDER/temporal.fpalloc \
        -direct -direct-path $TEMPORALFOLDER/temporal.direct.cfg \
        -temporal-type-based-pruning -enable-pta \
        -ander -dump-callgraph \
        $BITCODEPATH/$APPNAME.bc
    python3.8 $PYTHONFOLDER/convertSvfCfgToHumanReadable.py \
          $C2CHOME/callgraph_final.dot > $TEMPORALFOLDER/temporal.svf.type.cfg
fi

# run c2c pass
cd $C2CSRC/
./run-pass.sh $APPNAME

# compile instrumented bitcode to binary
./build-app.sh $APPNAME

# run program
./run-app.sh $APPNAME

# extract filtered system calls
cd $PYTHONFOLDER;

# remove duplicate entries (in case checkAllConditions is called multiple times)
mv /tmp/condition.result.log /tmp/tmp.log
cat /tmp/tmp.log | sort | uniq > /tmp/condition.result.log
# convert function IDs in /tmp/condition.result.log (built by running program)
python3.8 convertFuncIdToFuncName.py --enabledconditions /tmp/condition.result.log \
 --funcidtoname $OUTPUTFOLDER/func-to-id.list \
 --output $OUTPUTFOLDER/dyn.analysis.enabled

rm /tmp/tmp.log
mv /tmp/condition.funcs.executed.log /tmp/tmp.log
cat /tmp/tmp.log | sort | uniq > /tmp/condition.funcs.executed.log
# convert function IDs in /tmp/condition.funcs.executed.log (built by running program)
python3.8 convertFuncIdToFuncName.py \
                        --enabledfunctions /tmp/condition.funcs.executed.log \
                        --funcidtoname $OUTPUTFOLDER/func-to-id.list \
                        --output $OUTPUTFOLDER/executed.funcs.list

#./createCallgraphs.sh CCFGP

./build-app-graphs.sh $APPNAME

echo "python3.8 $PYTHONFOLDER/configDrivenSyscallSpecialize.py --cfginput $GLIBCCALLGRAPH \
                --apptopropertymap $PYTHONFOLDER/app.to.properties.json \
                --binpath $BINPATH --cfgpath $OUTPUTFOLDER \
                --othercfgpath $LIBCALLGRAPHS \
                --outputpath $OUTPUTFOLDER \
                --sensitivesyscalls $PYTHONFOLDER/sensitive.syscalls \
                --sensitivestatspath $OUTPUTFOLDER/sensitive.stats \
                --sizereductionpath $OUTPUTFOLDER/sizereduction.stats \
                --syscallreductionpath $OUTPUTFOLDER/syscallreduction.stats \
                --apptolibmap $PYTHONFOLDER/app.to.lib.map.json \
                --singleappname $APPNAME"
python3.8 $PYTHONFOLDER/configDrivenSyscallSpecialize.py --cfginput $GLIBCCALLGRAPH \
                --apptopropertymap $PYTHONFOLDER/app.to.properties.json \
                --binpath $BINPATH --cfgpath $OUTPUTFOLDER \
                --othercfgpath $LIBCALLGRAPHS \
                --outputpath $OUTPUTFOLDER \
                --sensitivesyscalls $PYTHONFOLDER/sensitive.syscalls \
                --sensitivestatspath $OUTPUTFOLDER/sensitive.stats \
                --sizereductionpath $OUTPUTFOLDER/sizereduction.stats \
                --syscallreductionpath $OUTPUTFOLDER/syscallreduction.stats \
                --apptolibmap $PYTHONFOLDER/app.to.lib.map.json \
                --singleappname $APPNAME

./build-stats.sh $APPNAME
