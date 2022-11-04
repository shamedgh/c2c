'use strict';

const fs = require('fs-extra');

/**
 * Check if the given directory is empty
 * @function $file~isEmptyDir
 * @param {string} dir
 * @returns {boolean} Returns true if the directory is empty or does not exists
 * @example
 * // Check if '/tmp' directory is empty
 * $file.isEmptyDir('/tmp');
 * // => false
 */
function isEmptyDir(dir) {
  try {
    return !(fs.readdirSync(dir).length > 0);
  } catch (e) {
    if (e.code === 'ENOENT') {
      // We consider non-existent as empty
      return true;
    }
    throw e;
  }
}


module.exports = isEmptyDir;
