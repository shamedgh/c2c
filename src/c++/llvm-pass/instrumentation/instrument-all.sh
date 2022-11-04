#!/bin/bash

FOLDER=$1
INPUT=$2
OUTPUT=$3

for FILE in $FOLDER/*;
do
    FILENAME=$(basename -s .bc $FILE)
    #if [ $FILENAME == "smtpd.default" ]; then
    #    llvm-link $FILE $BITCODEPATH/libs/libevent.bc -o /tmp/tmp.bc
    #    mv /tmp/tmp.bc $FILE
    #fi
    echo "llvm-link $FILE $INPUT -o $OUTPUT/$FILENAME.wcheckfuncs.bc";
    llvm-link $FILE $INPUT -o $OUTPUT/$FILENAME.wcheckfuncs.bc;
done
