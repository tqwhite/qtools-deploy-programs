#!/usr/bin/env node
'use strict';

const qt = require('qtools-functional-library');

const { readFileSync } = require('fs');
const { Client } = require('ssh2');

//START OF moduleFunction() ============================================================

const moduleFunction = function({ sshCommand, sshHost, annotation, flagName }) {
	const { xLog } = process.global;
	const workingAuth = sshHost.auth;

	workingAuth.privateKey = readFileSync(workingAuth.privateKeyFilePath);
	//workingAuth.debug=console.log;

	if (!workingAuth) {
		return (args, next) => {
			xLog.status(
				`Warning: skipping SSH step '${annotation} (${flagName})'. Both ends of transfer are local in ${annotation} (${flagName}`
			);
			next('', args);
		};
	}
	const sshString = `ssh -i ${workingAuth.privateKeyFilePath} -p ${
		workingAuth.port ? workingAuth.port : 22
	} ${workingAuth.username}@${workingAuth.host} ${sshCommand}`;

	return (args, next) => {
		xLog.status(`\nSSH '${annotation?annotation:'**no annotation specified**'}' (${flagName}) [${sshString}]`);
		const defaultResult='NO OUTPUT RETURNED';
		let result = defaultResult;
		const conn = new Client();
		conn
			.on('ready', () => {
				conn.exec(sshCommand, {env: {'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:'}}, (err, stream) => {
					if (err) throw err;
					stream
						.on('close', (code = 'no code', signal = 'no signal') => {
							xLog.verbose(
								`SSH CLOSE code=${code} sgnal=${signal} '${annotation} (${flagName})' [${sshCommand}]`
							);
							next('', { ...args, [sshCommand]: { sshString, result } });
							conn.end();
						})
						.on('data', data => {
							xLog.verbose(
								`SSH RESULT ${data} '${annotation?annotation:''} (${flagName})' [${sshCommand}]`
							);
							result = result==defaultResult?data.toString():result.toString()+defaultResult;
						})
						.stderr.on('data', err => {
							xLog.verbose(
								`SSH ERROR ${err.toString()} '${annotation?annotation:''} (${flagName})' [${sshCommand}]`
							);
							xLog.error()
							next({err:err.toString(), sshString});
						});
				});
			})
			.connect(workingAuth);
	};
};

//END OF moduleFunction() ============================================================

module.exports = args => moduleFunction(args);

