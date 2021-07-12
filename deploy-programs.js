#!/usr/bin/env node
'use strict';
// const qtoolsGen = require('qtools');
// const qtools = new qtoolsGen(module, { updatePrototypes: true });

//npm i qtools-functional-library
//npm i qtools-config-file-processor
//npm i qtools-parse-command-line

// const configFileProcessor = require('qtools-config-file-processor');
//const configSegmentName=require('path').basename(__filename).replace(/\.\w+$/, '');
//const configPath=path.join(schUtilitiesProjectRoot, 'configs','instanceSpecific', PROJECT_NAMEConfigDirName, 'systemConfig.ini')
//const config = configFileProcessor.getConfig(configPath)['MODULE_NAME']; 

// const commandLineParser = require('qtools-parse-command-line');
// const commandLineParameters = commandLineParser.getParameters();

const qt = require('qtools-functional-library');
//console.dir(qt.help());

console.log(`HELLO FROM: ${__filename}`);

//START OF moduleFunction() ============================================================

const moduleFunction = function(args={}) {

	const workingFunctionActual=localArgs=>operatingArgs=>{
	
		return "hello";
	
	}
	

	const workingFunction=workingFunctionActual(Object.assign({}, args));

	return ({workingFunction});
};

//END OF moduleFunction() ============================================================

module.exports = args=>new moduleFunction(args)
//module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

