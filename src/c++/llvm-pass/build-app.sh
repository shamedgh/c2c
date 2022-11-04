#!/bin/bash
APPNAME=$1

mkdir -p $BINPATH/$APPNAME;
case $APPNAME in

    "httpd.bitnami")
    clang -lpthread -ldl -lz -lpcre -lcrypt -luuid -lexpat -lssl -lcrypto \
                        $OUTPUTFOLDER/$APPNAME.instrumented.bc \
                        -o $OUTPUTFOLDER/$APPNAME.instrumented
    cp $OUTPUTFOLDER/$APPNAME.instrumented $BINPATH/$APPNAME/$APPNAME
    ;;

    "httpd.drupal")
    clang -lpthread -ldl -lz -lpcre -lcrypt -luuid -lexpat \
                        $OUTPUTFOLDER/$APPNAME.instrumented.bc \
                        -o $OUTPUTFOLDER/$APPNAME.instrumented
    cp $OUTPUTFOLDER/$APPNAME.instrumented $BINPATH/$APPNAME/$APPNAME
    ;;

    "nginx.zendserver")
    clang -lpthread -lcrypt -ldl -lpcre -lz -lssl -lcrypto \
            -lGeoIP -lgd -lxml2 -lxslt -lexslt \
                        $OUTPUTFOLDER/$APPNAME.instrumented.bc \
                        -o $OUTPUTFOLDER/$APPNAME.instrumented
    cp $OUTPUTFOLDER/$APPNAME.instrumented $BINPATH/$APPNAME/$APPNAME
    ;;

    "postgres")
    clang -lxml2 -lpam -lssl -lcrypto -lgssapi_krb5 -lrt -ldl -lm \
        -lldap -ldl -lpthread \
                        $OUTPUTFOLDER/$APPNAME.instrumented.bc \
                        -o $OUTPUTFOLDER/$APPNAME.instrumented
    cp $OUTPUTFOLDER/$APPNAME.instrumented $BINPATH/$APPNAME/$APPNAME
    ;;

    "memcached")
    clang -lsasl2 -lpthread \
                        $OUTPUTFOLDER/$APPNAME.instrumented.bc \
                        -o $OUTPUTFOLDER/$APPNAME.instrumented
    cp $OUTPUTFOLDER/$APPNAME.instrumented $BINPATH/$APPNAME/$APPNAME
    ;;

    "wget")
    clang -lz -luuid -lidn2 -lssl -lcrypto -lpcre -lpsl \
                        $OUTPUTFOLDER/$APPNAME.instrumented.bc \
                        -o $OUTPUTFOLDER/$APPNAME.instrumented
    cp $OUTPUTFOLDER/$APPNAME.instrumented $BINPATH/$APPNAME/$APPNAME
    ;;

    "tar")
    clang -lpcre -lpthread -lselinux \
                        $OUTPUTFOLDER/$APPNAME.instrumented.bc \
                        -o $OUTPUTFOLDER/$APPNAME.instrumented
    cp $OUTPUTFOLDER/$APPNAME.instrumented $BINPATH/$APPNAME/$APPNAME
    ;;

    "smtpd")
    clang -lssl -lcrypto -lz -lresolv -lcrypt \
                        $OUTPUTFOLDER/$APPNAME.instrumented.bc \
                        -o $OUTPUTFOLDER/$APPNAME.instrumented
    cp $OUTPUTFOLDER/$APPNAME.instrumented $BINPATH/$APPNAME/$APPNAME
    ;;

    "lighttpd")
    clang -lpcre -ldl \
                        $OUTPUTFOLDER/$APPNAME.instrumented.bc \
                        -o $OUTPUTFOLDER/$APPNAME.instrumented
    cp $OUTPUTFOLDER/$APPNAME.instrumented $BINPATH/$APPNAME/$APPNAME
    ;;

    "redis")
    clang -lssl -lcrypto -ldl -lm -lpthread \
                        $OUTPUTFOLDER/$APPNAME.instrumented.bc \
                        -o $OUTPUTFOLDER/$APPNAME.instrumented
    cp $OUTPUTFOLDER/$APPNAME.instrumented $BINPATH/$APPNAME/$APPNAME
    ;;

    "curl")
    clang -lidn2 -lpsl -lssl -lcrypto -lgssapi_krb5 -lkrb5 \
            -lk5crypto -lldap -llber -lz -lnghttp2 -lrtmp -lpthread \
                        $OUTPUTFOLDER/$APPNAME.instrumented.bc \
                        -o $OUTPUTFOLDER/$APPNAME.instrumented
    cp $OUTPUTFOLDER/$APPNAME.instrumented $BINPATH/$APPNAME/$APPNAME
    ;;

    "test")
    echo -n "test";
    ;;
esac

cp $OUTPUTFOLDER/$APPNAME.instrumented $BINPATH/$APPNAME/
