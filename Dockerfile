FROM ubuntu:20.04

ENV NUM_CORES 4

### Building SVF and LLVM taken from https://github.com/SVF-tools/SVF/blob/master/Dockerfile
# Stop script if any individual command fails.
RUN set -e

# Define LLVM version.
ENV llvm_version=12.0.0

# Define home directory
ENV HOME=/home/SVF-tools

# Define dependencies.
ENV lib_deps="build-essential make g++-8 gcc-8 git zlib1g-dev libncurses5 libncurses5-dev libssl-dev libpcre3 libpcre3-dev zip vim libstdc++6 python3.8 libsasl2-2 libsasl2-dev libuuid1 uuid-dev libpsl-dev libidn2-dev libdb5.3-dev libselinux1-dev libxml2-dev libxslt-dev libgd-dev libgeoip-dev libperl-dev scons libbz2-dev libbrotli-dev libdbi-dev libgdbm-dev libmaxminddb-dev libkrb5-dev libldap2-dev liblua5.3-dev libmemcached-dev libmysqlclient-dev libnss3-dev libwolfssl-dev libmbedtls-dev nettle-dev libgnutls28-dev libpam0g-dev libpq-dev libsqlite3-dev libxxhash-dev libzstd-dev libevent-dev bison libpsl-dev libnghttp2-dev librtmp-dev"
ENV build_deps="wget xz-utils cmake python git gdb"

# Fetch dependencies.
RUN apt-get update
RUN DEBIAN_FRONTEND="noninteractive" apt-get install -y $build_deps $lib_deps

# Fetch and build SVF source.
RUN echo "Downloading LLVM and building SVF to " ${HOME}
WORKDIR ${HOME}
#RUN wget "https://github.com/SVF-tools/SVF/archive/refs/tags/SVF-2.2.tar.gz"
#RUN tar -xvf SVF-2.2.tar.gz
ADD ./SVF-2.2 ${HOME}/SVF-2.2
WORKDIR ${HOME}/SVF-2.2
#RUN mkdir llvm-$llvm_version.obj
#RUN tar -xf llvm.tar.gz -C llvm-$llvm_version.obj --strip-components 5 
#ENV LLVM_DIR=${HOME}/SVF-2.2/llvm-$llvm_version.obj
RUN echo "Building SVF ..."
RUN bash ./build.sh 

# Export SVF and llvm paths
ENV PATH=${HOME}/SVF-2.2/Release-build/bin:$PATH
ENV PATH=${HOME}/SVF-2.2/llvm-$llvm_version.obj/bin:$PATH
ENV SVF_DIR=${HOME}/SVF-2.2
ENV LLVM_DIR=${HOME}/SVF-2.2/llvm-$llvm_version.obj
###

##Retrieve c2c source code
ADD ./src /home/c2c/src
ADD ./configs /home/c2c/configs
ADD ./libc-callgraphs /home/c2c/libc-callgraphs
ADD ./callgraphs /home/c2c/callgraphs
ADD ./binaries /home/c2c/binaries
## copy bitcodes
ADD ./bitcodes /home/c2c/bitcodes
WORKDIR /home/c2c/src/c++/llvm-pass
#
#
## compile c2c pass
RUN mkdir build
WORKDIR /home/c2c/src/c++/llvm-pass/build
RUN CC=clang CXX=clang++ cmake ../
RUN make -j$NUM_CORES
#
WORKDIR /home/c2c/src/python
## change run script permission
RUN chmod u+x run.sh
CMD ./run.sh
