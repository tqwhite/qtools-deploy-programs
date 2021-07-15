#!/usr/bin/env node
'use strict';

const configFileProcessor = require('qtools-config-file-processor');
const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function() {
	const { xLog } = process.global;

	const getConfig = ({ configSegmentName, filePath }) => {
		if (filePath.match(/\.ini$/)) {
			const config = configFileProcessor.getConfig(filePath)[configSegmentName];
			if (typeof config == 'undefined' || Object.keys.length == 0) {
				const message = `Bad configuration file. No ${configSegmentName} section or the section is empty`;
				xLog.error(message);
				throw message;
			}
			return config;
		}
	};

	return { getConfig };
};

//END OF moduleFunction() ============================================================

module.exports = new moduleFunction();
