#!/usr/bin/env node
'use strict';

const qt = require('qtools-functional-library');
//START OF moduleFunction() ============================================================

const moduleFunction = function({moduleConfig}) {

const applicationName=moduleConfig.qtGetSurePath('annotation.applicationName');
const serverName=moduleConfig.qtGetSurePath('annotation.serverName');
const applicationString=applicationName?` for ${applicationName}`:'';



const serverSpecificInfo=moduleConfig.serverSpecificInfoList?`
SPECIAL INSTRUCTIONS FOR ${moduleConfig.qtGetSurePath('_meta._substitutions.serverConfigName')}

${moduleConfig.serverSpecificInfoList.join('\n')}

`:'';

		process.stdout.write(`
ACTIONS AVAILABLE FOR ${serverName}:

${Object.keys(moduleConfig.actions).sort().map(name=>`\t${name} - ${moduleConfig.actions[name].annotation?moduleConfig.actions[name].annotation:'(no description available)'}`).join('\n')}
${serverSpecificInfo}
EXAMPLES

deployPrograms ${moduleConfig._meta.configurationSourceFilePath} --actions ${Object.keys(moduleConfig.actions).join(',')}

(more info can be gotten with -help)`);

};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;