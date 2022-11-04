'use strict';

const exists = require('./exists.js');
const read = require('./read.js');
const _ = require('../lodash-extra.js');
const _escapeRegExp = require('./common.js').escapeRegExp;

/**
 * Check if file contents contains a given pattern
 * @function $file~contains
 * @param {string} file - File path to check its contents
 * @param {string|RegExp} pattern - Glob like pattern or regexp to match
 * @param {Object} [options]
 * @param {string} [options.encoding=utf-8] - Encoding used to read the file
 * @returns {boolean} - Whether the contents of the file match or not the pattern
 * @example
 * // Check if service has started successfully
 * $file.contains('logs/service.log', /.*service.*started\s*successfully/);
 * // => true
 */
function contains(file, pattern, options) {
  options = _.sanitize(options, {encoding: 'utf-8'});
  if (!exists(file)) return false;
  const text = read(file, options);
  if (_.isRegExp(pattern)) {
    return !!text.match(pattern);
  } else {
    return (text.search(_escapeRegExp(pattern)) !== -1);
  }
}

module.exports = contains;
