#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function({ filePath }) {
	const { xLog } = process.global;
	
	const boilerplatePath = path.join(
		__dirname,
		'..',
		'assets',
		'configBoilerplate.ini'
	);

	const boilerplate = fs.readFileSync(boilerplatePath);

	fs.mkdirSync(path.dirname(filePath), { recursive: true });

	fs.writeFileSync(filePath, boilerplate, { recursive: true, flag: 'a+' });
	xLog.status(`Writing config boilerplate to ${filePath}`);
	
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
