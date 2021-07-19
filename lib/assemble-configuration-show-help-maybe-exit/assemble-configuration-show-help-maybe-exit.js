'use strict';

const qt = require('qtools-functional-library');

const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

const commandLineParser = require('qtools-parse-command-line');
const writeBoilerplateConfig = require('../write-boilerplate-config');

const findConfigFile = require('../find-config-file');
const helpText = require('./lib/help-text');

//START OF moduleFunction() ============================================================

const moduleFunction = function({
	configSegmentName,
	callback
}) {
	const { xLog } = process.global;
	const validControls = [
		'-silent',
		'-quiet',
		'-verbose',
		'--transfers',
		'-writeBoilerplateConfig',
		'-help',
		'--help',
		'-json',
		'-noReport',
		'-writeBoilerplateConfig',
		'-skipInitCleanup',
		'-listActions',
		'-prod',
		'-forceProd',
		'-showConfig'
	];
	
	const commandLineParameters = commandLineParser.getParameters();
	
	const taskList = [];

	taskList.push((args, next) => {
		const {
			configSegmentName,
			commandLineParameters
		} = args;

		if (
			commandLineParameters.switches.help ||
			commandLineParameters.values.help
		) {
			process.stdout.write(helpText.mainHelp());
			next('skipRestOfPipe');
			return;
		}

		if (commandLineParameters.switches.writeBoilerplateConfig) {
			writeBoilerplateConfig({
				filePath: commandLineParameters.qtGetSurePath('fileList[0]')
			});
			next('skipRestOfPipe');
			return;
		}

		if (
			commandLineParameters.switches.prod &&
			!commandLineParameters.switches.forceProd
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
		} else {
			next('', args);
		}
	});
	
	
	taskList.push((args, next) => {
		const localCallback = (err, moduleConfig) => {
			next(err, {
				...args,
				moduleConfig: { ...moduleConfig, ...commandLineParameters }, configFilePath:commandLineParameters.fileList[0]
			});
		};

		findConfigFile.getConfig(
			{
				configSegmentName,
				filePath: commandLineParameters.fileList[0],
				options: commandLineParameters.switches.prod
					? { useProdPath: true }
					: void 0
			},
			localCallback
		);
	});
	
	taskList.push((args, next) => {
		const { moduleConfig, configFilePath } = args;

		const localCallback = (err) => {
			next(err, args);
		};
		
		

		if (
			commandLineParameters.switches.showConfig
		) {
			moduleConfig.qtDump({noSuffix:true});
			process.stdout.write(`config file path: ${configFilePath}`);
			next('skipRestOfPipe');
			return;
		}

		const errors = process.argv
			.filter(item => item.match(/^-/))
			.filter(item => {
				return !validControls.filter(validItem => item.match(validItem)).length;
			});

		let errorMessage = '';

		if (errors.length) {
			const errList = errors
				.reduce((result, item) => result + item + ', ', '')
				.replace(/, $/, '');

			next(
				`Bad flags in command line ${errList}. Try --help. (Did you miss a double hyphen?)`
			);
			return;
		}

		localCallback('', moduleConfig);
	});

	const initialData = {
		configSegmentName,
		commandLineParameters
	};
	asynchronousPipePlus.pipeRunner(
		taskList,
		initialData,
		(err, finalResult = {}) => {
			const { moduleConfig = {}, commandLineParameters = {} } = finalResult;
			if (err) {
				callback(err);
				return;
			}
			if (
				!commandLineParameters.switches.help &&
				!commandLineParameters.values.help
			) {
				callback('', moduleConfig);
			}
		}
	);
	
	
};

//END OF moduleFunction() ============================================================

module.exports = args => new moduleFunction(args);

