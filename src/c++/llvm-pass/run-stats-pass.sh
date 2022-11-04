#!/bin/bash
APPNAME=$1

case $APPNAME in

    "httpd.bitnami" | "httpd.drupal")
    opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
        -load $C2CBUILD/src/libc2c-lib.so.12 \
        -c2c -config-struct-type-file $C2CSRC/app-types/httpd.config.types \
        -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
        -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
        $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
        -o /tmp/tmp.bc
    ;;

    "nginx.zendserver")
    opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
        -load $C2CBUILD/src/libc2c-lib.so.12 \
        -c2c -config-struct-type-file $C2CSRC/app-types/nginx.config.types \
        -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
        -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
        $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
        -o /tmp/tmp.bc
    ;;

    "postgres")
    opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
        -load $C2CBUILD/src/libc2c-lib.so.12 \
        -c2c -option-mapper-struct-type struct.config_bool,struct.config_int,struct.config_real,struct.config_string,struct.config_enum \
        -option-mapper-struct-field-index 1 \
        -config-struct-type-file $C2CSRC/app-types/postgres.config.types \
        -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
        -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
        $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
        -o /tmp/tmp.bc
    ;;

    "memcached")
    opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
        -load $C2CBUILD/src/libc2c-lib.so.12 \
        -c2c -config-struct-type-file $C2CSRC/app-types/memcached.config.types \
        -only-global-var \
        -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
        -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
        $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
        -o /tmp/tmp.bc
    ;;
    
    "wget")
    opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
        -load $C2CBUILD/src/libc2c-lib.so.12 \
        -c2c -config-struct-type-file $C2CSRC/app-types/wget.config.types \
        -only-global-var \
        -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
        -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
        $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
        -o /tmp/tmp.bc
    ;;

    "tar")
    opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
        -load $C2CBUILD/src/libc2c-lib.so.12 \
        -c2c -config-global-var subcommand_option \
        -only-global-var \
        -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
        -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
        $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
        -o /tmp/tmp.bc
    ;;

    "smtpd")
    opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
        -load $C2CBUILD/src/libc2c-lib.so.12 \
        -c2c -config-struct-type-file $C2CSRC/app-types/smtpd.config.types \
        -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
        -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
        $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
        -o /tmp/tmp.bc
    ;;

    "lighttpd")
    opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
        -load $C2CBUILD/src/libc2c-lib.so.12 \
        -c2c -config-struct-type-file $C2CSRC/app-types/lighttpd.config.types \
        -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
        -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
        $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
        -o /tmp/tmp.bc
    ;;

    "redis")
    opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
        -load $C2CBUILD/src/libc2c-lib.so.12 \
        -c2c -config-struct-type-file $C2CSRC/app-types/redis.config.types \
        -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
        -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
        $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
        -o /tmp/tmp.bc
    ;;

    "curl")
    opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
        -load $C2CBUILD/src/libc2c-lib.so.12 \
        -c2c -config-struct-type-file $C2CSRC/app-types/curl.config.types \
        -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
        -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
        $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
        -o /tmp/tmp.bc
    ;;

    "test")
    echo -n "test";
    ;;
esac
