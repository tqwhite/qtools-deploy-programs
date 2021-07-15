#!/usr/bin/env node
'use strict';

const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function({ moduleConfig }) {
	const { sshRemoteActions = {} } = moduleConfig;
	
	const { hostName } = sshRemoteActions;
	
	const sshHost = moduleConfig.qtGetSurePath(`sftpHostLib.${hostName}`, {});
	
	return { ...sshRemoteActions, sshHost };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;