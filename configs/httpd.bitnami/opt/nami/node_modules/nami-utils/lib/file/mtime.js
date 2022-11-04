'use strict';

const getAttrs = require('./get-attrs.js');

/**
 * Get file modification time
 * @function $file~mtime
 * @param {string} file
 * @returns {number} - File modification time
 * @example
 * // Get modification time of 'logs/access.log'
 * $file.mtime('logs/access.log');
 * // => Wed Jan 20 2016 18:48:48 GMT+0100 (CET)
 */
function mtime(file) {
  return getAttrs(file).mtime;
}

module.exports = mtime;
