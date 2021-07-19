#!/usr/bin/env node
'use strict';

const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function({ callback }) {
	const { xLog } = process.global;

	const readline = require('readline');
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.question('Are you sure you want to update production? [Y/n] ', function(
		response
	) {
		if (response !== 'Y'){
		xLog.error(`Caution is good. (Remember it has to be capital Y.)`);
		}
		callback('', response === 'Y' ? true : false);
	});

// 	rl.on('close', function() {
// 		console.log(
// 			`\n=-=============   close  ========================= [confirm-prod.js.[ anonymous ]]\n`
// 		);
// 		process.exit()
// 	});
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

