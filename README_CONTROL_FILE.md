# deployPrograms Configuration Reference

**Version:** 1.0
**Last Updated:** 2026-01-03

---

## Overview

`deployPrograms` is a command-line deployment orchestration tool that uses rsync to synchronize files between local and remote systems. It reads INI-format configuration files that define actions (deployment targets), host configurations, and SSH commands to execute before and after file transfers.

---

## Configuration File Format

Configuration files use INI format with three main sections:

```ini
[_substitutions]    ; Variable definitions for template interpolation
[_includes]         ; Optional includes of other INI files
[deploy-programs]   ; Main configuration: actions, hosts, and paths
```

---

## Sections

### [_substitutions]

Defines variables that can be referenced throughout the configuration using `<!variableName!>` syntax.

```ini
[_substitutions]
localBasePath=/Users/username/project/system/
remoteBasePath=/home/project/system
remoteHostAddress=server.example.com
remotePort=22
remoteUserName=deploy
serverConfigName=myproject.com
applicationName=myproject
```

**Common Variables:**

| Variable | Purpose |
|----------|---------|
| `localBasePath` | Base path on local machine |
| `remoteBasePath` | Base path on remote server |
| `prodRemoteBasePath` | Production base path (used with `-prod` flag) |
| `remoteHostAddress` | Remote server hostname or IP |
| `remotePort` | SSH port (default: 22) |
| `remoteUserName` | SSH username |
| `serverConfigName` | Human-readable server identifier |
| `applicationName` | Application name for logging |

### [_includes]

Optional section for including other INI files. Useful for shared configurations.

```ini
[_includes]
0=shared-hosts.ini
1=common-actions.ini
```

### [deploy-programs]

The main section containing action definitions, host configurations, and path mappings.

---

## Actions

Actions define deployment operations. Each action has a unique name and can include file transfers, SSH commands, or both.

### Action Properties

```ini
actions.<name>.annotation=<description>
actions.<name>.source.hostName=<host-alias>
actions.<name>.source.pathName=<path-alias>
actions.<name>.dest.hostName=<host-alias>
actions.<name>.dest.pathName=<path-alias>
```

| Property | Required | Description |
|----------|----------|-------------|
| `annotation` | Yes | Human-readable description shown during execution |
| `source.hostName` | For file transfers | Host alias for source (typically `localhost`) |
| `source.pathName` | For file transfers | Path alias defined in `sftpHostLib` |
| `dest.hostName` | For file transfers | Host alias for destination |
| `dest.pathName` | For file transfers | Path alias defined in `sftpHostLib` |

### SSH Commands

Execute shell commands on the remote host before and/or after the rsync transfer.

```ini
actions.<name>.ssh.before.0=<command>
actions.<name>.ssh.before.1=<command>
actions.<name>.ssh.after.0=<command>
actions.<name>.ssh.after.1=<command>
```

Commands are executed in numeric order. Variable substitution is supported.

**Example:**
```ini
actions.code.ssh.before.0=mkdir -p <!remoteBasePath!>/backup
actions.code.ssh.after.0=systemctl restart myapp
actions.code.ssh.after.1=systemctl status myapp
```

### SSH Override Host

For actions that execute SSH commands on a different host than the transfer destination:

```ini
actions.<name>.ssh.overrideHostName=<host-alias>
```

### Rsync Exclusions

Exclude files or patterns from the rsync transfer. Patterns follow rsync `--exclude` syntax.

```ini
actions.<name>.exclude.0=*.node
actions.<name>.exclude.1=.DS_Store
actions.<name>.exclude.2=*.log
```

**Common Use Cases:**
- `*.node` — Exclude compiled native Node.js modules (platform-specific binaries)
- `.DS_Store` — Exclude macOS metadata files
- `*.log` — Exclude log files
- `node_modules/` — Exclude dependencies (if rebuilding on target)

### SSH-Only Actions

Actions that execute SSH commands without file transfers. Useful for initialization, diagnostics, or service management.

```ini
actions.initRemote.annotation=Initialize remote directories
actions.initRemote.ssh.overrideHostName=specificRemoteHost1
actions.initRemote.ssh.before.0=mkdir -p '<!remoteBasePath!>/code'
actions.initRemote.ssh.before.1=mkdir -p '<!remoteBasePath!>/configs'
actions.initRemote.ssh.before.2=mkdir -p '<!remoteBasePath!>/datastore'
```

```ini
actions.hostname.annotation=Get hostname for diagnostics
actions.hostname.ssh.overrideHostName=specificRemoteHost1
actions.hostname.ssh.before.0=hostname
```

---

## Host Library (sftpHostLib)

Defines hosts and their associated paths. Each host can have authentication credentials and multiple path aliases.

### Host Structure

```ini
sftpHostLib.<host-alias>.auth.host=<hostname>
sftpHostLib.<host-alias>.auth.port=<port>
sftpHostLib.<host-alias>.auth.username=<username>
sftpHostLib.<host-alias>.auth.password=<password>
sftpHostLib.<host-alias>.auth.privateKeyFilePath=<path-to-key>
sftpHostLib.<host-alias>.pathLib.<path-alias>=<actual-path>
```

### Authentication Properties

| Property | Description |
|----------|-------------|
| `auth.host` | Hostname or IP address |
| `auth.port` | SSH port (default: 22) |
| `auth.username` | SSH username |
| `auth.password` | SSH password (prefer key-based auth) |
| `auth.privateKeyFilePath` | Path to SSH private key |

### Path Library

Maps path aliases to actual filesystem paths:

```ini
sftpHostLib.specificRemoteHost1.pathLib.code=<!remoteBasePath!>/code/
sftpHostLib.specificRemoteHost1.pathLib.configs=<!remoteBasePath!>/configs/
sftpHostLib.localhost.pathLib.code=<!localBasePath!>/code/
sftpHostLib.localhost.pathLib.configs=<!localBasePath!>/configs/
```

### Localhost Configuration

The `localhost` host alias is special — it must NOT have an `auth` property. It represents the local machine.

```ini
sftpHostLib.localhost.note=localhost must not have auth property
sftpHostLib.localhost.pathLib.code=<!localBasePath!>/code/
```

**Important:** If you need to execute SSH commands on localhost (e.g., updating files from a common library), create a separate host alias with auth credentials:

```ini
sftpHostLib.localHostForSSH.auth.host=localhost
sftpHostLib.localHostForSSH.auth.username=myuser
; ... etc
```

---

## Variable Interpolation

Use `<!variableName!>` syntax to reference variables defined in `[_substitutions]`:

```ini
[_substitutions]
remoteBasePath=/home/myapp/system

[deploy-programs]
actions.code.ssh.after.0=ls -la <!remoteBasePath!>/code/
; Expands to: ls -la /home/myapp/system/code/
```

---

## Complete Example

```ini
[_substitutions]
localBasePath=/Users/developer/myproject/system/
remoteBasePath=/home/myproject/system
remoteHostAddress=prod.example.com
remotePort=22
remoteUserName=deploy
serverConfigName=prod.example.com

[_includes]
; No includes in this example

[deploy-programs]

; Initialize remote directories (SSH-only, no file transfer)
actions.initRemote.annotation=Initialize remote directories
actions.initRemote.ssh.overrideHostName=prodServer
actions.initRemote.ssh.before.0=mkdir -p '<!remoteBasePath!>/code'
actions.initRemote.ssh.before.1=mkdir -p '<!remoteBasePath!>/configs'

; Deploy all code
actions.code.annotation=Deploy all code to <!serverConfigName!>
actions.code.source.hostName=localhost
actions.code.dest.hostName=prodServer
actions.code.source.pathName=code
actions.code.dest.pathName=code
actions.code.exclude.0=*.node
actions.code.exclude.1=.DS_Store
actions.code.ssh.after.0=cd <!remoteBasePath!>/code && npm rebuild
actions.code.ssh.after.1=systemctl restart myapp

; Deploy API only
actions.api.annotation=Deploy API server only
actions.api.source.hostName=localhost
actions.api.dest.hostName=prodServer
actions.api.source.pathName=api
actions.api.dest.pathName=api
actions.api.exclude.0=*.node

; Path mappings
sftpHostLib.localhost.pathLib.code=<!localBasePath!>/code/
sftpHostLib.localhost.pathLib.api=<!localBasePath!>/code/server/

sftpHostLib.prodServer.auth.host=<!remoteHostAddress!>
sftpHostLib.prodServer.auth.port=<!remotePort!>
sftpHostLib.prodServer.auth.username=<!remoteUserName!>
sftpHostLib.prodServer.auth.privateKeyFilePath=/Users/developer/.ssh/deploy_key
sftpHostLib.prodServer.pathLib.code=<!remoteBasePath!>/code/
sftpHostLib.prodServer.pathLib.api=<!remoteBasePath!>/code/server/
```

---

## Notes and Best Practices

### Native Node.js Modules

When deploying Node.js applications between different platforms (e.g., macOS to Linux), exclude compiled native modules:

```ini
actions.api.exclude.0=*.node
```

After deployment, rebuild native modules on the target:
```bash
cd /path/to/app && npm rebuild
```

### Rsync Behavior

The tool uses rsync with these default flags:
- `-az` — Archive mode, compress during transfer
- `--copy-links` — Transform symlinks into referent files
- `--checksum` — Skip based on checksum, not mod-time & size
- `--human-readable` — Output numbers in human-readable format
- `--quiet` — Suppress non-error messages
- `--delete` — Delete extraneous files from destination

### Shell Output in .bashrc

Any `.bashrc` or `.bash_profile` elements that print to stdout must be wrapped to suppress output for non-interactive shells, or rsync will fail:

```bash
if [[ $- == *i* ]]; then
    echo "Welcome message"
fi
```

### Transfer Direction

Only ONE end of a transfer can be a remote host (with `auth` property). You cannot rsync directly between two remote servers — one end must always be localhost.

---

## Command Line Help

```
============================================================

NAME

	deployPrograms (deploy-programs.js) - Use rsync to copy programs with command line subdirectory selection

DESCRIPTION

	deployPrograms configFilePath --options=cfm #send code, configs, management as defined in configFilePath

	deployPrograms looks at a config file for parameters and file copy path sets. Based
	on those it asks questions and then rsync's files.

	If a file path is specified, that is the config file that is used.

	If no config file path is specified, the program searches for it.

		1) It walks up from the current directory to locate system and then looks for
		system/configs/deploy-programs.ini.

		2) if that does not exist, it walks toward $HOME looking for deploy-programs.ini.

	--options is a concatenated list of flags referring to values defined in deploy-configs.ini.
		If none are specified, then the default switch list in the config file is used.
		If the appropriate flag is set in config, a confirmation will be requested from the user.

CONTROLS

--actions	takes a list of selection options

-prod	Use 'prodRemotePath' element in configuration file (default is 'remotePath')
-forceProd	skip user confirmation for writing to production (default is show prompt)

-skipInitCleanup	do not execute initialize and cleanup action tasks

-writeBoilerplateConfig	writes a sample config file to configFilePath if file
	does not exist. Appends the boilerplate if it does. No processing is done.

-writeBoilerplateMetadata	writes a sample metadata file to
	contain convenience names (aliases) for deployment configuration file
	paths. Writes the file (.deployProgramsMetadata.ini) into specified
	directory if file does not exist. Appends the boilerplate if it does.
	If no file path is specified, it defaults to the user home directory.
	No processing is done.

OUTPUT

-help, --help	shows this help message. No processing is done.

-listActions	list the actions in the chosen config. No processing is done.

-showConfig	display the final configuration file that would be used. No processing is done.

-silent
-quiet
-verbose

-json	return results as JSON (default is nodeJS util.inspect() format)

-noReport	suppress summary report (only applies without -json)

EXAMPLES

deployPrograms "FILEPATH/config.ini" -writeBoilerplateConfig
deployPrograms "FILEPATH/config.ini" --actions=hostname -skipInitCleanup

deployPrograms hx # shows all targets with substring 'hx' (case insensitive)
deployPrograms someTarget -showConfigs # display resolved config for debugging

============================================================
```
