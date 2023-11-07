'use strict';

const qt = require('qtools-functional-library');

const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

const commandLineParser = require('qtools-parse-command-line');
const writeBoilerplateConfig = require('../write-boilerplate-config');
const writeBoilerplateMetadata = require('../write-boilerplate-metadata');

const findConfigFile = require('../find-config-file');
const helpText = require('./lib/help-text');

const figureOutConfigPathGen=require('./lib/figure-out-config-path');

const fs = require('fs');

//START OF moduleFunction() ============================================================

const moduleFunction = function({ configSegmentName, metadataFileName, callback }) {
	const { xLog } = process.global;
	const validControls = [
		'-silent',
		'-quiet',
		'-verbose',
		'--actions',
		'-writeBoilerplateConfig',
		'-writeBoilerplateMetadata',
		'-help',
		'--help',
		'-json',
		'-noReport',
		'-skipInitCleanup',
		'-listActions',
		'-prod',
		'-forceProd',
		'-showConfig'
	];
	
	const commandLineParameters = commandLineParser.getParameters();
	const figureOutConfigPath=figureOutConfigPathGen({metadataFileName})
	
	const taskList = [];

	taskList.push((args, next) => {
		const { configSegmentName, commandLineParameters } = args;

		//commandLineParser does not include switch flags presented after an empty --values element.
		//eg, "deployPrograms filePath -xxx --values= --yyy" only finds xxx, not yyy
		//I use aliases to drive deployPrograms, eg, "alias copySomething=deployPrograms configPath --actions"
		//but also want to use "copySomething -help"
		//this expands to "deployPrograms configPath --actions -help" and the flaw omits switch.help.
		//This line works around the flaw. tqii 7/20/21

		const help = process.argv.filter(item => item.match(/-help/)).qtLast();

		if (help) {
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

		if (commandLineParameters.switches.writeBoilerplateMetadata) {
			writeBoilerplateMetadata({
				dirPath: commandLineParameters.qtGetSurePath('fileList[0]')
			});
			next('skipRestOfPipe');
			return;
		}
		
		if (!commandLineParameters.fileList[0] && figureOutConfigPath.foundMetadata()){
			xLog.status(`No file name or alias supplied. Listing aliases.`);
			process.stdout.write(figureOutConfigPath.listAliases());
			next('skipRestOfPipe');
			return;
		}

		next('', args);
	});
	
	
	taskList.push((args, next) => {
		const localCallback = (err, moduleConfig) => {
			next(err, {
				...args,
				moduleConfig: { ...moduleConfig, ...commandLineParameters },
				configFilePath: commandLineParameters.fileList[0]
			});
		};
		
		const configFilePath = figureOutConfigPath.getConfigPath({fileString:commandLineParameters.fileList[0]});

		if (!fs.existsSync(configFilePath)) {
			xLog.error(`Config file missing. ${configFilePath} does not exist.`);
			next('skipRestOfPipe');
			return;
		}
		xLog.status(`Using config file: ${configFilePath}\n`);

		findConfigFile.getConfig(
			{
				configSegmentName,
				filePath: configFilePath,
				options: (commandLineParameters.switches.prod || commandLineParameters.switches.forceProd)
					? { useProdPath: true }
					: void 0
			},
			localCallback
		);
	});
	
	taskList.push((args, next) => {
		const { moduleConfig, configFilePath } = args;

		const localCallback = err => {
			next(err, args);
		};

		if (commandLineParameters.switches.showConfig) {
			moduleConfig.qtDump({ noSuffix: true });
			process.stdout.write(JSON.stringify(moduleConfig, '', '\t'));
			process.exit(); //EXIT ==================================================
			//next('skipRestOfPipe');
			//return;
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

