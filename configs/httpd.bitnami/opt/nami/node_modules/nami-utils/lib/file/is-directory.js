'use strict';

const _ = require('../lodash-extra.js');
const _fileStats = require('./common.js').fileStats;


/**
 * Check whether a given path is a directory
 * @function $file~isDirectory
 * @param {string} file
 * @param {Object} [options]
 * @param {boolean} [options.acceptLinks=true] - Accept links to directories as directories
 * @returns {boolean}
 * @example
 * // Check if '/tmp' is a directory
 * $file.isDirectory('/tmp');
 * // => true
 */
function isDirectory(file, options) {
  options = _.sanitize(options, {acceptLinks: true});
  try {
    return _fileStats(file, options).isDirectory();
  } catch (e) {
    return false;
  }
}

module.exports = isDirectory;
