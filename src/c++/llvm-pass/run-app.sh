#!/bin/bash
APPNAME=$1

rm -f /tmp/condition.result.log
rm -f /tmp/condition.funcs.executed.log
case $APPNAME in

    "httpd.bitnami")
    useradd -rm -d /home/apache -s /bin/bash apache
    mkdir -p /var/www/html
    chown -R apache.apache /var/www/html
    mkdir -p /var/log/apache2
    chown -R apache.apache /var/log/apache2
    mkdir -p /usr/local/apache2/conf
    chown -R apache.apache /usr/local/apache2
    mkdir -p /etc/httpd.bitnami;
    mkdir -p /opt/bitnami
    cp -R $CONFIGPATH/httpd.bitnami/opt/* /opt/bitnami/
    mkdir -p /opt/bitnami/apache/logs
    chown -R apache.apache /opt/bitnami
    cp -R $CONFIGPATH/httpd.bitnami/* /etc/httpd.bitnami/
    cp -R $CONFIGPATH/httpd.bitnami/mime.types /usr/local/apache2/conf
    $OUTPUTFOLDER/$APPNAME.instrumented -f /etc/httpd.bitnami/httpd.conf -X &
    sleep 5;
    pkill -9 httpd
    ;;

    "httpd.drupal")
    useradd -rm -d /home/apache -s /bin/bash apache
    mkdir -p /var/www/html
    chown -R apache.apache /var/www/html
    mkdir -p /var/log/apache2
    chown -R apache.apache /var/log/apache2
    mkdir -p /usr/local/apache2/conf
    chown -R apache.apache /usr/local/apache2
    mkdir -p /etc/httpd.drupal;
    cp -R $CONFIGPATH/httpd.drupal/* /etc/httpd.drupal/
    cp -R $CONFIGPATH/httpd.bitnami/mime.types /usr/local/apache2/conf
    $OUTPUTFOLDER/$APPNAME.instrumented -f /etc/httpd.drupal/apache2.conf -X &
    sleep 5;
    pkill -9 httpd
    ;;

    "nginx.zendserver")
    mkdir -p /var/log/nginx/;
    mkdir -p /usr/local/nginx;
    mkdir -p /usr/local/nginx/logs;
    $OUTPUTFOLDER/$APPNAME.instrumented -g "daemon off;" -c $CONFIGPATH/nginx.zendserver.conf &
    sleep 5;
    pkill -9 nginx
    ;;

    "postgres")
    mkdir -p /usr/local/pgsql
    useradd -rm -d /home/postgres -s /bin/bash -u 1000 postgres
    cp -r $C2CHOME/binaries/prerequisites/postgres/local/pgsql/* /usr/local/pgsql/
    su postgres -c "$C2CHOME/binaries/prerequisites/postgres/initdb -D /tmp/psql_data"
    su postgres -c "$OUTPUTFOLDER/$APPNAME.instrumented -D /tmp/psql_data &"
    sleep 5;
    pkill -9 postgres
    sleep 5;
    ;;

    "memcached")
    useradd -rm -d /home/memcached-user -s /bin/bash -g root -G sudo -u 1001 memcached-user
    $OUTPUTFOLDER/$APPNAME.instrumented -u memcached-user &
    sleep 5;
    pkill -9 memcached
    ;;

    "wget")
    $OUTPUTFOLDER/$APPNAME.instrumented https://www.google.com 
    ;;

    "tar")
    $OUTPUTFOLDER/$APPNAME.instrumented -xzvf $CONFIGPATH/tmp.tar.gz 
    #$OUTPUTFOLDER/$APPNAME.instrumented -czvf tmp.tar.gz /tmp 
    #$OUTPUTFOLDER/$APPNAME.instrumented --test-label tmp.tar.gz

    ;;

    "smtpd")
    mkdir -p /etc/mail
    touch /etc/mail/aliases
    mkdir -p /var/empty
    useradd -c "SMTP Daemon" -d /var/empty -s /sbin/nologin _smtpd
    useradd -c "SMTPD Queue" -d /var/empty -s /sbin/nologin _smtpq
    $OUTPUTFOLDER/$APPNAME.instrumented -f $CONFIGPATH/smtpd.conf    #should fail
    rm /tmp/condition.result.log
    chown -R _smtpq.root /var/spool/smtpd/queue
    chown -R _smtpq.root /var/spool/smtpd/purge
    chown -R root._smtpq /var/spool/smtpd/offline
    $OUTPUTFOLDER/$APPNAME.instrumented -f $CONFIGPATH/smtpd.conf 
    sleep 5;
    pkill -9 smtpd
    ;;

    "lighttpd")
    useradd -rm -d /home/lighttpd -s /bin/bash lighttpd
    mkdir -p /var/log/lighttpd
    chown -R lighttpd.lighttpd /var/log/lighttpd
    mkdir -p /etc/lighttpd
    cp -R $CONFIGPATH/lighttpd/* /etc/lighttpd/
    $OUTPUTFOLDER/$APPNAME.instrumented -D -f /etc/lighttpd/lighttpd.conf &
    sleep 5;
    pkill -9 lighttpd
    ;;

    "redis")
    $OUTPUTFOLDER/$APPNAME.instrumented $CONFIGPATH/redis.conf &
    sleep 5;
    pkill -9 redis
    ;;

    "curl")
    $OUTPUTFOLDER/$APPNAME.instrumented -X GET https://www.google.com &
    sleep 5;
    pkill -9 curl
    ;;

    "test")
    echo -n "test";
    ;;
esac
