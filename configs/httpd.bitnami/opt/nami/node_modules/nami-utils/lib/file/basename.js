'use strict';

const path = require('path');

/**
 * Get file path basename
 * @function $file~basename
 * @param {string} file - File from which to calculate then basename
 * @returns {string} - The basename of the given path
 * @example
 * // Get basename of a file
 * $file.basename('/foo/bar/sample')
 * // => 'sample'
 */
function basename(file /* , options */) {
  return path.basename(file);
}

module.exports = basename;
