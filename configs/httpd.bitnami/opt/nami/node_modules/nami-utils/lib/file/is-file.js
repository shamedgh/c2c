'use strict';

const _ = require('../lodash-extra.js');
const _fileStats = require('./common.js').fileStats;

/**
 * Check whether a given path is a file
 * @function $file~isFile
 * @param {string} file
 * @param {Object} [options]
 * @param {boolean} [options.acceptLinks=true] - Accept links to files as files
 * @returns {boolean}
 * @example
 * // Checks if the file 'conf/my.cnf' is a file
 * $file.isFile('conf/my.cnf');
 * // => true
 */
function isFile(file, options) {
  options = _.sanitize(options, {acceptLinks: true});
  try {
    return _fileStats(file, options).isFile();
  } catch (e) {
    return false;
  }
}

module.exports = isFile;
