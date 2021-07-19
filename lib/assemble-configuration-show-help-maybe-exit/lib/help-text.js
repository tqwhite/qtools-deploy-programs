#!/usr/bin/env node
'use strict';


const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function(args={}) {

const mainHelp=({errorMessage=''}={})=>{

return `
============================================================

NAME

	deployPrograms (deploy-programs.js) - Use rsync to copy programs with command line subdirectory selection

DESCRIPTION

	deployPrograms configFilePath --options=cfm #send code, configs, management as defined in configFilePath

	deployPrograms looks at a config file for parameters and file copy path sets. Based
	on those it asks questions and then rsync's files.

	If a file path is specified, that is the config file that is used.

	If no config file path is specified, the program searches for it.

		1) It walks up from the current directory to locate system and then looks for 
		system/configs/deploy-programs.ini.

		2) if that does not exist, it walks toward $HOME looking for deploy-programs.ini.

	--options is a concatenated list of flags referring to values defined in deploy-configs.ini.
		If none are specified, then the default switch list in the config file is used.
		If the appropriate flag is set in config, a confirmation will be requested from the user.

CONTROLS

--actions	takes a list of selection options

-prod	Use 'prodRemotePath' element in configuration file (default is 'remotePath')
-forceProd	skip user confirmation for writing to production (default is show prompt)

-skipInitCleanup	do not execute initialize and cleanup action tasks

-writeBoilerplateConfig	writes a sample config file to configFilePath if file
	does not exist. Appends the boilerplate if it does. No processing is done.

OUTPUT

-help, --help	shows this help message. No processing is done.

-listActions	list the actions in the chosen config. no processing is done.

-showConfig	display the finished configuration file

-silent
-quiet
-verbose

-json	return results as JSON (default is nodeJS util.inspect() format)

-noReport	suppress summary report (only applies without -json)

EXAMPLES

deployPrograms "FILEPATH/config.ini" -writeBoilerplateConfig
deployPrograms "FILEPATH/config.ini" --actions=hostname -skipInitCleanup

============================================================
${errorMessage}
`
	;

}

	return ({mainHelp});
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction();
//moduleFunction().workingFunction().qtDump();

