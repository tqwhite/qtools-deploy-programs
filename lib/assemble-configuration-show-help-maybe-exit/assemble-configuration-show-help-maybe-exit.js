'use strict';

const qt = require('qtools-functional-library');
const findConfigFile = require('../find-config-file');

const commandLineParser = require('qtools-parse-command-line');
const writeBoilerplateConfig = require('../write-boilerplate-config');

const helpText=require('./lib/help-text');

//START OF moduleFunction() ============================================================

const moduleFunction = function({
	configSegmentName,
	terminationFunction = () => {
		console.log('quit');
		process.exit();
	}
}) {
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
		'-skipInitCleanup'
	];

	const commandLineParameters = commandLineParser.getParameters();

	if (commandLineParameters.switches.help || commandLineParameters.values.help) {
		console.error(helpText.mainHelp());
		terminationFunction(0);
	}

	if (commandLineParameters.switches.writeBoilerplateConfig) {
		writeBoilerplateConfig({
			filePath: commandLineParameters.qtGetSurePath('fileList[0]')
		});
		terminationFunction(0);
	}

	const moduleConfig = {
		...findConfigFile.getConfig({
			configSegmentName,
			filePath: commandLineParameters.fileList[0]
		}),
		...commandLineParameters
	};

	const errors = process.argv.filter(item => item.match(/^-/)).filter(item => {
		return !validControls.filter(validItem => item.match(validItem)).length;
	});

	let errorMessage = '';

	if (errors.length) {
		const errList = errors
			.reduce((result, item) => result + item + ', ', '')
			.replace(/, $/, '');
		console.error(
			`Bad flags in command line ${errList}. Try --help. (Did you miss a double hyphen?)`
		);
		terminationFunction(1);
	}

	if (
		!commandLineParameters.switches.help &&
		!commandLineParameters.values.help
	) {
		return moduleConfig;
	}


};

//END OF moduleFunction() ============================================================

module.exports = args => new moduleFunction(args);

