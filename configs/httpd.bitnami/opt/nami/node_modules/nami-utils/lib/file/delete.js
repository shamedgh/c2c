'use strict';

const fs = require('fs-extra');
const _ = require('../lodash-extra.js');
const isFileOrLink = require('./is-file-or-link.js');
const isEmptyDir = require('./is-empty-dir.js');
const _matchingFilesArray = require('./common.js').matchingFilesArray;

function _fileDelete(file, options) {
  options = _.opts(options, {exclude: [], deleteDirs: true, onlyEmptyDirs: false});
  if (options.deleteDirs) {
    if (options.onlyEmptyDirs && !isFileOrLink(file) && !isEmptyDir(file)) {
      return false;
    }
    try {
      fs.removeSync(file);
    } catch (e) {
      return false;
    }
  } else {
    try {
      fs.unlinkSync(file);
    } catch (e) {
      return false;
    }
  }
  return true;
}

/**
 * Delete file or directory
 * @function $file~delete
 * @param {string|string[]} source - File or array of files to copy. It also supports wildcards.
 * @param {Object} [options]
 * @param {string[]} [options.exclude=[]] - List of patterns used to exclude files when deleting
 * @param {string} [options.deleteDirs=true] - Also delete directories
 * @param {string} [options.onlyEmptyDirs=false] - Only delete directories if they are empty
 * @returns {boolean} Returns true if the path was deleted or false if not
 * @example
 * // Delete /foo/bar/sample file
 * $file.delete('/tmp/bar/sample');
 * => true
 * @example
 * // Delete /tmp/ files avoiding directories
 * $file.delete('/tmp/*', {deleteDirs: false});
 * => false
 */
function fileDelete(src, options) {
  options = _.sanitize(options, {exclude: [], deleteDirs: true, onlyEmptyDirs: false});
  let result = true;
  const files = _matchingFilesArray(src, options);
  _.each(files, (f) => {
    const fileWasDeleted = _fileDelete(f, options);
    result = result && fileWasDeleted;
  });
  return result;
}

module.exports = fileDelete;
