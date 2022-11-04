# C2C

## How to regenerate paper results:
This repository comes with the LLVM pass for C2C along with python scripts
(mainly used from previous work) to generate the system call filters for each
application. We used Ubuntu 18.04 with Linux kernel v4.15.0-161-generic
(x86_64) to run C2C, running on a different system might give slightly
different filtered system calls.  You can either compile LLVM and the pass on
your own system and run the scripts, or use the provided Dockerfile to build a
Docker image and run everything in that container. We explain the latter in
this readme.

Then run the following steps:

```
sudo docker build -t c2c-image .
```

In the repository we have provided two special folders. `output.complete` 
which contains all the generated output from running our analysis which 
was used to create the tables in the paper. We have also provided 
`output.cache` which caches the intermediate outputs so the analysis can 
be completed with less resources. The cache contains the generated callgraph 
for each application after applying the previous work (which we compare with)
library specialization (`baseline`) and temporal system call specialization 
(`temporal`) and the Augmented Control Flow Graph (ACFG) for C2C.
By using this cache you do not need to actually run the pointer analysis 
part of C2C which needs much more resources and time.

To use the cache you can use the following command to run C2C:

```
sudo docker run -v [path-to-cache]/outputs:/mnt/c2c -it c2c-image /bin/bash
```
example:
```
sudo docker run -v /home/user/output.cache/outputs:/mnt/c2c -it c2c-image /bin/bash
```

By mounting the folder into the container you can go through the results after 
you exit the container.

Inside the container you can `./run.sh` for C2C to generate the results for 
all applications.
After the operation is completed the results for each application will be 
created in their respective folder in the provided path above (inside the 
container: `/mnt/c2c/[appname]`.

The main files which contain the results shown in the paper are in the following:

Table 1:
```
head -8 c2c-static.stats
cat c2c-final.stats (third column represents disabled edges)
```

Table 2:
```
cat syscallreduction.stats  (shows the number of syscalls required across lib-spec, temporal and C2C)
cat syscall.diffs (shows the name of extra syscalls filtered compared to temporal and lib-spec)
```

## Source Code
The bitcode for all applications have been provided in the bitcodes folder
and the source code for the LLVM pass and the python scripts are available in
the `src` folder.
