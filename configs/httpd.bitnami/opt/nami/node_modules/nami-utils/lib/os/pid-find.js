'use strict';

const _ = require('../lodash-extra.js');
const runningAsRoot = require('./running-as-root.js');
const ps = require('./ps.js');

/**
 * Check if the given PID exists
 * @function $os~pidFind
 * @param {number} pid - Process ID
 * @returns {boolean}
 * @example
 * // Check if the PID 123213 exists
 * $os.pidFind(123213);
 * // => true
 */
function pidFind(pid) {
  if (!_.isFinite(pid)) return false;
  try {
    if (runningAsRoot()) {
      return process.kill(pid, 0);
    } else {
      return !!ps(pid);
    }
  } catch (e) {
    return false;
  }
}

module.exports = pidFind;
