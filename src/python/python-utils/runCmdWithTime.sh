#!/bin/bash

RUNCOUNT=$1
CMD=$2
ARGS=$3

echo "cmd: $CMD $ARGS";
counter=0
while [ $counter -le $RUNCOUNT ]
do
    SECONDS=0;
    echo "Running for $counter time";
    $CMD $ARGS;
    ((counter++))
    echo $SECONDS >> out.log
done

echo "----------------> It took $SECONDS seconds";
