'use strict';

const getAttrs = require('./get-attrs.js');

/**
 * Retrieves file permissions
 * @function $file~permissions
 * @param {string} file
 * @returns {string} - File permissions
 * @example
 * // Get file permissions of 'conf/my.cnf'
 * $file.permissions('conf/my.cnf')
 * // => '0660'
 */
function permissions(file) {
  return getAttrs(file).mode;
}

module.exports = permissions;
