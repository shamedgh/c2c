'use strict';

const _ = require('../lodash-extra.js');
const runProgram = require('../os/run-program.js');

/**
 * Wait the specified amount of seconds
 * @function $util~sleep
 * @param {string} seconds - Seconds to wait
 * @example
 * // Wait for 5 seconds
 * $util.sleep(5);
 */
function sleep(seconds) {
  const time = parseFloat(seconds, 10);
  if (!_.isFinite(time)) { throw new Error(`invalid time interval '${seconds}'`); }
  runProgram('sleep', [time], {logCommand: false});
}

module.exports = sleep;
