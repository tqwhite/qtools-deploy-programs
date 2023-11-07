#!/usr/bin/env node
'use strict';

const configFileProcessor = require('qtools-config-file-processor');

const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function({ metadataFileName } = {}) {
	const { xLog } = process.global;
	const metaData = configFileProcessor.getConfig(
		metadataFileName,
		process.env.PWD,
		{}
	);

	xLog.status(
		`Found metadata file: ${configFileProcessor.getRecentConfigPath()}`
	);

	const aliases = metaData ? metaData.qtGetSurePath('aliases', {}) : {};
	
	if (metaData && !Object.keys(aliases).length) {
		xLog.status(`Metadata files is empty`);
	}
	
	
	const getConfigPath = ({ fileString } = {}) => {
		const aliasResult = aliases.qtGetSurePath(fileString);
		return aliasResult?aliasResult:fileString;
	};
	
	const listAliases = () => {
	
		return `
-----------------------------------------------------------------------------------------
Configuration aliases found in ${configFileProcessor.getRecentConfigPath()}

${Object.keys(aliases).sort().map(aliasName=>`${aliasName} - ${aliases[aliasName]}`).join('\n')}

EG:

deployPrograms aliasName -listActions

-----------------------------------------------------------------------------------------
		
		`;
	
	};
	
	const foundMetadata=()=>metaData?true:false;
	
	
	return { getConfigPath, listAliases, foundMetadata };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
