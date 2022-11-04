'use strict';

const _ = require('../lodash-extra.js');
const split = require('./split.js');
const path = require('path');


function _fileCleanPath(filePath) {
  return filePath.replace(/\/+|\\+/g, '/').replace(/\/$/, '');
}

/**
 * Take a path and a prefix and return a relativized version
 * @function $file~relativize
 * @param {string} path - File path to relativize
 * @param {string} prefix - Prefix to remove
 * @param {Object} [options]
 * @param {boolean} [options.force=false] - Relativize even if the path is not under the prefix
 * @returns {string} - The relativized path
 * @example
 * // Get relative path of 'test' from the '/foo' directory
 * $file.relativize('/foo/bar/test', '/foo');
 * // => 'bar/test'
 */
function stripPathPrefix(p, prefix, options) {
  if (!prefix) return p;
  options = _.sanitize(options, {force: false});
  p = _fileCleanPath(p);
  prefix = _fileCleanPath(prefix);
  if (options.force) {
    return path.relative(prefix, p);
  } else {
    const pathSplit = split(p);
    const prefixSplit = split(prefix);
    if (prefixSplit.length > pathSplit.length) return p;
    let i = 0;
    for (i = 0; i < prefixSplit.length; i++) {
      if (pathSplit[i] !== prefixSplit[i]) return p;
    }
    return pathSplit.slice(i).join('/');
  }
}

module.exports = stripPathPrefix;
