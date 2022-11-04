'use strict';

const _ = require('../lodash-extra.js');
const path = require('path');
const split = require('./split.js');

/**
 * Sanitize path
 * @function $file~sanitize
 * @param {string} file - File path to sanitize
 * @param {Object} [options]
 * @param {boolean} [options.noupdir=false] - Do not allow traversing up by using ..
 * @param {boolean} [options.tounix=true] - Convert path separator to unix forward slashes
 * @param {boolean} [options.mustBeRelative=false] - Force the returned path to be relative
 * @returns {string} - The sanitized path
 * @example
 * // Sanitize 'foo/../bar/.//file'
 * $file.sanitize('foo/../bar/.//file');
 * // => 'bar/file'
 */
function sanitize(file, options) {
  options = _.sanitize(options, {noupdir: false, tounix: true, mustBeRelative: false});
  if (!file) return '';
  if (options.tounix) file = file.replace(/\\+/, '/');

  file = file.toString().trim();
  const newFileComponents = [];
  if (options.mustBeRelative) {
    if (path.isAbsolute(file)) {
      file = path.join('.', file);
    } else if (file[0] === '~') {
      file = file.replace(/^~\/*/, '');
    }
  }

  _.each(split(file), (component) => {
    if (component === '..' && options.noupdir) return;
    // Double slash
    if (component === '') return;
    if (component !== '/' && component.match(/^[\\/*?"<>|]$/)) return;
    newFileComponents.push(component);
  });
  const separator = options.tounix ? '/' : path.sep;
  return path.normalize(newFileComponents.join(separator));
}


module.exports = sanitize;
