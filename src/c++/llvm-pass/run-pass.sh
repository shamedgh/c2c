#!/bin/bash
APPNAME=$1

case $APPNAME in

    "httpd.bitnami" | "httpd.drupal")
    if [ ! -f "$C2CSRC/app-types/httpd.config.types" ];
    then
        echo "Extracting nested struct types, since file has not been pregenerated"
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-types struct.server_rec \
            -only-extract-nested \
            -extract-nested $C2CSRC/app-types/httpd.config.types -exclude-nested-config-pattern struct.apr_* \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    fi
    if [ -f "$OUTPUTFOLDER/$APPNAME.c2c.ander.out" ] && \
        [ -f "$OUTPUTFOLDER/$APPNAME.instrumented.bc" ] && \
        [ -f "$OUTPUTFOLDER/app.acfg" ] && \
        [ -f "$OUTPUTFOLDER/basicblock.fpalloc" ];
    then
        echo "skipping running c2c pass, because cache is available"
    elif [ -f "$OUTPUTFOLDER/app.acfg" ];
    then
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/httpd.config.types \
            -enable-debugging -enable-instrument \
            -transition-func child_main \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -track-execution \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    else
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/httpd.config.types \
            -enable-debugging -enable-instrument \
            -transition-func child_main -enable-acfg \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -acfg-path $OUTPUTFOLDER/app.acfg \
            -c2c-enable-pta -ander -dump-callgraph \
            -temporal-type-based-pruning \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -track-execution \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    fi
    ;;

    "nginx.zendserver")
    if [ ! -f "$C2CSRC/app-types/nginx.config.types" ];
    then
        echo "Extracting nested struct types, since file has not been pregenerated"
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-types struct.ngx_core_conf_t,struct.ngx_conf_s \
            -only-extract-nested \
            -extract-nested $C2CSRC/app-types/nginx.config.types -include-nested-config-pattern *_conf_t,*_conf_s \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    fi
    if [ -f "$OUTPUTFOLDER/$APPNAME.c2c.ander.out" ] && \
        [ -f "$OUTPUTFOLDER/$APPNAME.instrumented.bc" ] && \
        [ -f "$OUTPUTFOLDER/app.acfg" ] && \
        [ -f "$OUTPUTFOLDER/basicblock.fpalloc" ];
    then
        echo "skipping running c2c pass, because cache is available"
    elif [ -f "$OUTPUTFOLDER/app.acfg" ];
    then
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/nginx.config.types \
            -enable-debugging -enable-instrument \
            -transition-func ngx_start_worker_processes \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    else
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/nginx.config.types \
            -enable-debugging -enable-instrument \
            -transition-func ngx_start_worker_processes -enable-acfg \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -acfg-path $OUTPUTFOLDER/app.acfg \
            -c2c-enable-pta -ander -dump-callgraph \
            -temporal-type-based-pruning \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    fi
    ;;

    "postgres")
    if [ -f "$OUTPUTFOLDER/$APPNAME.c2c.ander.out" ] && \
        [ -f "$OUTPUTFOLDER/$APPNAME.instrumented.bc" ] && \
        [ -f "$OUTPUTFOLDER/app.acfg" ] && \
        [ -f "$OUTPUTFOLDER/basicblock.fpalloc" ];
    then
        echo "skipping running c2c pass, because cache is available"
    elif [ -f "$OUTPUTFOLDER/app.acfg" ];
    then
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -option-mapper-struct-type struct.config_bool,struct.config_int,struct.config_real,struct.config_string,struct.config_enum \
            -option-mapper-struct-field-index 1 \
            -config-struct-type-file $C2CSRC/app-types/postgres.config.types \
            -enable-debugging -enable-instrument \
            -transition-func CreateDataDirLockFile \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    else
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -option-mapper-struct-type struct.config_bool,struct.config_int,struct.config_real,struct.config_string,struct.config_enum \
            -option-mapper-struct-field-index 1 \
            -config-struct-type-file $C2CSRC/app-types/postgres.config.types \
            -enable-debugging -enable-instrument \
            -transition-func CreateDataDirLockFile -enable-acfg \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -acfg-path $OUTPUTFOLDER/app.acfg \
            -c2c-enable-pta -ander -dump-callgraph \
            -temporal-type-based-pruning \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    fi
    ;;

    "memcached")
    if [ -f "$OUTPUTFOLDER/$APPNAME.c2c.ander.out" ] && \
        [ -f "$OUTPUTFOLDER/$APPNAME.instrumented.bc" ] && \
        [ -f "$OUTPUTFOLDER/app.acfg" ] && \
        [ -f "$OUTPUTFOLDER/basicblock.fpalloc" ];
    then
        echo "skipping running c2c pass, because cache is available"
    elif [ -f "$OUTPUTFOLDER/app.acfg" ];
    then
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/memcached.config.types \
            -enable-debugging -enable-instrument \
            -transition-func memcached_thread_init \
            -only-global-var \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    else
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/memcached.config.types \
            -enable-debugging -enable-instrument \
            -transition-func memcached_thread_init -enable-acfg \
            -only-global-var \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -acfg-path $OUTPUTFOLDER/app.acfg \
            -c2c-enable-pta -ander -dump-callgraph \
            -temporal-type-based-pruning \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    fi
    ;;
    
    "wget")
    if [ -f "$OUTPUTFOLDER/$APPNAME.c2c.ander.out" ] && \
        [ -f "$OUTPUTFOLDER/$APPNAME.instrumented.bc" ] && \
        [ -f "$OUTPUTFOLDER/app.acfg" ] && \
        [ -f "$OUTPUTFOLDER/basicblock.fpalloc" ];
    then
        echo "skipping running c2c pass, because cache is available"
    elif [ -f "$OUTPUTFOLDER/app.acfg" ];
    then
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/wget.config.types \
            -enable-debugging -enable-instrument \
            -transition-func set_uri_encoding \
            -only-global-var \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    else
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/wget.config.types \
            -enable-debugging -enable-instrument \
            -transition-func set_uri_encoding -enable-acfg \
            -only-global-var \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -acfg-path $OUTPUTFOLDER/app.acfg \
            -c2c-enable-pta -ander -dump-callgraph \
            -temporal-type-based-pruning \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    fi
    ;;

    "tar")
    if [ -f "$OUTPUTFOLDER/$APPNAME.c2c.ander.out" ] && \
        [ -f "$OUTPUTFOLDER/$APPNAME.instrumented.bc" ] && \
        [ -f "$OUTPUTFOLDER/app.acfg" ] && \
        [ -f "$OUTPUTFOLDER/basicblock.fpalloc" ];
    then
        echo "skipping running c2c pass, because cache is available"
    elif [ -f "$OUTPUTFOLDER/app.acfg" ];
    then
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-global-var subcommand_option \
            -enable-debugging -enable-instrument \
            -transition-func decode_options -instrument-after-ret \
            -only-global-var \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    else
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-global-var subcommand_option \
            -enable-debugging -enable-instrument \
            -transition-func decode_options -instrument-after-ret -enable-acfg \
            -only-global-var \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -acfg-path $OUTPUTFOLDER/app.acfg \
            -c2c-enable-pta -ander -dump-callgraph \
            -temporal-type-based-pruning \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    fi
    ;;

    "smtpd")
    if [ -f "$OUTPUTFOLDER/$APPNAME.c2c.ander.out" ] && \
        [ -f "$OUTPUTFOLDER/$APPNAME.instrumented.bc" ] && \
        [ -f "$OUTPUTFOLDER/app.acfg" ] && \
        [ -f "$OUTPUTFOLDER/basicblock.fpalloc" ];
    then
        echo "skipping running c2c pass, because cache is available"
    elif [ -f "$OUTPUTFOLDER/app.acfg" ];
    then
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/smtpd.config.types \
            -enable-debugging -enable-instrument \
            -transition-func parse_config -instrument-after-ret \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    else
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/smtpd.config.types \
            -enable-debugging -enable-instrument \
            -transition-func parse_config -instrument-after-ret -enable-acfg \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -acfg-path $OUTPUTFOLDER/app.acfg \
            -c2c-enable-pta -ander -dump-callgraph \
            -temporal-type-based-pruning \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    fi
    ;;

    "lighttpd")
    if [ -f "$OUTPUTFOLDER/$APPNAME.c2c.ander.out" ] && \
        [ -f "$OUTPUTFOLDER/$APPNAME.instrumented.bc" ] && \
        [ -f "$OUTPUTFOLDER/app.acfg" ] && \
        [ -f "$OUTPUTFOLDER/basicblock.fpalloc" ];
    then
        echo "skipping running c2c pass, because cache is available"
    elif [ -f "$OUTPUTFOLDER/app.acfg" ];
    then
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/lighttpd.config.types \
            -enable-debugging -enable-instrument \
            -transition-func server_main_loop \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    else
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/lighttpd.config.types \
            -enable-debugging -enable-instrument \
            -transition-func server_main_loop -enable-acfg \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -acfg-path $OUTPUTFOLDER/app.acfg \
            -c2c-enable-pta -ander -dump-callgraph \
            -temporal-type-based-pruning \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    fi
    ;;

    "redis")
    if [ -f "$OUTPUTFOLDER/$APPNAME.c2c.ander.out" ] && \
        [ -f "$OUTPUTFOLDER/$APPNAME.instrumented.bc" ] && \
        [ -f "$OUTPUTFOLDER/app.acfg" ] && \
        [ -f "$OUTPUTFOLDER/basicblock.fpalloc" ];
    then
        echo "skipping running c2c pass, because cache is available"
    elif [ -f "$OUTPUTFOLDER/app.acfg" ];
    then
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/redis.config.types \
            -enable-debugging -enable-instrument \
            -transition-func aeMain \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -only-global-var \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    else
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/redis.config.types \
            -enable-debugging -enable-instrument \
            -transition-func aeMain -enable-acfg \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -acfg-path $OUTPUTFOLDER/app.acfg \
            -c2c-enable-pta -ander -dump-callgraph \
            -temporal-type-based-pruning \
            -only-global-var \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    fi
    ;;

    "curl")
    if [ -f "$OUTPUTFOLDER/$APPNAME.c2c.ander.out" ] && \
        [ -f "$OUTPUTFOLDER/$APPNAME.instrumented.bc" ] && \
        [ -f "$OUTPUTFOLDER/app.acfg" ] && \
        [ -f "$OUTPUTFOLDER/basicblock.fpalloc" ];
    then
        echo "skipping running c2c pass, because cache is available"
    elif [ -f "$OUTPUTFOLDER/app.acfg" ];
    then
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/curl.config.types \
            -enable-debugging -enable-instrument \
            -transition-func parse_args -instrument-after-ret \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    else
        opt -load ${HOME}/SVF-2.2/Release-build/lib/liblibSvf.so \
            -load $C2CBUILD/src/libc2c-lib.so.12 \
            -c2c -config-struct-type-file $C2CSRC/app-types/curl.config.types \
            -enable-debugging -enable-instrument \
            -transition-func parse_args -instrument-after-ret -enable-acfg \
            -func-to-id-file $OUTPUTFOLDER/func-to-id.list \
            -acfg-path $OUTPUTFOLDER/app.acfg \
            -c2c-enable-pta -ander -dump-callgraph \
            -temporal-type-based-pruning \
            -fp-alloc-bb -fp-alloc-path $OUTPUTFOLDER/basicblock.fpalloc \
            -enable-stats -stats-path $OUTPUTFOLDER/c2c-static.stats \
            $BITCODEPATH/$APPNAME.wcheckfuncs.bc \
            -o $OUTPUTFOLDER/$APPNAME.instrumented.bc
    fi
    ;;

    "test")
    echo -n "test";
    ;;
esac
