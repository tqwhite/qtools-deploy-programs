#!/usr/bin/env node
'use strict';
const qt = require('qtools-functional-library');
const xLog = require('./lib/x-log');

const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

const buildTransferSetList = require('./lib/build-transfer-set-list');
const buildSshRemoteSetLists = require('./lib/build-ssh-remote-set-lists');
const copyFiles = require('./lib/copy-files');
const listActions = require('./lib/list-actions');

//START OF moduleFunction() ============================================================

const moduleFunction = function(args = {}) {
	process.global = {};
	process.global.xLog = xLog;

	const configSegmentName = require('path')
		.basename(__filename)
		.replace(/\.\w+$/, '');

	const taskList = [];
	
	taskList.push((args, next) => {
		const localCallback = (err, moduleConfig) => {
			next(err, { ...args, moduleConfig });
		};

		require('./lib/assemble-configuration-show-help-maybe-exit')({
			configSegmentName,
			terminationFunction: process.exit,
			callback: localCallback
		});
	});
	
	taskList.push((args, next) => {
		const { moduleConfig } = args;
		const localCallback = (err, copyResult) => {
			next(err, { ...args, copyResult });
		};

		if (moduleConfig.switches.listActions) {
			listActions({
				moduleConfig
			});
			process.exit(0);
		}

		const selectedTransferSetList = buildTransferSetList({ moduleConfig });

		const sshRemoteSetLists = buildSshRemoteSetLists({ moduleConfig });

		const result = copyFiles(
			{ sshRemoteSetLists, selectedTransferSetList, moduleConfig },
			localCallback
		);
	});
	
	const initialData = {};
	asynchronousPipePlus.pipeRunner(taskList, initialData, (err, result) => {
		const { moduleConfig, copyResult } = result;
		if (err=='skipRestOfPipe'){
			process.exit(0);
		}
		
		if (err) {
			xLog.error(err.qtDump({ noSuffix: true, returnString: true, label: 'ERRORS' }));
			process.exit(1);
		}
		if (result) {

			if (moduleConfig.switches.json) {
				process.stdout.write(JSON.stringify(copyResult, '', '\t'));
			}

			if (!moduleConfig.switches.noReport) {
				process.stdout.write(
					copyResult
						.qtDump({ noSuffix: true, returnString: true })
						.replace(/\\n/g, '')
				);
				xLog.status(`Processing complete ---------------------`);
			}
			process.exit(0);
		}
	});
};

//END OF moduleFunction() ============================================================

moduleFunction();

