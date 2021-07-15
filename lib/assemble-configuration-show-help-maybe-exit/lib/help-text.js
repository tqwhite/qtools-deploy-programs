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

--transfers	takes a list of selection options

-writeBoilerplateConfig	writes a config file with placeholders to configFilePath if file
	does not exist. Appends the boilerplate if it does.

-silent
-quiet
-verbose

-json	return results as JSON (default is nodeJS util.inspect() format)

-noReport	suppress summary report (only applies without -json)

-writeBoilerplateConfig	write boilerplate configuration to file path, append if the file already exists

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

