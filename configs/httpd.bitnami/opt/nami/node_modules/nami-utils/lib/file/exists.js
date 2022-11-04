'use strict';

const fs = require('fs-extra');

/**
 * Check whether a file exists or not
 * @memberof $file
 * @param {string} file
 * @returns {boolean}
 * @example
 * // Check if file exists
 * $file.exists('/opt/bitnami/properties.ini')
 * // => true
 */
function exists(file) {
  try {
    fs.lstatSync(file);
    return true;
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') {
      return false;
    } else {
      throw e;
    }
  }
}

module.exports = exists;
