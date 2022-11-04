'use strict';

const path = require('path');

/**
 * Get an array formed with the file components
 * @function $file~split
 * @param {string} path - File path to split
 * @returns {string[]} - The path components of the path
 * @example
 * // Split '/foo/bar/file' into its path components
 * $file.split('/foo/bar/file');
 * // => [ '/', 'foo', 'bar', 'file' ]
 */
function split(p) {
  const components = p.replace(/\/+/g, '/').replace(/\/+$/, '').split(path.sep);
  if (path.isAbsolute(p) && components[0] === '') {
    components[0] = '/';
  }
  return components;
}

module.exports = split;
