#!/bin/bash

export C2CHOME=/home/c2c
export CONFIGPATH=$C2CHOME/configs
export PYTHONFOLDER=$C2CHOME/src/python
export LIBCALLGRAPHS=$C2CHOME/callgraphs
export GLIBCCALLGRAPH=$C2CHOME/libc-callgraphs/glibc.callgraph
export BINPATH=$C2CHOME/binaries
export BITCODEPATH=$C2CHOME/bitcodes
export BITCODEORIGPATH=$C2CHOME/bitcodes/orig
export C2CSRC=$C2CHOME/src/c++/llvm-pass
export C2CBUILD=$C2CSRC/build

# Declare an array of string with type
declare -a AppNames=("nginx.zendserver" "postgres" "memcached" "wget" "tar" "smtpd" "lighttpd" "httpd.drupal" "httpd.bitnami" "redis" "curl")
#declare -a AppNames=("smtpd")
#
#for val in ${AppNames[@]}; do
#   ./runModuleDebloating.sh $val;
#done
#
#$C2CSRC/instrumentation/instrument-all.sh $BITCODEORIGPATH $C2CSRC/instrumentation/checkCondition.bc $BITCODEPATH
 

# Iterate the string array using for loop
for val in ${AppNames[@]}; do
   ./runBbSpecialization.sh $val;
done
