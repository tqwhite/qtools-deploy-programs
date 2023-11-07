#!/usr/bin/env node
'use strict';

const qt = require('qtools-functional-library');
const fs=require('fs');

//START OF moduleFunction() ============================================================

const moduleFunction = function({ actionSet, rsyncGen }) {
	const { xLog } = process.global;

	if (!actionSet.source || !actionSet.dest) {
		return (args, next) => {
			const name = actionSet.annotation
				? actionSet.annotation
				: 'no annotation';
			const message = `\nACTION OMITTED '${name} (${actionSet.flagName})' has no file movement action specified`;
			xLog.status(message);
			next('', args);
		};
	}

	return (args, next) => {
		const {
			flagName,
			source,
			dest,
			annotation,
			rsyncControls = {}
		} = actionSet;
		const { exclusions = [], suppressDeleteFlag = false } = rsyncControls;

		const localTemplate = `<!path!>`;
		const remoteTemplate = `<!host.auth.username!>@<!host.auth.host!>:<!path!>`;

		const sourcePath = source.qtTemplateReplace(
			source.host.auth ? remoteTemplate : localTemplate
		);
		
		if(!source.host.auth && !fs.existsSync(sourcePath)){
			const message=`Missing source data. ${sourcePath} does not exist.`
			next(message, args);
			return;
		}
		
		
		const destPath = dest.qtTemplateReplace(
			dest.host.auth ? remoteTemplate : localTemplate
		);

		const workingAuth = dest.qtGetSurePath('host.auth', source.host.auth);

		args[flagName] = {
			annotation,
			sourcePath,
			destPath
		};
		xLog.status(`ACTION '${annotation} (${flagName})'`);
		
		const sshString=
				`ssh -i ${workingAuth.privateKeyFilePath} -p ${
					workingAuth.port ? workingAuth.port : 22
				}`
		
		xLog.verbose(`sshString:${sshString}`);
		xLog.verbose(`sourcePath:${sourcePath}`);
		xLog.verbose(`destPath:${destPath}`);	

		const localCallback = (err, rsyncStatusCode, rsyncCmdString) => {
			args[flagName].rsyncCmdString = rsyncCmdString.replace(/\"/g, "'"); //makes this prettier and more usable in JSON output
			next(err?`${err} (init remote dirs? use -forceProd?)`:'', args);
		};

		const rsync = new rsyncGen()
			.flags('az')
			.set('copy-links')
			.set('checksum')
			.set('human-readable')
			.set('quiet')
			.set(suppressDeleteFlag ? '' : 'delete')
			.source(sourcePath)
			.destination(destPath)
			.exclude(exclusions)
			.shell(sshString);

		rsync.execute(localCallback);
	};
};

//END OF moduleFunction() ============================================================

module.exports = args => moduleFunction(args);

