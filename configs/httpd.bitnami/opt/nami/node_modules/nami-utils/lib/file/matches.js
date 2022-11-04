'use strict';

const _ = require('../lodash-extra.js');
const minimatch = require('minimatch');
const globMatch = require('../common.js').globMatch;

function _ensureArray(element) {
  return _.isArray(element) ? element : [element];
}

/**
 * Check if file path matches a set of patterns
 * @function $file~matches
 * @param {string} file
 * @param {string[]} [patternList] - Patterns that the path must match to be accepted
 * @param {string[]} [excludePatterList] - Patterns that the path must NOT match to be accepted
 * @returns {boolean} - true if the file path matches any of the patternList tags and none of the excludePatterList,
 * false otherwise
 * @example
 * // Check if file 'my.cnf' matches with 'my*' and doesn't match with '*tpl'
 * $file.matches('my.cnf', ['my*'], ['*tpl']);
 * // => true
 */
function matches(file, patternList, excludePatterList, options) {
  options = _.sanitize(options, {minimatch: false});
  let shouldInclude = false;
  let shouldExclude = false;
  const matcher = options.minimatch ? (f, pattern) => minimatch(f, pattern, {dot: true, matchBase: true}) : globMatch;

  if (!_.isEmpty(patternList)) {
    shouldInclude = _.some(_ensureArray(patternList), pattern => matcher(file, pattern));
  }
  if (!_.isEmpty(excludePatterList)) {
    shouldExclude = _.some(_ensureArray(excludePatterList), pattern => matcher(file, pattern));
  }
  return shouldInclude && !shouldExclude;
}

module.exports = matches;
