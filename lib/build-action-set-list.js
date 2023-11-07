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
					process.exit(1);
		}

		return host;
	};


	const actionSets = moduleConfig.values.actions.map(flagName => {
		const actionSpec = moduleConfig.actions[flagName];

// 				if (!actionSpec) {
// 					xLog.error(`flag '${flagName}' is not specified in config ${moduleConfig.qtGetSurePath(
// 						'configFilePath',
// 						'missing file path'
// 					)}`);
// 					return {}; //this works fine and allows subsequent actions to operate. Decided for now that it's not a good idea in case there is a dependency.
// 				}
		
				if (!actionSpec) {
				const message=`flag '${flagName}' is not specified in config ${moduleConfig.qtGetSurePath(
						'_meta.configurationSourceFilePath',
						'*no file path found*'
					)}`;
					xLog.error(message);
					process.exit(1);
				}

		const expandedActionSet = {
			...actionSpec,
			flagName
		};


		const sourceHost = actionSpec.qtGetSurePath('source');
		const destHost = actionSpec.qtGetSurePath('dest');
		const sshTasksOverrideHostName=actionSpec.qtGetSurePath('ssh.overrideHostName');

		
		if (sourceHost) {
			const sourcePath = getHostFromName(
				moduleConfig,
				actionSpec.source.hostName,
				{}
			).pathLib[actionSpec.source.pathName];

			if (!sourcePath) {
				const message = `Invalid configuration: sourcePath path '${
					actionSpec.source.pathName
				}' is missing in hostname '${
					actionSpec.source.hostName
				}' for action name '${flagName}'`;
				xLog.error(message);
					process.exit(1);
			}
			expandedActionSet.source = {
				host: getHostFromName(moduleConfig, actionSpec.source.hostName),
				path: sourcePath
			};
		}

		if (destHost) {
			const destPath = getHostFromName(
				moduleConfig,
				actionSpec.dest.hostName,
				{}
			).pathLib[actionSpec.dest.pathName];

			if (!destPath) {
				const message = `Invalid configuration: destination path '${
					actionSpec.dest.pathName
				}' is missing in hostname '${
					actionSpec.dest.hostName
				}' for action name '${flagName}'`;
				xLog.error(message);
					process.exit(1);
			}
			expandedActionSet.dest = {
				host: getHostFromName(moduleConfig, actionSpec.dest.hostName),
				path: destPath
			};
		}

		if (sshTasksOverrideHostName) {
			actionSpec.ssh.overrideHost = getHostFromName(
				moduleConfig,
				sshTasksOverrideHostName
			);
		}

		const source = expandedActionSet.qtGetSurePath('source.host', {});
		const dest = expandedActionSet.qtGetSurePath('dest.host', {});

		if (source.auth && dest.auth) {
			const message = `Invalid configuration: Only *one* end of the action can have a remote host (with auth) in ${
				expandedActionSet.annotation
			} (${flagName}`;
			xLog.error(message);
					process.exit(1);
		}

		expandedActionSet.sshHost = dest ? dest : source; //if overrideHost is not defined, then the host specified in the transfer property us used

		return expandedActionSet;
	});

	return actionSets;
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
