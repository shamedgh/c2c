/*
   +----------------------------------------------------------------------+
   | PHP Version 7                                                        |
   +----------------------------------------------------------------------+
   | Copyright (c) The PHP Group                                          |
   +----------------------------------------------------------------------+
   | This source file is subject to version 3.01 of the PHP license,      |
   | that is bundled with this package in the file LICENSE, and is        |
   | available through the world-wide-web at the following url:           |
   | http://www.php.net/license/3_01.txt                                  |
   | If you did not receive a copy of the PHP license and are unable to   |
   | obtain it through the world-wide-web, please send a note to          |
   | license@php.net so we can mail you a copy immediately.               |
   +----------------------------------------------------------------------+
   | Author: Stig Sæther Bakken <ssb@php.net>                             |
   +----------------------------------------------------------------------+
*/

#define CONFIGURE_COMMAND " '/bitnami/blacksmith-sandox/php-7.4.16/configure'  '--prefix=/opt/bitnami/php' '--with-imap=/bitnami/blacksmith-sandox/imap-2007.0.0' '--with-imap-ssl' '--with-zlib-dir' '--with-zlib' '--with-libxml-dir=/usr' '--enable-soap' '--disable-rpath' '--enable-inline-optimization' '--with-bz2' '--enable-sockets' '--enable-pcntl' '--enable-exif' '--enable-bcmath' '--with-pdo-mysql=mysqlnd' '--with-mysqli=mysqlnd' '--with-png-dir=/usr' '--with-openssl' '--with-libdir=/lib/x86_64-linux-gnu' '--enable-ftp' '--enable-calendar' '--with-gettext' '--with-xmlrpc' '--with-xsl' '--enable-fpm' '--with-fpm-user=daemon' '--with-fpm-group=daemon' '--enable-mbstring' '--enable-cgi' '--enable-ctype' '--enable-session' '--enable-mysqlnd' '--enable-intl' '--with-iconv' '--with-pdo_sqlite' '--with-sqlite3' '--with-readline' '--with-gmp' '--with-curl' '--with-pdo-pgsql=shared' '--with-pgsql=shared' '--with-config-file-scan-dir=/opt/bitnami/php/etc/conf.d' '--enable-simplexml' '--with-sodium' '--enable-gd' '--with-pear' '--with-freetype' '--with-jpeg' '--with-webp' '--with-zip' '--with-pdo-dblib=shared' '--with-tidy' '--with-ldap=/usr/' '--enable-apcu=shared' 'PKG_CONFIG_PATH=/opt/bitnami/common/lib/pkgconfig'"
#define PHP_ODBC_CFLAGS	""
#define PHP_ODBC_LFLAGS		""
#define PHP_ODBC_LIBS		""
#define PHP_ODBC_TYPE		""
#define PHP_OCI8_DIR			""
#define PHP_OCI8_ORACLE_VERSION		""
#define PHP_PROG_SENDMAIL	"/usr/sbin/sendmail"
#define PEAR_INSTALLDIR         "/opt/bitnami/php/lib/php"
#define PHP_INCLUDE_PATH	".:/opt/bitnami/php/lib/php"
#define PHP_EXTENSION_DIR       "/opt/bitnami/php/lib/php/extensions"
#define PHP_PREFIX              "/opt/bitnami/php"
#define PHP_BINDIR              "/opt/bitnami/php/bin"
#define PHP_SBINDIR             "/opt/bitnami/php/sbin"
#define PHP_MANDIR              "/opt/bitnami/php/php/man"
#define PHP_LIBDIR              "/opt/bitnami/php/lib/php"
#define PHP_DATADIR             "/opt/bitnami/php/share/php"
#define PHP_SYSCONFDIR          "/opt/bitnami/php/etc"
#define PHP_LOCALSTATEDIR       "/opt/bitnami/php/var"
#define PHP_CONFIG_FILE_PATH    "/opt/bitnami/php/lib"
#define PHP_CONFIG_FILE_SCAN_DIR    "/opt/bitnami/php/etc/conf.d"
#define PHP_SHLIB_SUFFIX        "so"
#define PHP_SHLIB_EXT_PREFIX    ""
