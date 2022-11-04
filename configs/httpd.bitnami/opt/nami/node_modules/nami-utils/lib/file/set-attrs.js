'use strict';

const _ = require('../lodash-extra.js');
const fs = require('fs-extra');
const isLink = require('./is-link.js');
const chmod = require('./chmod.js');

/**
 * Set file attributes
 * @function $file~setAttrs
 * @param {string} file
 * @param {Object} [options] - Object containing the file attributes: mode, atime, mtime
 * @param {Date|string|number} [options.atime] - File access time
 * @param {Date|string|number} [options.mtime] - File modification time
 * @param {string} [options.mode] - File permissions
 * @example
 * // Update modification time and permissions of a file
 * $file.setAttrs('timestamp', {mtime: new Date(), mode: '664'});
 */
function setAttrs(file, attrs) {
  if (isLink(file)) return;
  if (_.every([attrs.atime, attrs.mtime], _.identity)) {
    fs.utimesSync(file, new Date(attrs.atime), new Date(attrs.mtime));
  }
  if (attrs.mode) {
    chmod(file, attrs.mode);
  }
}

module.exports = setAttrs;
