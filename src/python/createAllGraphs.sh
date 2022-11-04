#!/bin/bash

#Guide:
#./createCallgraphs.sh CCFGPATH ENABLEDCONDPATH FPALLOCPATH FUNCTIONNAME TEMPORALCFGPATH TEMPORALDIRECTPATH TEMPORALFPOUTPATH CONDITIONALFPRAW CONDITIONALFPALLOCPATH REMOVEDFPALLOCPATH CONDITIONALCFGOUTPATH CONDITIONALDIRECTOUTPATH CONDITIONALFPOUTPATH GRAPHCLEANERSCRIPTPATH CREATECONDFPSCRIPTPATH

#./createCallgraphs.sh callgraphs.new/nginx.wall.ccfg ./nginx.dyn.analysis.enabled callgraphs.new/nginx.wall.fpalloc main callgraphs.new/temporal/nginx.wall.svf.type.cfg callgraphs.new/temporal/nginx.wall.direct.cfg callgraphs.new/temporal/nginx.wall.svf.type.fp.wglobal.cfg callgraphs.new/nginx.wall.basicblock.fpalloc callgraphs.new/nginx.wall.fpalloc.wo.dyn.conditionals callgraphs.new/nginx.wall.removed.dyn.fp.cfg callgraphs.new/nginx.wall.svf.type.wo.dyn.conditionals.cfg callgraphs.new/nginx.wall.direct.wo.dyn.conditionals.cfg callgraphs.new/nginx.wall.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.new/nginx.wall.ccfg ./nginx.dyn.analysis.enabled callgraphs.new/nginx.wubuntu18.fpalloc main callgraphs.new/temporal/nginx.wubuntu18.svf.type.cfg callgraphs.new/temporal/nginx.wubuntu18.direct.cfg callgraphs.new/temporal/nginx.wubuntu18.svf.type.fp.wglobal.cfg callgraphs.new/nginx.wall.basicblock.fpalloc callgraphs.new/nginx.wall.fpalloc.wo.dyn.conditionals callgraphs.new/nginx.wall.removed.dyn.fp.cfg callgraphs.new/nginx.wall.svf.type.wo.dyn.conditionals.cfg callgraphs.new/nginx.wall.direct.wo.dyn.conditionals.cfg callgraphs.new/nginx.wall.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.new/nginx.wall.ccfg ./nginx.dyn.analysis.enabled callgraphs.new/nginx.temporal.fpalloc main callgraphs.new/temporal/nginx.temporal.svf.type.cfg callgraphs.new/temporal/nginx.temporal.direct.cfg callgraphs.new/temporal/nginx.temporal.svf.type.fp.wglobal.cfg callgraphs.new/nginx.wall.basicblock.fpalloc callgraphs.new/nginx.wall.fpalloc.wo.dyn.conditionals callgraphs.new/nginx.wall.removed.dyn.fp.cfg callgraphs.new/nginx.wall.svf.type.wo.dyn.conditionals.cfg callgraphs.new/nginx.wall.direct.wo.dyn.conditionals.cfg callgraphs.new/nginx.wall.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.04202021/nginx.wmail.wstream.wssl.ccfg ./nginx.wmail.wstream.wssl.dyn.analysis.enabled callgraphs.04202021/temporal/nginx.php-zendserver.fpalloc main ngx_worker_process_cycle,ngx_single_process_cycle,ngx_cache_manager_process_cycle ./nginx.wmail.wstream.wssl.executed.functions callgraphs.04202021/temporal/nginx.php-zendserver.svf.type.cfg callgraphs.04202021/temporal/nginx.php-zendserver.direct.cfg callgraphs.04202021/temporal/nginx.php-zendserver.svf.type.fp.wglobal.cfg callgraphs.04202021/nginx.wmail.wstream.wssl.basicblock.fpalloc callgraphs.04202021/nginx.wmail.wstream.wssl.fpalloc.wo.dyn.conditionals callgraphs.04202021/nginx.wmail.wstream.wssl.removed.dyn.fp.cfg callgraphs.04202021/nginx.wmail.wstream.wssl.svf.type.wo.dyn.conditionals.cfg callgraphs.04202021/nginx.wmail.wstream.wssl.direct.wo.dyn.conditionals.cfg callgraphs.04202021/nginx.wmail.wstream.wssl.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.04202021/nginx.wmail.wstream.wssl.ccfg ./nginx.php-zendserver.all.enabled callgraphs.04202021/temporal/nginx.php-zendserver.fpalloc main callgraphs.04202021/temporal/nginx.php-zendserver.svf.type.cfg callgraphs.04202021/temporal/nginx.php-zendserver.direct.cfg callgraphs.04202021/temporal/nginx.php-zendserver.svf.type.fp.wglobal.cfg callgraphs.04202021/nginx.wmail.wstream.wssl.basicblock.fpalloc callgraphs.04202021/nginx.wmail.wstream.wssl.fpalloc.wall.dyn.conditionals callgraphs.04202021/nginx.wmail.wstream.wssl.removed.dyn.fp.cfg callgraphs.04202021/nginx.wmail.wstream.wssl.svf.type.wall.dyn.conditionals.cfg callgraphs.04202021/nginx.wmail.wstream.wssl.direct.wall.dyn.conditionals.cfg callgraphs.04202021/nginx.wmail.wstream.wssl.svf.type.wall.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.new/nginx.wo.modules.ccfg ./nginx.wo.modules.dyn.analysis.enabled callgraphs.new/nginx.wo.modules.fpalloc main callgraphs.new/temporal/nginx.wo.modules.svf.type.cfg callgraphs.new/temporal/nginx.wo.modules.direct.cfg callgraphs.new/temporal/nginx.wo.modules.svf.type.fp.wglobal.cfg callgraphs.new/nginx.wo.modules.basicblock.fpalloc callgraphs.new/nginx.wo.modules.fpalloc.wo.dyn.conditionals callgraphs.new/nginx.wo.modules.removed.dyn.fp.cfg callgraphs.new/nginx.wo.modules.svf.type.wo.dyn.conditionals.cfg callgraphs.new/nginx.wo.modules.direct.wo.dyn.conditionals.cfg callgraphs.new/nginx.wo.modules.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.new/nginx.wmail.wstream.ccfg ./nginx.wmail.wstream.dyn.analysis.enabled callgraphs.new/nginx.wmail.wstream.fpalloc main callgraphs.new/temporal/nginx.wmail.wstream.svf.type.cfg callgraphs.new/temporal/nginx.wmail.wstream.direct.cfg callgraphs.new/temporal/nginx.wmail.wstream.svf.type.fp.wglobal.cfg callgraphs.new/nginx.wmail.wstream.basicblock.fpalloc callgraphs.new/nginx.wmail.wstream.fpalloc.wo.dyn.conditionals callgraphs.new/nginx.wmail.wstream.removed.dyn.fp.cfg callgraphs.new/nginx.wmail.wstream.svf.type.wo.dyn.conditionals.cfg callgraphs.new/nginx.wmail.wstream.direct.wo.dyn.conditionals.cfg callgraphs.new/nginx.wmail.wstream.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.new/nginx.wall.ccfg ./nginx.all.disabled callgraphs.new/nginx.wall.fpalloc main callgraphs.new/temporal/nginx.wall.svf.type.cfg callgraphs.new/temporal/nginx.wall.direct.cfg callgraphs.new/temporal/nginx.wall.svf.type.fp.wglobal.cfg callgraphs.new/nginx.wall.basicblock.fpalloc callgraphs.new/nginx.wall.fpalloc.wo.all.conditionals callgraphs.new/nginx.wall.removed.all.fp.cfg callgraphs.new/nginx.wall.svf.type.wo.all.conditionals.cfg callgraphs.new/nginx.wall.direct.wo.all.conditionals.cfg callgraphs.new/nginx.wall.svf.type.wo.all.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.new/nginx.wo.modules.ccfg ./nginx.wo.modules.all.disabled callgraphs.new/nginx.wo.modules.fpalloc main callgraphs.new/temporal/nginx.wo.modules.svf.type.cfg callgraphs.new/temporal/nginx.wo.modules.direct.cfg callgraphs.new/temporal/nginx.wo.modules.svf.type.fp.wglobal.cfg callgraphs.new/nginx.wo.modules.basicblock.fpalloc callgraphs.new/nginx.wo.modules.fpalloc.wo.all.conditionals callgraphs.new/nginx.wo.modules.removed.all.fp.cfg callgraphs.new/nginx.wo.modules.svf.type.wo.all.conditionals.cfg callgraphs.new/nginx.wo.modules.direct.wo.all.conditionals.cfg callgraphs.new/nginx.wo.modules.svf.type.wo.all.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.new/nginx.wmail.wstream.ccfg ./nginx.wmail.wstream.all.enabled callgraphs.new/nginx.wmail.wstream.fpalloc main callgraphs.new/temporal/nginx.wmail.wstream.svf.type.cfg callgraphs.new/temporal/nginx.wmail.wstream.direct.cfg callgraphs.new/temporal/nginx.wmail.wstream.svf.type.fp.wglobal.cfg callgraphs.new/nginx.wmail.wstream.basicblock.fpalloc callgraphs.new/nginx.wmail.wstream.fpalloc.w.all.conditionals callgraphs.new/nginx.wmail.wstream.removed.all.enabled.fp.cfg callgraphs.new/nginx.wmail.wstream.svf.type.w.all.conditionals.cfg callgraphs.new/nginx.wmail.wstream.direct.w.all.conditionals.cfg callgraphs.new/nginx.wmail.wstream.svf.type.w.all.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.new/httpd.wall.ccfg ./httpd.dyn.analysis.enabled callgraphs.new/httpd.wall.fpalloc main callgraphs.new/temporal/httpd.wall.svf.type.cfg callgraphs.new/temporal/httpd.wall.direct.cfg callgraphs.new/temporal/httpd.wall.svf.type.fp.wglobal.cfg callgraphs.new/httpd.wall.basicblock.fpalloc callgraphs.new/httpd.wall.fpalloc.wo.dyn.conditionals callgraphs.new/httpd.wall.removed.dyn.fp.cfg callgraphs.new/httpd.wall.svf.type.arg.fine.wo.dyn.conditionals.cfg callgraphs.new/httpd.wall.direct.wo.dyn.conditionals.cfg callgraphs.new/httpd.wall.svf.type.arg.fine.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.new/httpd.wwordpress.ccfg ./httpd.wwordpress.dyn.analysis.enabled callgraphs.new/httpd.wwordpress.fpalloc main callgraphs.new/temporal/httpd.wall.svf.type.cfg callgraphs.new/temporal/httpd.wall.direct.cfg callgraphs.new/temporal/httpd.wall.svf.type.fp.wglobal.cfg callgraphs.new/httpd.wwordpress.basicblock.fpalloc callgraphs.new/httpd.wwordpress.fpalloc.wo.dyn.conditionals callgraphs.new/httpd.wwordpress.removed.dyn.fp.cfg callgraphs.new/httpd.wwordpress.svf.type.arg.fine.wo.dyn.conditionals.cfg callgraphs.new/httpd.wwordpress.direct.wo.dyn.conditionals.cfg callgraphs.new/httpd.wwordpress.svf.type.arg.fine.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.04202021/httpd.wwordpress.debloated.ccfg ./httpd.wwordpress.debloated.all.enabled callgraphs.04202021/temporal/httpd.wwordpress.fpalloc main callgraphs.04202021/temporal/httpd.wwordpress.svf.type.cfg callgraphs.04202021/temporal/httpd.wwordpress.direct.cfg callgraphs.04202021/temporal/httpd.wwordpress.svf.type.fp.wglobal.cfg callgraphs.04202021/httpd.wwordpress.debloated.basicblock.fpalloc callgraphs.04202021/httpd.wwordpress.debloated.fpalloc.wall.dyn.conditionals callgraphs.04202021/httpd.wwordpress.debloated.removed.dyn.fp.cfg callgraphs.04202021/httpd.wwordpress.debloated.svf.type.wall.dyn.conditionals.cfg callgraphs.04202021/httpd.wwordpress.debloated.direct.wall.dyn.conditionals.cfg callgraphs.04202021/httpd.wwordpress.debloated.svf.type.wall.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.04202021/httpd.wwordpress.debloated.ccfg.modified ./tmp.enabled callgraphs.04202021/temporal/httpd.wwordpress.fpalloc main callgraphs.04202021/temporal/httpd.wwordpress.svf.type.cfg callgraphs.04202021/temporal/httpd.wwordpress.direct.cfg callgraphs.04202021/temporal/httpd.wwordpress.svf.type.fp.wglobal.cfg callgraphs.04202021/httpd.wwordpress.debloated.basicblock.fpalloc callgraphs.04202021/httpd.wwordpress.debloated.fpalloc.wo.dyn.conditionals callgraphs.04202021/httpd.wwordpress.debloated.removed.dyn.fp.cfg callgraphs.04202021/httpd.wwordpress.debloated.svf.type.wo.dyn.conditionals.cfg callgraphs.04202021/httpd.wwordpress.debloated.direct.wo.dyn.conditionals.cfg callgraphs.04202021/httpd.wwordpress.debloated.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#
#./createCallgraphs.sh callgraphs.04202021/httpd.wwordpress.bitnami.ccfg ./httpd.wwordpress.bitnami.all.enabled callgraphs.04202021/temporal/httpd.wwordpress.bitnami.fpalloc main callgraphs.04202021/temporal/httpd.wwordpress.bitnami.svf.type.cfg callgraphs.04202021/temporal/httpd.wwordpress.bitnami.direct.cfg callgraphs.04202021/temporal/httpd.wwordpress.bitnami.svf.type.fp.wglobal.cfg callgraphs.04202021/httpd.wwordpress.bitnami.basicblock.fpalloc callgraphs.04202021/httpd.wwordpress.bitnami.fpalloc.wall.conditionals callgraphs.04202021/httpd.wwordpress.bitnami.removed.all.fp.cfg callgraphs.04202021/httpd.wwordpress.bitnami.svf.type.wall.conditionals.cfg callgraphs.04202021/httpd.wwordpress.bitnami.direct.wall.conditionals.cfg callgraphs.04202021/httpd.wwordpress.bitnami.svf.type.wall.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.new/httpd.wall.ccfg ./httpd.all.disabled callgraphs.new/httpd.wall.fpalloc main callgraphs.new/temporal/httpd.wall.svf.type.cfg callgraphs.new/temporal/httpd.wall.direct.cfg callgraphs.new/temporal/httpd.wall.svf.type.fp.wglobal.cfg callgraphs.new/httpd.wall.basicblock.fpalloc callgraphs.new/httpd.wall.fpalloc.wo.all.conditionals callgraphs.new/httpd.wall.removed.all.fp.cfg callgraphs.new/httpd.wall.svf.type.arg.fine.wo.all.conditionals.cfg callgraphs.new/httpd.wall.direct.wo.all.conditionals.cfg callgraphs.new/httpd.wall.svf.type.arg.fine.wo.all.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.new/httpd.wwordpress.ccfg ./httpd.wwordpress.all.enabled callgraphs.new/httpd.wwordpress.fpalloc main callgraphs.new/temporal/httpd.wall.svf.type.cfg callgraphs.new/temporal/httpd.wall.direct.cfg callgraphs.new/temporal/httpd.wall.svf.type.fp.wglobal.cfg callgraphs.new/httpd.wwordpress.basicblock.fpalloc callgraphs.new/httpd.wwordpress.fpalloc.w.all.conditionals callgraphs.new/httpd.wwordpress.removed.all.enabled.fp.cfg callgraphs.new/httpd.wwordpress.svf.type.arg.fine.w.all.conditionals.cfg callgraphs.new/httpd.wwordpress.direct.w.all.conditionals.cfg callgraphs.new/httpd.wwordpress.svf.type.arg.fine.w.all.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.04202021/redis.ccfg ./redis.dyn.analysis.enabled callgraphs.04202021/temporal/redis.fpalloc main callgraphs.04202021/temporal/redis.svf.type.cfg callgraphs.04202021/temporal/redis.direct.cfg callgraphs.04202021/temporal/redis.svf.type.fp.wglobal.cfg callgraphs.04202021/redis.basicblock.fpalloc callgraphs.04202021/redis.fpalloc.wo.dyn.conditionals callgraphs.04202021/redis.removed.dyn.fp.cfg callgraphs.04202021/redis.svf.type.arg.fine.wo.dyn.conditionals.cfg callgraphs.04202021/redis.direct.wo.dyn.conditionals.cfg callgraphs.04202021/redis.svf.type.arg.fine.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.04202021/redis.ccfg ./redis.all.disabled callgraphs.04202021/redis.fpalloc main callgraphs.04202021/temporal/redis.svf.type.cfg callgraphs.04202021/temporal/redis.direct.cfg callgraphs.04202021/temporal/redis.svf.type.fp.wglobal.cfg callgraphs.04202021/redis.basicblock.fpalloc callgraphs.04202021/redis.fpalloc.wo.all.conditionals callgraphs.04202021/redis.removed.all.fp.cfg callgraphs.04202021/redis.svf.type.arg.fine.wo.all.conditionals.cfg callgraphs.04202021/redis.direct.wo.all.conditionals.cfg callgraphs.04202021/redis.svf.type.arg.fine.wo.all.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.new/curl.ccfg ./curl.dyn.analysis.enabled callgraphs.new/curl.fpalloc main callgraphs.new/temporal/curl.svf.type.cfg callgraphs.new/temporal/curl.direct.cfg callgraphs.new/temporal/curl.svf.type.fp.wglobal.cfg callgraphs.new/curl.basicblock.fpalloc callgraphs.new/curl.fpalloc.wo.dyn.conditionals callgraphs.new/curl.removed.dyn.fp.cfg callgraphs.new/curl.svf.type.arg.fine.wo.dyn.conditionals.cfg callgraphs.new/curl.direct.wo.dyn.conditionals.cfg callgraphs.new/curl.svf.type.arg.fine.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.new/curl.ccfg ./curl.all.disabled callgraphs.new/curl.fpalloc main callgraphs.new/temporal/curl.svf.type.cfg callgraphs.new/temporal/curl.direct.cfg callgraphs.new/temporal/curl.svf.type.fp.wglobal.cfg callgraphs.new/curl.basicblock.fpalloc callgraphs.new/curl.fpalloc.wo.all.conditionals callgraphs.new/curl.removed.all.fp.cfg callgraphs.new/curl.svf.type.arg.fine.wo.all.conditionals.cfg callgraphs.new/curl.direct.wo.all.conditionals.cfg callgraphs.new/curl.svf.type.arg.fine.wo.all.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.new/wget.ccfg ./wget.dyn.analysis.enabled callgraphs.new/wget.fpalloc main callgraphs.new/temporal/wget.svf.type.cfg callgraphs.new/temporal/wget.direct.cfg callgraphs.new/temporal/wget.svf.type.fp.wglobal.cfg callgraphs.new/wget.basicblock.fpalloc callgraphs.new/wget.fpalloc.wo.dyn.conditionals callgraphs.new/wget.removed.dyn.fp.cfg callgraphs.new/wget.svf.type.arg.fine.wo.dyn.conditionals.cfg callgraphs.new/wget.direct.wo.dyn.conditionals.cfg callgraphs.new/wget.svf.type.arg.fine.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.04202021/wget.ccfg ./wget.dyn.analysis.enabled callgraphs.04202021/temporal/wget.fpalloc main callgraphs.04202021/temporal/wget.svf.type.cfg callgraphs.04202021/temporal/wget.direct.cfg callgraphs.04202021/temporal/wget.svf.type.fp.wglobal.cfg callgraphs.04202021/wget.basicblock.fpalloc callgraphs.04202021/wget.fpalloc.wo.dyn.conditionals callgraphs.04202021/wget.removed.dyn.fp.cfg callgraphs.04202021/wget.svf.type.wo.dyn.conditionals.cfg callgraphs.04202021/wget.direct.wo.dyn.conditionals.cfg callgraphs.04202021/wget.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.new/wget.ccfg ./wget.all.disabled callgraphs.new/wget.fpalloc main callgraphs.new/temporal/wget.svf.type.cfg callgraphs.new/temporal/wget.direct.cfg callgraphs.new/temporal/wget.svf.type.fp.wglobal.cfg callgraphs.new/wget.basicblock.fpalloc callgraphs.new/wget.fpalloc.wo.all.conditionals callgraphs.new/wget.removed.all.fp.cfg callgraphs.new/wget.svf.type.arg.fine.wo.all.conditionals.cfg callgraphs.new/wget.direct.wo.all.conditionals.cfg callgraphs.new/wget.svf.type.arg.fine.wo.all.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py








##### Final version:
#./createCallgraphs.sh callgraphs.04202021/nginx.wmail.wstream.wssl.ccfg ./nginx.wmail.wstream.wssl.dyn.analysis.enabled callgraphs.04202021/temporal/nginx.php-zendserver.fpalloc main ngx_worker_process_cycle,ngx_single_process_cycle ./nginx.wmail.wstream.wssl.executed.functions callgraphs.04202021/temporal/nginx.php-zendserver.svf.type.cfg callgraphs.04202021/temporal/nginx.php-zendserver.direct.cfg callgraphs.04202021/temporal/nginx.php-zendserver.svf.type.fp.wglobal.cfg callgraphs.04202021/nginx.wmail.wstream.wssl.basicblock.fpalloc callgraphs.04202021/nginx.wmail.wstream.wssl.fpalloc.wo.dyn.conditionals callgraphs.04202021/nginx.wmail.wstream.wssl.removed.dyn.fp.cfg callgraphs.04202021/nginx.wmail.wstream.wssl.svf.type.wo.dyn.conditionals.cfg callgraphs.04202021/nginx.wmail.wstream.wssl.direct.wo.dyn.conditionals.cfg callgraphs.04202021/nginx.wmail.wstream.wssl.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.04202021/httpd.wwordpress.bitnami.ccfg ./httpd.wwordpress.bitnami.dyn.analysis.enabled callgraphs.04202021/temporal/httpd.wwordpress.bitnami.fpalloc main child_main,listener_thread ./httpd.wwordpress.bitnami.executed.functions callgraphs.04202021/temporal/httpd.wwordpress.bitnami.svf.type.cfg callgraphs.04202021/temporal/httpd.wwordpress.bitnami.direct.cfg callgraphs.04202021/temporal/httpd.wwordpress.bitnami.svf.type.fp.wglobal.cfg callgraphs.04202021/httpd.wwordpress.bitnami.basicblock.fpalloc callgraphs.04202021/httpd.wwordpress.bitnami.fpalloc.wo.dyn.conditionals callgraphs.04202021/httpd.wwordpress.bitnami.removed.dyn.fp.cfg callgraphs.04202021/httpd.wwordpress.bitnami.svf.type.wo.dyn.conditionals.cfg callgraphs.04202021/httpd.wwordpress.bitnami.direct.wo.dyn.conditionals.cfg callgraphs.04202021/httpd.wwordpress.bitnami.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.0529/wget.ccfg ./wget.dyn.analysis.enabled callgraphs.0529/temporal/wget.fpalloc main main ./wget.executed.functions callgraphs.0529/temporal/wget.svf.type.cfg callgraphs.0529/temporal/wget.direct.cfg callgraphs.0529/temporal/wget.svf.type.fp.wglobal.cfg callgraphs.0529/wget.basicblock.fpalloc callgraphs.0529/wget.fpalloc.wo.dyn.conditionals callgraphs.0529/wget.removed.dyn.fp.cfg callgraphs.0529/wget.svf.type.wo.dyn.conditionals.cfg callgraphs.0529/wget.direct.wo.dyn.conditionals.cfg callgraphs.0529/wget.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.0529/curl.ccfg ./curl.dyn.analysis.enabled callgraphs.0529/temporal/curl.fpalloc main main ./curl.executed.functions callgraphs.0529/temporal/curl.svf.type.cfg callgraphs.0529/temporal/curl.direct.cfg callgraphs.0529/temporal/curl.svf.type.fp.wglobal.cfg callgraphs.0529/curl.basicblock.fpalloc callgraphs.0529/curl.fpalloc.wo.dyn.conditionals callgraphs.0529/curl.removed.dyn.fp.cfg callgraphs.0529/curl.svf.type.wo.dyn.conditionals.cfg callgraphs.0529/curl.direct.wo.dyn.conditionals.cfg callgraphs.0529/curl.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.04202021/redis.ccfg ./redis.dyn.analysis.enabled callgraphs.04202021/temporal/redis.fpalloc main main ./redis.executed.functions callgraphs.04202021/temporal/redis.svf.type.cfg callgraphs.04202021/temporal/redis.direct.cfg callgraphs.04202021/temporal/redis.svf.type.fp.wglobal.cfg callgraphs.04202021/redis.basicblock.fpalloc callgraphs.04202021/redis.fpalloc.wo.dyn.conditionals callgraphs.04202021/redis.removed.dyn.fp.cfg callgraphs.04202021/redis.svf.type.wo.dyn.conditionals.cfg callgraphs.04202021/redis.direct.wo.dyn.conditionals.cfg callgraphs.04202021/redis.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.0529/httpd.drupal.ccfg ./httpd.drupal.dyn.analysis.enabled callgraphs.0529/temporal/httpd.drupal.fpalloc main child_main,listener_thread ./httpd.drupal.executed.functions callgraphs.0529/temporal/httpd.drupal.svf.type.cfg callgraphs.0529/temporal/httpd.drupal.direct.cfg callgraphs.0529/temporal/httpd.drupal.svf.type.fp.wglobal.cfg callgraphs.0529/httpd.drupal.basicblock.fpalloc callgraphs.0529/httpd.drupal.fpalloc.wo.dyn.conditionals callgraphs.0529/httpd.drupal.removed.dyn.fp.cfg callgraphs.0529/httpd.drupal.svf.type.wo.dyn.conditionals.cfg callgraphs.0529/httpd.drupal.direct.wo.dyn.conditionals.cfg callgraphs.0529/httpd.drupal.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.0529/httpd.drupal.ccfg ./httpd.drupal.all.enabled callgraphs.0529/temporal/httpd.drupal.fpalloc main main ./httpd.drupal.executed.functions callgraphs.0529/temporal/httpd.drupal.svf.type.cfg callgraphs.0529/temporal/httpd.drupal.direct.cfg callgraphs.0529/temporal/httpd.drupal.svf.type.fp.wglobal.cfg callgraphs.0529/httpd.drupal.basicblock.fpalloc callgraphs.0529/httpd.drupal.fpalloc.wall.conditionals callgraphs.0529/httpd.drupal.removed.all.fp.cfg callgraphs.0529/httpd.drupal.svf.type.wall.conditionals.cfg callgraphs.0529/httpd.drupal.direct.wall.conditionals.cfg callgraphs.0529/httpd.drupal.svf.type.wall.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
#./createCallgraphs.sh callgraphs.0529/curl.ccfg ./curl.dyn.analysis.enabled callgraphs.0529/temporal/curl.fpalloc main main ./curl.executed.functions callgraphs.0529/temporal/curl.svf.type.cfg callgraphs.0529/temporal/curl.direct.cfg callgraphs.0529/temporal/curl.svf.type.fp.wglobal.cfg callgraphs.0529/curl.basicblock.fpalloc callgraphs.0529/curl.fpalloc.wo.dyn.conditionals callgraphs.0529/curl.removed.dyn.fp.cfg callgraphs.0529/curl.svf.type.wo.dyn.conditionals.cfg callgraphs.0529/curl.direct.wo.dyn.conditionals.cfg callgraphs.0529/curl.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#./createCallgraphs.sh callgraphs.0529/curl.ccfg ./curl.xget.dyn.analysis.enabled callgraphs.0529/temporal/curl.fpalloc main main ./curl.executed.functions callgraphs.0529/temporal/curl.svf.type.cfg callgraphs.0529/temporal/curl.direct.cfg callgraphs.0529/temporal/curl.svf.type.fp.wglobal.cfg callgraphs.0529/curl.basicblock.fpalloc callgraphs.0529/curl.fpalloc.wo.dyn.conditionals callgraphs.0529/curl.removed.dyn.fp.cfg callgraphs.0529/curl.svf.type.wo.dyn.conditionals.cfg callgraphs.0529/curl.direct.wo.dyn.conditionals.cfg callgraphs.0529/curl.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py
#
./createCallgraphs.sh callgraphs.0529/curl.ccfg ./curl.io.dyn.analysis.enabled callgraphs.0529/temporal/curl.fpalloc main main ./curl.executed.functions callgraphs.0529/temporal/curl.svf.type.cfg callgraphs.0529/temporal/curl.direct.cfg callgraphs.0529/temporal/curl.svf.type.fp.wglobal.cfg callgraphs.0529/curl.basicblock.fpalloc callgraphs.0529/curl.fpalloc.wo.dyn.conditionals callgraphs.0529/curl.removed.dyn.fp.cfg callgraphs.0529/curl.svf.type.wo.dyn.conditionals.cfg callgraphs.0529/curl.direct.wo.dyn.conditionals.cfg callgraphs.0529/curl.svf.type.wo.dyn.conditionals.fp.wglobal.cfg python-utils/graphCleaner.py python-utils/createConditionalFpGraph.py