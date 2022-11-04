#/bin/bash

APPNAME=$1

# run llvm-pass to build stats
cd $C2CSRC
if [ -f "$OUTPUTFOLDER/dyn.analysis.enabled" ];
then
    if [ ! -f "$OUTPUTFOLDER/c2c-static.stats" ];
    then
        ./run-stats-pass.sh $APPNAME
    fi
    cd $PYTHONFOLDER;
    python3.8 $PYTHONFOLDER/buildStats.py --app $APPNAME \
    --enabled-edges $OUTPUTFOLDER/dyn.analysis.enabled \
    --static-stats-input $OUTPUTFOLDER/c2c-static.stats \
    --outputpath $OUTPUTFOLDER/c2c-final.stats
else
    echo "dyn.analysis.enabled not found for $APPNAME, not generating stats!";
fi
