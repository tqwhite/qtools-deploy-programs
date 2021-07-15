#!/usr/bin/env node
'use strict';

const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function({ moduleConfig }) {
	const { xLog } = process.global;

	const getHostFromName = (moduleConfig, hostName) => {
		const host = moduleConfig.qtGetSurePath(`sftpHostLib.${hostName}`);

		if (!host) {
			const message = `INVALID CONFIGURATION hostName ${hostName} does not exist in sftpHostLib`;
			xLog.error(message);
			throw message;
		}

		return host;
	};

	const transferSets = moduleConfig.values.transfers.map(flagName => {
		const transferSpec = moduleConfig.transfers[flagName];

		if (!transferSpec) {
			return {};
		}

		if (!transferSpec) {
			throw `flag '${flagName}' is not specified in config ${moduleConfig.qtGetSurePath(
				'configFilePath',
				'missing file path'
			)}`;
		}

		const expandedTransferSet = {
			...transferSpec,
			flagName
		};

		const sourceHost = transferSpec.qtGetSurePath('source');
		const destHost = transferSpec.qtGetSurePath('dest');

		if (sourceHost) {
			expandedTransferSet.source = {
				host: getHostFromName(moduleConfig, transferSpec.source.hostName),
				path: getHostFromName(moduleConfig, transferSpec.source.hostName, {})
					.pathLib[transferSpec.source.pathName]
			};
		}

		if (destHost) {
			expandedTransferSet.dest = {
				host: getHostFromName(moduleConfig, transferSpec.dest.hostName),
				path: getHostFromName(moduleConfig, transferSpec.dest.hostName, {})
					.pathLib[transferSpec.dest.pathName]
			};
		}

		const source = expandedTransferSet.qtGetSurePath('source.host', {});
		const dest = expandedTransferSet.qtGetSurePath('dest.host', {});

		if (source.auth && dest.auth) {
			const message = `Invalid configuration: Only *one* end of the transfer can have a remote host (with auth) in ${
				expandedTransferSet.annotation
			} (${flagName}`;
			xLog.error(message);
			throw new Error(message);
		}

		expandedTransferSet.sshHost = dest ? dest : source;

		const { overrideHostName: sshTasksOverrideHostName } = transferSpec.ssh
			? transferSpec.ssh
			: {};

		if (sshTasksOverrideHostName) {
			transferSpec.ssh.overrideHost = getHostFromName(
				moduleConfig,
				sshTasksOverrideHostName
			);
		}

		return expandedTransferSet;
	});

	return transferSets;
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
