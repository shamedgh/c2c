'use strict';

const findInPath = require('./find-in-path.js');

/**
 * Check if binary can be found in the system PATH
 * @function $os~isInPath
 * @param {string} binary - Binary to look for
 * @returns {boolean} - Whether the binary can be found or not in the PATH
 * @example
 * // Check if the binary 'node' is currently in the system PATH
 * $os.isInPath('node');
 * => true
 */
function isInPath(binary) {
  return !!findInPath(binary);
}

module.exports = isInPath;
