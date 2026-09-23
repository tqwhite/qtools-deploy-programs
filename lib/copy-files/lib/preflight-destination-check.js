#!/usr/bin/env node
'use strict';

// Asks rsync what it is ABOUT to destroy, before it destroys it.
//
// WHY THIS EXISTS. The deploy rsync runs with --delete, so it makes the
// destination match the source exactly. Two things can be lost that way and
// neither is announced: a file that exists only on the server gets DELETED, and
// a file that someone or something edited on the server gets OVERWRITTEN by an
// older local copy. The second is the subtle one and it has happened: certbot
// wrote an SSL block into a deployed nginx config, a later configs deploy
// replaced that file with the repository's copy, and from then on the hostname
// matched no server block and fell through to whichever one nginx had chosen as
// its default. The site answered every request, with someone else's content, and
// never once produced an error.
//
// HOW IT DETECTS THE SECOND CASE, which is the subtle one. Two dry runs:
//
//   run A   the real transfer, --dry-run --itemize-changes
//   run B   the same, plus --update (which skips files NEWER on the receiver)
//
// Whatever appears in A and not in B is a destination file that is newer than
// the local one and is about to be replaced by it. Since rsync -a preserves
// mtimes, a destination file is newer than its source only if something changed
// it AFTER the last deploy put it there. That is exactly the certbot case.
//
// The dry runs deliberately omit --checksum. The real transfer uses it, but
// checksumming a 378MB tree twice to answer a question that mtime and size
// already answer would make every deploy slow enough that someone turns the
// check off - and a guard that gets turned off is not a guard.

const qt = require('qtools-functional-library');
const { exec } = require('child_process');

// The whole check rests on mtimes, so it rests on the two machines agreeing
// about what time it is. That dependency is stated here rather than assumed:
// if the clocks disagree by more than this, the check refuses to render a
// verdict instead of quietly rendering a wrong one.
//
// TIMEZONE IS NOT INVOLVED. An mtime is Unix epoch seconds, which is the same
// number everywhere; a timezone only changes how that number is DISPLAYED.
// A workstation on Central and a server on UTC are five hours apart on screen
// and identical in epoch. So a server in any timezone is fine, and this
// comparison is done in epoch seconds precisely so it stays that way.
//
// Five seconds is generous. rsync compares mtimes at one-second granularity,
// and the measurement below already subtracts ssh round-trip latency rather
// than guessing at it, so real drift is what is left.
const maximumClockSkewSeconds = 5;

//START OF moduleFunction() ============================================================

const moduleFunction = function ({
	rsyncGen,
	sourcePath,
	destPath,
	sshString,
	exclusions = [],
	suppressDeleteFlag = false
}) {
	const { xLog } = process.global;

	// rsync --itemize-changes emits one line per item:
	//   *deleting   some/path          a removal
	//   >f.st...... some/path          a transfer, flags in the first field
	// The path is everything after the first whitespace run.
	const parseItemizedOutput = (text = '') => {
		const deletions = [];
		const transfers = [];

		text.split('\n').forEach((rawLine) => {
			const line = rawLine.replace(/\r$/, '');

			if (!line.trim()) {
				return;
			}

			const separatorPosition = line.search(/\s/);

			if (separatorPosition < 1) {
				return; // not an itemized line; rsync also prints summary prose
			}

			const marker = line.slice(0, separatorPosition);
			const itemPath = line.slice(separatorPosition).trim();

			if (!itemPath) {
				return;
			}

			if (marker === '*deleting') {
				deletions.push(itemPath);
				return;
			}

			if (/^[<>ch.]/.test(marker)) {
				transfers.push(itemPath);
			}
		});

		return { deletions, transfers };
	};

	// 'user@host:/some/path' -> 'user@host'. A purely local path yields nothing,
	// which is the signal that there is no clock to compare against.
	const remoteEndOf = (candidatePath = '') => {
		const colonPosition = candidatePath.indexOf(':');
		const slashPosition = candidatePath.indexOf('/');

		if (colonPosition < 1) {
			return '';
		}

		if (slashPosition > -1 && slashPosition < colonPosition) {
			return ''; // the colon is inside a path, not a host separator
		}

		return candidatePath.slice(0, colonPosition);
	};

	const verifyClockAgreement = (callback) => {
		const userAtHost = remoteEndOf(destPath) || remoteEndOf(sourcePath);

		if (!userAtHost) {
			callback('', { skewSeconds: 0, compared: false });
			return;
		}

		const localBefore = Math.floor(Date.now() / 1000);

		exec(`${sshString} ${userAtHost} date -u +%s`, (err, stdout) => {
			if (err) {
				callback(
					`could not read the clock on ${userAtHost} (${err.message.split('\n')[0]})`
				);
				return;
			}

			const localAfter = Math.floor(Date.now() / 1000);
			const remoteSeconds = parseInt(stdout.toString().trim(), 10);

			if (!Number.isFinite(remoteSeconds)) {
				callback(
					`${userAtHost} did not return a readable epoch time: '${stdout
						.toString()
						.trim()}'`
				);
				return;
			}

			// The remote reading was taken somewhere between localBefore and
			// localAfter, so anything inside that window is agreement. Only the
			// amount by which it falls OUTSIDE the window is real skew, which is
			// how round-trip latency is subtracted rather than estimated.
			const behindBy = localBefore - remoteSeconds;
			const aheadBy = remoteSeconds - localAfter;
			const skewSeconds = Math.max(behindBy, aheadBy, 0);

			if (skewSeconds > maximumClockSkewSeconds) {
				callback(
					`the clock on ${userAtHost} differs from this machine by about ${skewSeconds}s ` +
						`(tolerance is ${maximumClockSkewSeconds}s). This check compares file modification ` +
						`times, so it cannot give a trustworthy answer while the clocks disagree. ` +
						`Fix time sync on ${userAtHost} - not a timezone setting, the actual clock.`
				);
				return;
			}

			callback('', { skewSeconds, compared: true });
		});
	};

	const runOneDryRun = ({ withUpdate }, callback) => {
		let collectedOutput = '';

		const rsync = new rsyncGen()
			.flags('az')
			.set('copy-links')
			.set('human-readable')
			.set('dry-run')
			.set('itemize-changes')
			.set(suppressDeleteFlag ? '' : 'delete')
			.set(withUpdate ? 'update' : '')
			.source(sourcePath)
			.destination(destPath)
			.exclude(exclusions)
			.shell(sshString);

		rsync.execute(
			(err, statusCode, commandString) => {
				if (err) {
					callback(
						`preflight dry run failed (${err}) using: ${commandString}`
					);
					return;
				}

				callback('', parseItemizedOutput(collectedOutput));
			},
			(data) => {
				collectedOutput += data.toString();
			},
			() => {} // stderr is reported through the error code above
		);
	};

	return (callback) => {
		verifyClockAgreement((err, clockReport) => {
			if (err) {
				callback(err);
				return;
			}

			xLog.verbose(
				`preflight clock check: ${
					clockReport.compared
						? `${clockReport.skewSeconds}s skew, within ${maximumClockSkewSeconds}s`
						: 'both ends local, no clock comparison needed'
				}`
			);

			runOneDryRun({ withUpdate: false }, (err, plain) => {
			if (err) {
				callback(err);
				return;
			}

			runOneDryRun({ withUpdate: true }, (err, respectingNewer) => {
				if (err) {
					callback(err);
					return;
				}

				const survivingTransfers = respectingNewer.transfers.reduce(
					(accumulator, itemPath) => {
						accumulator[itemPath] = true;
						return accumulator;
					},
					{}
				);

				const clobberNewer = plain.transfers.filter(
					(itemPath) => !survivingTransfers[itemPath]
				);

				callback('', {
					deletions: plain.deletions,
					clobberNewer,
					clockSkewSeconds: clockReport.skewSeconds
				});
				});
			});
		});
	};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
