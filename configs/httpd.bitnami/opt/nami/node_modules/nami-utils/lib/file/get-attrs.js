'use strict';

const fs = require('fs-extra');
const fileType = require('./common.js').fileType;

function _getUnixPermFromMode(mode) {
  const perm = (mode & parseInt('07777', 8)).toString(8);
  const pad = '0'.repeat(4 - perm.length);
  // We return a fixed 4 "digits" permissions string, padded with leading 0
  return pad + perm;
}

/**
 * Get file attributes
 * @function $file~getAttrs
 * @param {string} file
 * @returns {object} - Object containing the file attributes: mode, atime, ctime, mtime, type
 * @example
 * // Get file attributes of 'conf/my.cnf'
 * $file.getAttrs('conf/my.cnf');
 * // => { mode: '0660',
 *         atime: Thu Jan 21 2016 13:09:58 GMT+0100 (CET),
 *         ctime: Thu Jan 21 2016 13:09:58 GMT+0100 (CET),
 *         mtime: Thu Jan 21 2016 13:09:58 GMT+0100 (CET),
 *         type: 'file' }
 */
function getAttrs(file) {
  const sstat = fs.lstatSync(file);
  return {
    mode: _getUnixPermFromMode(sstat.mode), type: fileType(file),
    atime: sstat.atime, ctime: sstat.ctime, mtime: sstat.mtime
  };
}


module.exports = getAttrs;
