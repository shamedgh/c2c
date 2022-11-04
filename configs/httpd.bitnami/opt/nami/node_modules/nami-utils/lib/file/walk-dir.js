'use strict';

const fs = require('fs-extra');
const path = require('path');
const _ = require('../lodash-extra.js');
const isDirectory = require('./is-directory.js');
const fileType = require('./common.js').fileType;
const stripPathPrefix = require('./strip-path-prefix.js');

/**
 * Navigate through directory contents
 * @private
 * @param {string} file - Directory to walk over
 * @param {function} callback - Callback to execute for each file.
 * @param {Object} [options]
 * @param {boolean} [options.followSymLinks=false] - Follow symbolic links.
 * @param {boolean} [options.maxDepth=Infinity] - Maximum directory depth to keep iterating
 */
function walkDir(file, callback, options) {
  file = path.resolve(file);
  if (!_.isFunction(callback)) throw new Error('You must provide a callback function');
  options = _.opts(options, {followSymLinks: false, maxDepth: Infinity});
  const prefix = options.prefix || file;

  function _walkDir(f, depth) {
    const type = fileType(f);
    const relativePath = stripPathPrefix(f, prefix);
    const metaData = {type: type, file: relativePath};
    if (file === f) metaData.topDir = true;

    const result = callback(f, metaData);
    if (result === false) return false;
    if (type === 'directory' || (type === 'link' && options.followSymLinks && isDirectory(f, options.followSymLinks))) {
      let shouldContinue = true;
      if (depth >= options.maxDepth) {
        return;
      }
      _.each(fs.readdirSync(f), (elem) => {
        shouldContinue = _walkDir(path.join(f, elem), depth + 1);
        return shouldContinue;
      });
    }
  }
  _walkDir(file, 0);
}

module.exports = walkDir;
