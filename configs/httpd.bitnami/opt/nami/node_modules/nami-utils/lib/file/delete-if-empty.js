'use strict';


const _ = require('../lodash-extra.js');
const fileDelete = require('./delete.js');

/**
 * Delete file or empty directory
 * @function $file~deleteIfEmpty
 * @param {string} file
 * @param {Object} [options]
 * @param {string} [options.deleteDirs=true] - Also delete directories
 * @returns {boolean} Returns true if the path was deleted or false if not
 * @example
 * // Delete $app.installdir if it is empty
 * $file.deleteIfEmpty($app.installdir);
 * // => true
 */
function deleteIfEmpty(file, options) {
  options = _.opts(options, {deleteDirs: true});
  return fileDelete(file, _.extend(_.opts(options), {onlyEmptyDirs: true}));
}

module.exports = deleteIfEmpty;
