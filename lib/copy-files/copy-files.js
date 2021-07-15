#!/usr/bin/env node
'use strict';

const qt = require('qtools-functional-library');

const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

const rsyncGen = require('rsync');

const makeTransferTask = require('./lib/make-transfer-task');
const makeSshTask = require('./lib/make-ssh-task');

//START OF moduleFunction() ============================================================

const moduleFunction = function(
	{ sshRemoteSetLists, selectedTransferSetList, moduleConfig },
	callback
) {
	const { xLog } = process.global;
	const { initialization = [], cleanup = [], sshHost = {} } = sshRemoteSetLists;
	
	const {switches={}}=moduleConfig;
	const {skipInitCleanup}=switches;
	
	const initializationTasks = skipInitCleanup?[]:initialization.map((sshCommand, inx) =>
		makeSshTask({
			sshCommand,
			sshHost,
			annotation: `Initialization task ${inx}`,
			flagName: 'n/a'
		})
	);



	const transferTasks = selectedTransferSetList.reduce(
		(taskList, transferSet) => {
			const { ssh = {}, sshHost } = transferSet;
			const { before = [], after = [], overrideHost } = ssh;
			const { annotation, flagName } = transferSet;

			const beforeTasks = before.map(sshCommand =>
				makeSshTask({
					sshCommand,
					sshHost: overrideHost ? overrideHost : sshHost,
					annotation,
					flagName
				})
			);
			const transferTask = makeTransferTask({
				transferSet,
				rsyncGen
			});

			const afterTasks = after.map(sshCommand =>
				makeSshTask({
					sshCommand,
					sshHost: overrideHost ? overrideHost : sshHost,
					annotation,
					flagName
				})
			);
			
			return taskList.concat(beforeTasks, [transferTask], afterTasks);
		},
		[]
	);
	
	const cleanupTasks = skipInitCleanup?[]:cleanup.map((sshCommand, inx) =>
		makeSshTask({
			sshCommand,
			sshHost,
			annotation: `Cleanup task ${inx}`,
			flagName: 'n/a'
		})
	);
	
	const taskList = [].concat(initializationTasks, transferTasks, cleanupTasks);

	const initialData = {};
	pipeRunner(taskList, initialData, (err, args) => {
		callback(err, args);
	});
	
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
