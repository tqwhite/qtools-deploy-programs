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

	if (!workingAuth) {
		return (args, next) => {
			xLog.status(
				`Warning: skipping SSH step '${annotation} (${flagName})'. Both ends of transfer are local in ${annotation} (${flagName}`
			);
			next('', args);
		};
	}

	return (args, next) => {
		xLog.status(`SSH '${annotation} (${flagName})' [${sshCommand}]`);
		let result='NO OUTPUT RETURNED';;
		const conn = new Client();
		conn
			.on('ready', () => {
				conn.exec(sshCommand, (err, stream) => {
					if (err) throw err;
					stream
						.on('close', (code, signal) => {
							xLog.verbose(`SSH CLOSE ${code} ${signal} '${annotation} (${flagName})' [${sshCommand}]`)
							next('', { ...args, [sshCommand]: result.toString() });
							conn.end();
						})
						.on('data', data => {
							xLog.verbose(`SSH RESULT ${data} '${annotation} (${flagName})' [${sshCommand}]`)
							result=data;
						})
						.stderr.on('data', err => {
							xLog.verbose(`SSH ERROR ${data} '${annotation} (${flagName})' [${sshCommand}]`)
							next(err);
						});
				});
			})
			.connect(workingAuth);
	};
};

//END OF moduleFunction() ============================================================

module.exports = args => moduleFunction(args);

