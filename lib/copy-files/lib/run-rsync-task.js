#!/usr/bin/env node
'use strict';

const qt = require('qtools-functional-library');
const fs=require('fs');

const preflightDestinationCheck = require('./preflight-destination-check');

//START OF moduleFunction() ============================================================

const moduleFunction = function({ actionSet, rsyncGen, switches = {} }) {
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

		const runTheTransfer = () => {
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

		// PREFLIGHT: refuse to destroy work that exists only at the destination.
		// See preflight-destination-check.js for what it looks for and why.
		// -skipPreflight is the deliberate override; it is never implied.

		if (switches.skipPreflight) {
			xLog.status(
				`  PREFLIGHT SKIPPED by -skipPreflight for '${annotation} (${flagName})'`
			);
			runTheTransfer();
			return;
		}

		const preflightCheck = preflightDestinationCheck({
			rsyncGen,
			sourcePath,
			destPath,
			sshString,
			exclusions,
			suppressDeleteFlag
		});

		preflightCheck((err, findings) => {
			if (err) {
				next(
					`PREFLIGHT COULD NOT RUN for '${annotation} (${flagName})': ${err}. ` +
						`Nothing was transferred. Fix the cause, or use -skipPreflight to deploy without the check.`,
					args
				);
				return;
			}

			const { deletions = [], clobberNewer = [] } = findings;

			args[flagName].preflight = { deletions, clobberNewer };

			if (!deletions.length && !clobberNewer.length) {
				runTheTransfer();
				return;
			}

			const asList = (list) => list.map((item) => `      ${item}`).join('\n');

			const report = [
				`\nPREFLIGHT REFUSED '${annotation} (${flagName})'`,
				`  This transfer would destroy content that exists only at the destination.`,
				`  ${sourcePath}`,
				`    -> ${destPath}`
			];

			if (clobberNewer.length) {
				report.push(
					`\n  ${clobberNewer.length} file(s) are NEWER at the destination and would be overwritten`,
					`  by an older local copy. Something changed them after the last deploy:`,
					asList(clobberNewer)
				);
			}

			if (deletions.length) {
				report.push(
					`\n  ${deletions.length} file(s) exist only at the destination and would be DELETED:`,
					asList(deletions)
				);
			}

			report.push(
				`\n  Nothing was transferred. Either bring the destination's version into the`,
				`  repository first, or re-run with -skipPreflight to proceed anyway.\n`
			);

			next(report.join('\n'), args);
		});
	};
};

//END OF moduleFunction() ============================================================

module.exports = args => moduleFunction(args);

