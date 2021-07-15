#!/usr/bin/env node
'use strict';

const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function({ transferSet, rsyncGen }) {
	const { xLog } = process.global;

	if (!transferSet.source || !transferSet.dest) {
		return (args, next) => {
			const name = transferSet.annotation
				? transferSet.annotation
				: 'no annotation';
			const message = `TRANSFER SKIPPED '${name} (${transferSet.flagName})' has no transfer specified`;
			xLog.status(message);
			next('', { ...args, [name]: 'NO TRANSFER SPECIFIED' });
		};
	}

	return (args, next) => {
		const {
			flagName,
			source,
			dest,
			annotation,
			rsyncControls = {}
		} = transferSet;
		const { exclusions = [], suppressDeleteFlag = false } = rsyncControls;

		const localCallback = (err, rsyncStatusCode, rsyncCmdString) => {
			args[flagName].rsyncCmdString = rsyncCmdString.replace(/\"/g, "'"); //makes this prettier and more usable in JSON output
			next(rsyncStatusCode, args);
		};

		const localTemplate = `<!path!>`;
		const remoteTemplate = `<!host.auth.username!>@<!host.auth.host!>:<!path!>`;

		const sourcePath = source.qtTemplateReplace(
			source.host.auth ? remoteTemplate : localTemplate
		);
		const destPath = dest.qtTemplateReplace(
			dest.host.auth ? remoteTemplate : localTemplate
		);

		const workingAuth = dest.qtGetSurePath('host.auth', source.host.auth);

		args[flagName] = {
			annotation,
			sourcePath,
			destPath
		};
		xLog.status(`TRANSFER '${annotation} (${flagName})'`);

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
			.shell(
				`ssh -i ${workingAuth.privateKeyFilePath} -p ${
					workingAuth.port ? workingAuth.port : 22
				}`
			);

		rsync.execute(localCallback);
	};
};

//END OF moduleFunction() ============================================================

module.exports = args => moduleFunction(args);

