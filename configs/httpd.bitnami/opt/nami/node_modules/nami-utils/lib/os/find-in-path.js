'use strict';

const lookForBinary = require('../common.js').lookForBinary;

/**
 * Get full path to a binary in the system PATH
 * @function $os~findInPath
 * @param {string} binary - Binary to look for
 * @returns {string} - The full path to the binary or null if it is not in the PATH
 * @example
 * // Get the path of the 'node' binary
 * $os.findInPath('node');
 * => '/usr/local/bin/node'
 */
function findInPath(binary) {
  return lookForBinary(binary);
}

module.exports = findInPath;
