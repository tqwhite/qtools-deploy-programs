#!/usr/bin/env node
'use strict';

const qt = require('qtools-functional-library');

const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

const rsyncGen = require('rsync');

const makeActionTask = require('./lib/run-rsync-task');
const makeSshTask = require('./lib/run-ssh-task');

//START OF moduleFunction() ============================================================

const moduleFunction = function(
	{ sshRemoteSetLists, selectedActionSetList, moduleConfig },
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



	const actionTasks = selectedActionSetList.reduce(
		(taskList, actionSet) => {
			const { ssh = {}, sshHost } = actionSet;
			const { before = [], after = [], overrideHost } = ssh;
			const { annotation, flagName } = actionSet;

			const beforeTasks = before.map(sshCommand =>
				makeSshTask({
					sshCommand,
					sshHost: overrideHost ? overrideHost : sshHost,
					annotation,
					flagName
				})
			);
			const actionTask = makeActionTask({
				actionSet,
				rsyncGen
			});

			const afterTasks = after.map(sshCommand =>
				makeSshTask({
					sshCommand,
					sshHost: overrideHost ? overrideHost : sshHost,
					annotation,
					flagName
				})
			); // run-ssh-task.js
			
			return taskList.concat(beforeTasks, [actionTask], afterTasks);
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
	
	const taskList = [].concat(initializationTasks, actionTasks, cleanupTasks);

	const initialData = {};
	pipeRunner(taskList, initialData, (err, args) => {
		callback(err, args);
	});
	
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
