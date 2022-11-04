#/bin/bash

APPNAME=$1
export OUTPUTFOLDER=/mnt/c2c/outputs/$APPNAME/module-debloating
export APPSRCFOLDER=$BINPATH/srcs/$APPNAME
export APPSRCWORKING=$BINPATH/workdir/$APPNAME

mkdir -p $APPSRCWORKING;
cp -R $APPSRCFOLDER/* $APPSRCWORKING/

mkdir -p $OUTPUTFOLDER

#'''
#
#### TODO ### 
#    the app name for module debloating should not have options in the name
#    whereas for BB spec. we are currently using appname.option for the app name
#    if it supports module debloating
#    we need to make this consistent somehow!
#### TODO ###
#
#1. build app with LTO so each object file is bitcode (everything enabled)
#2. run LLVM pass to create mapping between runtime options and object files
#3. build mapping between compile -> runtime options
#4. use set of runtime configuration files to identify which modules are required
#5. build app with required modules and generate bitcode
#6. link generated bitcode with solver `checkCondition` bitcode file
#'''

cd $PYTHONFOLDER;
# perform module debloating 
python3.8 mapRuntimeToCompile.py --apptomodulemap app.to.modules.json \
 --outputpath $OUTPUTFOLDER \
 --bitcodeoutputpath $BITCODEORIGPATH \
 --configpath $CONFIGPATH \
 --singleappname $APPNAME

if [ $APPNAME == "smtpd" ]; then
    llvm-link $BITCODEPATH/libs/libevent
fi
