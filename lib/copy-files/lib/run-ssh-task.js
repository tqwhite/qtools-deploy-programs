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

		// The remote process exit code is the authority on success or failure.
		// stderr is an out-of-band message channel, NOT a verdict: plenty of healthy
		// commands write to it (systemctl enable prints 'Created symlink...' and exits 0).
		// Both streams are accumulated here and adjudicated once, in the close handler.
		const stdoutChunks = [];
		const stderrChunks = [];

		let nextAlreadyCalled = false;
		const callNextOnce = (err, result) => {
			if (nextAlreadyCalled) {
				return;
			}
			nextAlreadyCalled = true;
			next(err, result);
		};

		const conn = new Client();
		conn
			.on('error', connectionErr => {
				callNextOnce({
					err: `SSH connection failed: ${connectionErr.toString()}`,
					sshString
				});
			})
			.on('ready', () => {
				conn.exec(sshCommand, {env: {'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:'}}, (err, stream) => {
					if (err) {
						callNextOnce({
							err: `SSH exec failed: ${err.toString()}`,
							sshString
						});
						return;
					}
					stream
						.on('close', (code = 'no code', signal = 'no signal') => {
							const stdoutText = stdoutChunks.join('');
							const stderrText = stderrChunks.join('');

							xLog.verbose(
								`SSH CLOSE code=${code} signal=${signal} '${annotation} (${flagName})' [${sshCommand}]`
							);
							conn.end();

							const killedBySignal = signal && signal !== 'no signal';
							const failedExitCode = typeof code === 'number' && code !== 0;

							if (killedBySignal || failedExitCode) {
								// Name the actual problem. An empty stderr on a failing command is
								// itself worth saying out loud rather than reporting nothing.
								const reason = killedBySignal
									? `remote command killed by signal ${signal}`
									: `remote command exited with code ${code}`;
								callNextOnce({
									err: stderrText
										? `${reason}: ${stderrText}`
										: `${reason} and produced no stderr output`,
									exitCode: code,
									signal,
									sshString
								});
								return;
							}

							// Succeeded. If it said something on stderr, surface it as a note so the
							// information is not lost, but do not mistake it for a failure.
							if (stderrText) {
								xLog.status(
									`SSH NOTE (succeeded, exit code ${code}, with stderr output) '${annotation?annotation:''} (${flagName})': ${stderrText.trim()}`
								);
							}

							callNextOnce('', {
								...args,
								[sshCommand]: {
									sshString,
									result: stdoutText ? stdoutText : defaultResult,
									stderr: stderrText,
									exitCode: code
								}
							});
						})
						.on('data', data => {
							xLog.verbose(
								`SSH RESULT ${data} '${annotation?annotation:''} (${flagName})' [${sshCommand}]`
							);
							stdoutChunks.push(data.toString());
						})
						.stderr.on('data', data => {
							xLog.verbose(
								`SSH STDERR ${data.toString()} '${annotation?annotation:''} (${flagName})' [${sshCommand}]`
							);
							stderrChunks.push(data.toString());
						});
				});
			})
			.connect(workingAuth);
	};
};

//END OF moduleFunction() ============================================================

module.exports = args => moduleFunction(args);
