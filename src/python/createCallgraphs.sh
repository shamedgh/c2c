#!/bin/bash

CCFGPATH=$1
ENABLEDCONDPATH=$2
FPALLOCPATH=$3
FUNCTIONNAME=$4
WORKERFUNCTIONNAME=$5
RUNTIMEFUNCTIONS=$6

TEMPORALCFGPATH=$7
TEMPORALDIRECTPATH=$8
TEMPORALFPOUTPATH=$9

CONDITIONALFPRAW=${10}
CONDITIONALFPALLOCPATH=${11}
REMOVEDFPALLOCPATH=${12}
CONDITIONALCFGOUTPATH=${13}
CONDITIONALDIRECTOUTPATH=${14}
CONDITIONALFPOUTPATH=${15}
CONDITIONALFPOUTPATHALLENABLED=${16}

GRAPHCLEANERSCRIPTPATH=${17}
CREATECONDFPSCRIPTPATH=${18}

echo "Deleting previously generated files"
#rm -f $TEMPORALFPOUTPATH;
#rm -f $CONDITIONALCFGOUTPATH;
#rm -f $CONDITIONALDIRECTOUTPATH;

#echo "Funcname: $FUNCTIONNAME";

CREATETEMPORALFPGRAPHCMD="python3.8 $GRAPHCLEANERSCRIPTPATH --fpanalysis --funcname $FUNCTIONNAME --output $TEMPORALFPOUTPATH --directgraphfile $TEMPORALDIRECTPATH --funcpointerfile $FPALLOCPATH -c $TEMPORALCFGPATH"
#
echo "Creating temporal FP graph";
echo "Running command: $CREATETEMPORALFPGRAPHCMD";
#
if [ -f "$TEMPORALFPOUTPATH" ];
then
    echo "skipping building temporal FP callgraph because it exists"
else
$CREATETEMPORALFPGRAPHCMD;
fi

#### create conditional call graphs based on all configs enabled 
#### (needed for apps with support for module debloating)
cat $ENABLEDCONDPATH | grep -v "\-S-T" | sed 's/ISDISABLED/ISENABLED/g' > $ENABLEDCONDPATH.all.enabled

CREATECONDITIONALCFGCMD="python3.8 $GRAPHCLEANERSCRIPTPATH --ccfg -c $CCFGPATH --converttocg $CONDITIONALCFGOUTPATH.all.enabled --enabledconditions $ENABLEDCONDPATH.all.enabled"

echo "Creating conditional callgraph";
echo "Running command: $CREATECONDITIONALCFGCMD";

if [ -f "$CONDITIONALCFGOUTPATH.all.enabled" ];
then
    echo "skipping building conditional FP callgraph because it exists"
else
$CREATECONDITIONALCFGCMD;
fi

CREATEDIRECTCFGCMD="python3.8 $GRAPHCLEANERSCRIPTPATH --ccfg -c $CCFGPATH --converttocg $CONDITIONALDIRECTOUTPATH.all.enabled --enabledconditions $ENABLEDCONDPATH.all.enabled --removeindirectedges"

echo "Creating direct callgraph from conditional cfg";
echo "Running command: $CREATEDIRECTCFGCMD";

if [ -f "$CONDITIONALDIRECTOUTPATH.all.enabled" ];
then
    echo "skipping building conditional direct callgraph because it exists"
else
$CREATEDIRECTCFGCMD;
fi

CREATECONDITIONALFPCMD="python3.8 $CREATECONDFPSCRIPTPATH --funcpointerfile $CONDITIONALFPRAW --output $CONDITIONALFPALLOCPATH.all.enabled --removedfuncpointerout $REMOVEDFPALLOCPATH.all.enabled  --ccfg $CCFGPATH --enabledconditions $ENABLEDCONDPATH.all.enabled"

echo "Creating conditional FP allocation file";
echo "Running command: $CREATECONDITIONALFPCMD";

if [ -f "$CONDITIONALFPALLOCPATH.all.enabled" ];
then
    echo "skipping building conditional FP alloc because it exists"
else
$CREATECONDITIONALFPCMD;
fi

CREATECONDITIONALFPGRAPHCMD="python3.8 $GRAPHCLEANERSCRIPTPATH --fpanalysis --funcname $WORKERFUNCTIONNAME --output $CONDITIONALFPOUTPATHALLENABLED --directgraphfile $CONDITIONALDIRECTOUTPATH.all.enabled --funcpointerfile $CONDITIONALFPALLOCPATH.all.enabled -c $CONDITIONALCFGOUTPATH.all.enabled --removedfuncpointerfile $REMOVEDFPALLOCPATH.all.enabled --runtimeexecutedfunctionsfile $RUNTIMEFUNCTIONS"

echo "Creating conditional FP graph";
echo "Running command: $CREATECONDITIONALFPGRAPHCMD";

if [ -f "$CONDITIONALFPOUTPATHALLENABLED" ];
then
    echo "skipping building conditional callgraph because it exists"
else
$CREATECONDITIONALFPGRAPHCMD;
fi

#### create conditional call graphs based on branches enabled at runtime
CREATECONDITIONALCFGCMD="python3.8 $GRAPHCLEANERSCRIPTPATH --ccfg -c $CCFGPATH --converttocg $CONDITIONALCFGOUTPATH --enabledconditions $ENABLEDCONDPATH"

echo "Creating conditional callgraph";
echo "Running command: $CREATECONDITIONALCFGCMD";

if [ -f "$CONDITIONALCFGOUTPATH" ];
then
    echo "skipping building conditional callgraph because it exists"
else
$CREATECONDITIONALCFGCMD;
fi

CREATEDIRECTCFGCMD="python3.8 $GRAPHCLEANERSCRIPTPATH --ccfg -c $CCFGPATH --converttocg $CONDITIONALDIRECTOUTPATH --enabledconditions $ENABLEDCONDPATH --removeindirectedges"

echo "Creating direct callgraph from conditional cfg";
echo "Running command: $CREATEDIRECTCFGCMD";

if [ -f "$CONDITIONALDIRECTOUTPATH" ];
then
    echo "skipping building conditional direct callgraph because it exists"
else
$CREATEDIRECTCFGCMD;
fi


CREATECONDITIONALFPCMD="python3.8 $CREATECONDFPSCRIPTPATH --funcpointerfile $CONDITIONALFPRAW --output $CONDITIONALFPALLOCPATH --removedfuncpointerout $REMOVEDFPALLOCPATH  --ccfg $CCFGPATH --enabledconditions $ENABLEDCONDPATH"

echo "Creating conditional FP allocation file";
echo "Running command: $CREATECONDITIONALFPCMD";

if [ -f "$CONDITIONALFPALLOCPATH" ];
then
    echo "skipping building conditional FP alloc because it exists"
else
$CREATECONDITIONALFPCMD;
fi

CREATECONDITIONALFPGRAPHCMD="python3.8 $GRAPHCLEANERSCRIPTPATH --fpanalysis --funcname $WORKERFUNCTIONNAME --output $CONDITIONALFPOUTPATH --directgraphfile $CONDITIONALDIRECTOUTPATH --funcpointerfile $CONDITIONALFPALLOCPATH -c $CONDITIONALCFGOUTPATH --removedfuncpointerfile $REMOVEDFPALLOCPATH --runtimeexecutedfunctionsfile $RUNTIMEFUNCTIONS"

echo "Creating conditional FP graph";
echo "Running command: $CREATECONDITIONALFPGRAPHCMD";

if [ -f "$CONDITIONALFPOUTPATH" ];
then
    echo "skipping building conditional callgraph with fp removed because it exists"
else
$CREATECONDITIONALFPGRAPHCMD;
fi
