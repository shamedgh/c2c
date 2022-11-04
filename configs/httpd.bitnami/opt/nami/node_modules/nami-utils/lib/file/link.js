'use strict';

const _ = require('../lodash-extra.js');
const fs = require('fs-extra');
const path = require('path');
const fileDelete = require('./delete.js');
const isLink = require('./is-link.js');

/**
 * Create symbolic link
 * @function $file~link
 * @param {string} target - Target of the link
 * @param {string} location - Location of the link
 * @param {Object} [options]
 * @param {boolean} [options.force=false] - Force creation of the link even if it already exists
 * @example
 * // Create a symbolic link 'libsample.so' pointing to '/usr/lib/libsample.so.1'
 * $file.link('/usr/lib/libsample.so.1', 'libsample.so');
 */
function link(target, location, options) {
  options = _.sanitize(options, {force: false});
  if (options.force && isLink(location)) {
    fileDelete(location);
  }
  if (!path.isAbsolute(target)) {
    const cwd = process.cwd();
    process.chdir(path.dirname(location));
    try {
      fs.symlinkSync(target, path.basename(location));
    } finally {
      try { process.chdir(cwd); } catch (e) { /* not empty */ }
    }
  } else {
    fs.symlinkSync(target, location);
  }
}

module.exports = link;
