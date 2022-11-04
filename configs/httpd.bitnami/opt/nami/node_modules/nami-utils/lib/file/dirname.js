'use strict';

const path = require('path');

/**
 * Get the dirname of the given path
 * @function $file~dirname
 * @param {string} file
 * @returns {string} - The dirname of the given path
 * @example
 * // Get file dirname
 * $file.dirname('/foo/bar/sample');
 * // => '/foo/bar'
 */
function dirname(file) {
  return path.dirname(file);
}

module.exports = dirname;
