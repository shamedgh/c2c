'use strict';

const fs = require('fs-extra');

/**
 * Check whether a given path is a link
 * @function $file~isLink
 * @param {string} file
 * @returns {boolean}
 * @example
 * // Check if 'conf' is a link
 * $file.isLink('conf');
 * // => false
 */
function isLink(file) {
  try {
    return fs.lstatSync(file).isSymbolicLink();
  } catch (e) {
    return false;
  }
}

module.exports = isLink;
