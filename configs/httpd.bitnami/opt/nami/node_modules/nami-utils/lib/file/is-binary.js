'use strict';

const isBinaryFile = require('isbinaryfile').sync;

/**
 * Check whether a given file is a binary
 * @function $file~isBinary
 * @param {string} file
 * @returns {boolean}
 * @example
 * // Checks if the file '/bin/ls' is a binary file
 * $file.isBinary('/bin/ls');
 * // => true
 * @example
 * // Checks if the file 'conf/my.cnf' is a binary file
 * $file.isBinary('conf/my.cnf');
 * // => false
 */
function isBinary(file) {
  return isBinaryFile(file);
}

module.exports = isBinary;
