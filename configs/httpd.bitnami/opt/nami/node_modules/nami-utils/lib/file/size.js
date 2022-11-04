'use strict';

const _fileStats = require('./common.js').fileStats;
const isFile = require('./is-file.js');
const exists = require('./exists.js');


/**
 * Returns the size of a given path. Returns -1 if the path is a directory or does not exists.
 * @function $file~size
 * @param {string} file
 * @returns {number}
 * @example
 * // Get file size of '/bin/ls'
 * $file.size('/bin/ls');
 * // => 110080
 */
function size(file) {
  if (!exists(file) || !isFile(file)) {
    return -1;
  } else {
    try {
      return _fileStats(file).size;
    } catch (e) {
      return -1;
    }
  }
}


module.exports = size;
