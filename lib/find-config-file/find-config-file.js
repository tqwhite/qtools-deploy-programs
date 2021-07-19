#!/usr/bin/env node
'use strict';

const configFileProcessor = require('qtools-config-file-processor');
const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function() {
	const { xLog } = process.global;

	const getConfig = (
		{ configSegmentName, filePath, options = {} },
		callback
	) => {
		let configOptions;
		if (options.useProdPath) {
			configOptions = {
				userSubstitutions: {
					remoteBasePath: '<!prodRemoteBasePath!>'
				}
			};
		}

		if (filePath.match(/\.ini$/)) {
			const rawConfig = configFileProcessor.getConfig(
				filePath,
				'.',
				configOptions
			);

			if (
				options.useProdPath &&
				!rawConfig.qtGetSurePath('_substitutions.prodRemoteBasePath')
			) {
				callback(
					`-prod was set but _substitutions.prodRemoteBasePath was missing from config ${filePath}`
				);
				return;

			}

			const config = rawConfig[configSegmentName];
			if (typeof config == 'undefined' || Object.keys.length == 0) {
				const message = `Bad configuration file. No ${configSegmentName} section or the section is empty`;
				xLog.error(message);
				throw message;
			}
			config._meta = rawConfig._meta;
			config._meta.configurationSegmentName = configSegmentName;

			callback('', config);
		}
	};

	return { getConfig };
};

//END OF moduleFunction() ============================================================

module.exports = new moduleFunction();
