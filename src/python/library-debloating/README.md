
Generate library stats, how many system calls are required by each library. With and without lib. specialization.

`
python3.7 libStatGenerator.py --folderpath /home/hamed/confine/fgOutput --glibccfgpath ../libc-callgraphs/glibc.all.callgraph --muslcfgpath ../libc-callgraphs/musllibc.callgraph --otherlibcfgpath ../other-callgraphs.wsyscalls/ --otherlibcfgpathempty --output libstats.csv
`
