#!/usr/bin/env node
'use strict';
const qt = require('qtools-functional-library');
const xLog = require('./lib/x-log');

const buildTransferSetList = require('./lib/build-transfer-set-list');
const buildSshRemoteSetLists = require('./lib/build-ssh-remote-set-lists');
const copyFiles = require('./lib/copy-files');

//START OF moduleFunction() ============================================================

const moduleFunction = function(args = {}) {
	process.global = {};
	process.global.xLog = xLog;

	const configSegmentName = require('path')
		.basename(__filename)
		.replace(/\.\w+$/, '');
	const moduleConfig = require('./lib/assemble-configuration-show-help-maybe-exit')(
		{ configSegmentName, terminationFunction:process.exit }
	);
	
	if (moduleConfig.switches.writeBoilerplateConfig){
	
console.dir({['moduleConfig']:moduleConfig});

console.log(`\n=-=============   writeBoilerplateConfig  ========================= [deploy-programs.js.moduleFunction]\n`);
writeBoilerplateConfig({filePath:moduleConfig.qtGetSurePath('fileList[0]')});

	process.exit(0);
	}

	const selectedTransferSetList = buildTransferSetList({ moduleConfig });

	const sshRemoteSetLists = buildSshRemoteSetLists({ moduleConfig });

	const result = copyFiles(
		{ sshRemoteSetLists, selectedTransferSetList, moduleConfig },
		(err, result) => {
			if (err) {
				xLog.status(`Processing finished with errors ---------------------`);
				xLog.error(err.qtDump({ returnString: true, label: 'ERRORS' }));
			}
			if (result) {
				xLog.status(`Processing complete ---------------------`);

				if (moduleConfig.switches.json) {
					process.stdout.write(JSON.stringify(result, '', '\t'));
				}
				
				if (!moduleConfig.switches.noReport) {
					process.stdout.write(
						result.qtDump({ noSuffix: true, returnString: true })
					);
				}
			}
		}
	);
};

//END OF moduleFunction() ============================================================

moduleFunction();

