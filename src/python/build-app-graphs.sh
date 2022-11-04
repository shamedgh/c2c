#!/bin/bash
APPNAME=$1

case $APPNAME in

    "httpd.drupal")
    ./createCallgraphs.sh $OUTPUTFOLDER/app.acfg \
                      $OUTPUTFOLDER/dyn.analysis.enabled \
                      $TEMPORALFOLDER/temporal.fpalloc \
                      main \
                      child_main,listener_thread \
                      $OUTPUTFOLDER/executed.funcs.list \
                      $TEMPORALFOLDER/temporal.svf.type.cfg \
                      $TEMPORALFOLDER/temporal.direct.cfg \
                      $TEMPORALFOLDER/temporal.svf.type.fp.wglobal.cfg \
                      $OUTPUTFOLDER/basicblock.fpalloc \
                      $OUTPUTFOLDER/fpalloc.wo.dyn.conditionals \
                      $OUTPUTFOLDER/removed.dyn.fp.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/direct.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.fp.wglobal.cfg \
                      $OUTPUTFOLDER/svf.type.wall.dyn.conditionals.fp.wglobal.cfg \
                      $PYTHONFOLDER/python-utils/graphCleaner.py \
                      $PYTHONFOLDER/python-utils/createConditionalFpGraph.py
    ;;

    "httpd.bitnami")
    ./createCallgraphs.sh $OUTPUTFOLDER/app.acfg \
                      $OUTPUTFOLDER/dyn.analysis.enabled \
                      $TEMPORALFOLDER/temporal.fpalloc \
                      main \
                      child_main,listener_thread \
                      $OUTPUTFOLDER/executed.funcs.list \
                      $TEMPORALFOLDER/temporal.svf.type.cfg \
                      $TEMPORALFOLDER/temporal.direct.cfg \
                      $TEMPORALFOLDER/temporal.svf.type.fp.wglobal.cfg \
                      $OUTPUTFOLDER/basicblock.fpalloc \
                      $OUTPUTFOLDER/fpalloc.wo.dyn.conditionals \
                      $OUTPUTFOLDER/removed.dyn.fp.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/direct.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.fp.wglobal.cfg \
                      $OUTPUTFOLDER/svf.type.wall.dyn.conditionals.fp.wglobal.cfg \
                      $PYTHONFOLDER/python-utils/graphCleaner.py \
                      $PYTHONFOLDER/python-utils/createConditionalFpGraph.py
    ;;

    "nginx.zendserver")
    ./createCallgraphs.sh $OUTPUTFOLDER/app.acfg \
                      $OUTPUTFOLDER/dyn.analysis.enabled \
                      $TEMPORALFOLDER/temporal.fpalloc \
                      main \
                      main,ngx_worker_process_cycle,ngx_single_process_cycle \
                      $OUTPUTFOLDER/executed.funcs.list \
                      $TEMPORALFOLDER/temporal.svf.type.cfg \
                      $TEMPORALFOLDER/temporal.direct.cfg \
                      $TEMPORALFOLDER/temporal.svf.type.fp.wglobal.cfg \
                      $OUTPUTFOLDER/basicblock.fpalloc \
                      $OUTPUTFOLDER/fpalloc.wo.dyn.conditionals \
                      $OUTPUTFOLDER/removed.dyn.fp.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/direct.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.fp.wglobal.cfg \
                      $OUTPUTFOLDER/svf.type.wall.dyn.conditionals.fp.wglobal.cfg \
                      $PYTHONFOLDER/python-utils/graphCleaner.py \
                      $PYTHONFOLDER/python-utils/createConditionalFpGraph.py
    ;;

    "postgres")
    ./createCallgraphs.sh $OUTPUTFOLDER/app.acfg \
                      $OUTPUTFOLDER/dyn.analysis.enabled \
                      $TEMPORALFOLDER/temporal.fpalloc \
                      main \
                      main \
                      $OUTPUTFOLDER/executed.funcs.list \
                      $TEMPORALFOLDER/temporal.svf.type.cfg \
                      $TEMPORALFOLDER/temporal.direct.cfg \
                      $TEMPORALFOLDER/temporal.svf.type.fp.wglobal.cfg \
                      $OUTPUTFOLDER/basicblock.fpalloc \
                      $OUTPUTFOLDER/fpalloc.wo.dyn.conditionals \
                      $OUTPUTFOLDER/removed.dyn.fp.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/direct.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.fp.wglobal.cfg \
                      $OUTPUTFOLDER/svf.type.wall.dyn.conditionals.fp.wglobal.cfg \
                      $PYTHONFOLDER/python-utils/graphCleaner.py \
                      $PYTHONFOLDER/python-utils/createConditionalFpGraph.py
    ;;

    "memcached")
    ./createCallgraphs.sh $OUTPUTFOLDER/app.acfg \
                      $OUTPUTFOLDER/dyn.analysis.enabled \
                      $TEMPORALFOLDER/temporal.fpalloc \
                      main \
                      main,worker_libevent \
                      $OUTPUTFOLDER/executed.funcs.list \
                      $TEMPORALFOLDER/temporal.svf.type.cfg \
                      $TEMPORALFOLDER/temporal.direct.cfg \
                      $TEMPORALFOLDER/temporal.svf.type.fp.wglobal.cfg \
                      $OUTPUTFOLDER/basicblock.fpalloc \
                      $OUTPUTFOLDER/fpalloc.wo.dyn.conditionals \
                      $OUTPUTFOLDER/removed.dyn.fp.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/direct.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.fp.wglobal.cfg \
                      $OUTPUTFOLDER/svf.type.wall.dyn.conditionals.fp.wglobal.cfg \
                      $PYTHONFOLDER/python-utils/graphCleaner.py \
                      $PYTHONFOLDER/python-utils/createConditionalFpGraph.py
    ;;

    "wget")
    ./createCallgraphs.sh $OUTPUTFOLDER/app.acfg \
                      $OUTPUTFOLDER/dyn.analysis.enabled \
                      $TEMPORALFOLDER/temporal.fpalloc \
                      main \
                      main \
                      $OUTPUTFOLDER/executed.funcs.list \
                      $TEMPORALFOLDER/temporal.svf.type.cfg \
                      $TEMPORALFOLDER/temporal.direct.cfg \
                      $TEMPORALFOLDER/temporal.svf.type.fp.wglobal.cfg \
                      $OUTPUTFOLDER/basicblock.fpalloc \
                      $OUTPUTFOLDER/fpalloc.wo.dyn.conditionals \
                      $OUTPUTFOLDER/removed.dyn.fp.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/direct.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.fp.wglobal.cfg \
                      $OUTPUTFOLDER/svf.type.wall.dyn.conditionals.fp.wglobal.cfg \
                      $PYTHONFOLDER/python-utils/graphCleaner.py \
                      $PYTHONFOLDER/python-utils/createConditionalFpGraph.py
    ;;

    "tar")
    ./createCallgraphs.sh $OUTPUTFOLDER/app.acfg \
                      $OUTPUTFOLDER/dyn.analysis.enabled \
                      $TEMPORALFOLDER/temporal.fpalloc \
                      main \
                      main \
                      $OUTPUTFOLDER/executed.funcs.list \
                      $TEMPORALFOLDER/temporal.svf.type.cfg \
                      $TEMPORALFOLDER/temporal.direct.cfg \
                      $TEMPORALFOLDER/temporal.svf.type.fp.wglobal.cfg \
                      $OUTPUTFOLDER/basicblock.fpalloc \
                      $OUTPUTFOLDER/fpalloc.wo.dyn.conditionals \
                      $OUTPUTFOLDER/removed.dyn.fp.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/direct.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.fp.wglobal.cfg \
                      $OUTPUTFOLDER/svf.type.wall.dyn.conditionals.fp.wglobal.cfg \
                      $PYTHONFOLDER/python-utils/graphCleaner.py \
                      $PYTHONFOLDER/python-utils/createConditionalFpGraph.py
    ;;

    "smtpd")
    ./createCallgraphs.sh $OUTPUTFOLDER/app.acfg \
                      $OUTPUTFOLDER/dyn.analysis.enabled \
                      $TEMPORALFOLDER/temporal.fpalloc \
                      main \
                      main \
                      $OUTPUTFOLDER/executed.funcs.list \
                      $TEMPORALFOLDER/temporal.svf.type.cfg \
                      $TEMPORALFOLDER/temporal.direct.cfg \
                      $TEMPORALFOLDER/temporal.svf.type.fp.wglobal.cfg \
                      $OUTPUTFOLDER/basicblock.fpalloc \
                      $OUTPUTFOLDER/fpalloc.wo.dyn.conditionals \
                      $OUTPUTFOLDER/removed.dyn.fp.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/direct.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.fp.wglobal.cfg \
                      $OUTPUTFOLDER/svf.type.wall.dyn.conditionals.fp.wglobal.cfg \
                      $PYTHONFOLDER/python-utils/graphCleaner.py \
                      $PYTHONFOLDER/python-utils/createConditionalFpGraph.py
    ;;

    "lighttpd")
    ./createCallgraphs.sh $OUTPUTFOLDER/app.acfg \
                      $OUTPUTFOLDER/dyn.analysis.enabled \
                      $TEMPORALFOLDER/temporal.fpalloc \
                      main \
                      main \
                      $OUTPUTFOLDER/executed.funcs.list \
                      $TEMPORALFOLDER/temporal.svf.type.cfg \
                      $TEMPORALFOLDER/temporal.direct.cfg \
                      $TEMPORALFOLDER/temporal.svf.type.fp.wglobal.cfg \
                      $OUTPUTFOLDER/basicblock.fpalloc \
                      $OUTPUTFOLDER/fpalloc.wo.dyn.conditionals \
                      $OUTPUTFOLDER/removed.dyn.fp.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/direct.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.fp.wglobal.cfg \
                      $OUTPUTFOLDER/svf.type.wall.dyn.conditionals.fp.wglobal.cfg \
                      $PYTHONFOLDER/python-utils/graphCleaner.py \
                      $PYTHONFOLDER/python-utils/createConditionalFpGraph.py
    ;;

    "redis")
    ./createCallgraphs.sh $OUTPUTFOLDER/app.acfg \
                      $OUTPUTFOLDER/dyn.analysis.enabled \
                      $TEMPORALFOLDER/temporal.fpalloc \
                      main \
                      main \
                      $OUTPUTFOLDER/executed.funcs.list \
                      $TEMPORALFOLDER/temporal.svf.type.cfg \
                      $TEMPORALFOLDER/temporal.direct.cfg \
                      $TEMPORALFOLDER/temporal.svf.type.fp.wglobal.cfg \
                      $OUTPUTFOLDER/basicblock.fpalloc \
                      $OUTPUTFOLDER/fpalloc.wo.dyn.conditionals \
                      $OUTPUTFOLDER/removed.dyn.fp.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/direct.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.fp.wglobal.cfg \
                      $OUTPUTFOLDER/svf.type.wall.dyn.conditionals.fp.wglobal.cfg \
                      $PYTHONFOLDER/python-utils/graphCleaner.py \
                      $PYTHONFOLDER/python-utils/createConditionalFpGraph.py
    ;;

    "curl")
    ./createCallgraphs.sh $OUTPUTFOLDER/app.acfg \
                      $OUTPUTFOLDER/dyn.analysis.enabled \
                      $TEMPORALFOLDER/temporal.fpalloc \
                      main \
                      main \
                      $OUTPUTFOLDER/executed.funcs.list \
                      $TEMPORALFOLDER/temporal.svf.type.cfg \
                      $TEMPORALFOLDER/temporal.direct.cfg \
                      $TEMPORALFOLDER/temporal.svf.type.fp.wglobal.cfg \
                      $OUTPUTFOLDER/basicblock.fpalloc \
                      $OUTPUTFOLDER/fpalloc.wo.dyn.conditionals \
                      $OUTPUTFOLDER/removed.dyn.fp.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/direct.wo.dyn.conditionals.cfg \
                      $OUTPUTFOLDER/svf.type.wo.dyn.conditionals.fp.wglobal.cfg \
                      $OUTPUTFOLDER/svf.type.wall.dyn.conditionals.fp.wglobal.cfg \
                      $PYTHONFOLDER/python-utils/graphCleaner.py \
                      $PYTHONFOLDER/python-utils/createConditionalFpGraph.py
    ;;

    "test")
    echo -n "test";
    ;;
esac
