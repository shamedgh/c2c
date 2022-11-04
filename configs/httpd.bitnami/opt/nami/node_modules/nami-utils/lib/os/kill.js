'use strict';

const _ = require('../lodash-extra.js');
const signalsMap = _.invert(require('./constants.js').signals);

/**
 * Send signal to process
 * @function $os~kill
 * @param {number} pid - Process ID
 * @param {number|string} [signal=SIGINT] - Signal number or name
 * @returns {boolean} - True if it successed to kill the process
 * @example
 * // Send 'SIGKILL' signal to process 123213
 * $os.kill(123213, 'SIGKILL')
 * // => true
 */
function kill(pid, signal) {
  signal = _.isUndefined(signal) ? 'SIGINT' : signal;
  // process.kill does not recognize many of the well known numeric signals,
  // only by name
  if (_.isFinite(signal) && _.has(signalsMap, signal)) {
    signal = signalsMap[signal];
  }

  if (!_.isFinite(pid)) return false;
  try {
    process.kill(pid, signal);
  } catch (e) {
    return false;
  }
  return true;
}

module.exports = kill;
