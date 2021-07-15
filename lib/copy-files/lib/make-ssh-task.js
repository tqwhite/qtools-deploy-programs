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
		const conn = new Client();
		conn
			.on('ready', () => {
				conn.exec(sshCommand, (err, stream) => {
					if (err) throw err;
					stream
						.on('close', (code, signal) => {
							conn.end();
						})
						.on('data', data => {
							next('', { ...args, [sshCommand]: data.toString() });
						})
						.stderr.on('data', err => {
							next(err);
						});
				});
			})
			.connect(workingAuth);
	};
};

//END OF moduleFunction() ============================================================

module.exports = args => moduleFunction(args);

