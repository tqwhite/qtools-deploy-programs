# qtools-deploy-programs
Use Rsync to copy files to remote server with command line subdirectory selections

--copy-links is set so symlink files are copied in full

These are privileged. IE, they are explicit in code (in find-config-file.js):
<!remoteBasePath!>
<!prodRemoteBasePath!>

(Someday add a pair of switches to override.)