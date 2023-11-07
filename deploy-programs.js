#!/usr/bin/env node
'use strict';
const qt = require('qtools-functional-library');
const xLog = require('./lib/x-log');

const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

const buildActionSetList = require('./lib/build-action-set-list');
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
	
	const metadataFileName='.deployProgramsMetadata.ini';
	
	taskList.push((args, next) => {
		const localCallback = (err, moduleConfig) => {
			next(err, { ...args, moduleConfig });
		};

		require('./lib/assemble-configuration-show-help-maybe-exit')({
			configSegmentName,
			metadataFileName,
			terminationFunction: process.exit,
			callback: localCallback
		});
	});
	
	
	
	taskList.push((args, next) => {
		const { moduleConfig } = args;
		const {switches={}}=moduleConfig;
		
		if (
			switches.listActions ||
			!moduleConfig.qtGetSurePath('values.actions.length')
		) {
			listActions({
				moduleConfig
			});
			next('skipRestOfPipe');
			return;
		}

		if (
			switches.prod &&
			!switches.forceProd
		) {
			const result = require('./lib/confirm-prod')({
				callback: (err, confirmation) => {
					if (!confirmation) {
						next('skipRestOfPipe');
						return;
					}
					next(err, args);
				}
			});
			return;
		}
		
		next('', args);
	});
	
	taskList.push((args, next) => {
		const { moduleConfig } = args;
		
		const selectedActionSetList = buildActionSetList({ moduleConfig });

		const sshRemoteSetLists = buildSshRemoteSetLists({ moduleConfig });

		//EXECUTE ACTIONS ------------------------------------------------

		const localCallback = (err, copyResult) => {
			next(err, { ...args, copyResult });
		};

		const result = copyFiles(
			{ sshRemoteSetLists, selectedActionSetList, moduleConfig },
			localCallback
		);

		//EXECUTE ACTIONS ------------------------------------------------
	});

//RUN THE PROCESS ============================================================	

	const initialData = {};
	asynchronousPipePlus.pipeRunner(taskList, initialData, (err, result = {}) => {


		if (result) {
			const { moduleConfig={}, copyResult } = result;
				const {switches={}}=moduleConfig;
			if (switches.json) {
				process.stdout.write(JSON.stringify(copyResult, '', '\t'));
			} else if (!switches.noReport) {
				typeof(copyResult)=='object' && process.stdout.write(
					copyResult
						.qtDump({ noSuffix: true, returnString: true })
						.replace(/\\n/g, '')
				);
				xLog.status(`\nProcessing complete ---------------------`);
			}
		}

		if (err && err != 'skipRestOfPipe') {
			xLog.error(
				err.qtDump({ noSuffix: true, returnString: true, label: 'ERRORS' })
			);
			process.exit(1);
		}
			process.exit(0);
	});
};

//END OF moduleFunction() ============================================================

moduleFunction();

