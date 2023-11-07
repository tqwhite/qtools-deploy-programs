#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function({ dirPath=process.env.HOME }) {
	const { xLog } = process.global;
	
	const boilerplatePath = path.join(
		__dirname,
		'..',
		'assets',
		'metadataBoilerplate.ini'
	);

	const boilerplate = fs.readFileSync(boilerplatePath);

	fs.mkdirSync(dirPath, { recursive: true });
	
	const filePath=path.join(dirPath, '.deployProgramsMetadata.ini');

	fs.writeFileSync(filePath, boilerplate, { recursive: true, flag: 'a+' });
	
	xLog.status(`Writing or appending metadata boilerplate to ${filePath}\n`);
	
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
