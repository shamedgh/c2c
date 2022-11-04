'use strict';

const _ = require('../lodash-extra.js');
const path = require('path');
const glob = require('glob');

function _patternExpander(pattern, options) {
  options = _.opts(options, {simpleMatching: false});
  // We convert * to **/**, which match anything in the path (including 'foo.txt'). ** would not match a/b/foo.txt
  return options.simpleMatching ? pattern.replace(/\*(\*?)/g, '**/**') : pattern;
}

/**
 * Glob path
 * @function $file~glob
 * @param {string|string[]} path - Pattern or list of patterns to evaluate
 * @param {Object} [options]
 * @param {string} [options.cwd=null] - Working directory where to invoke the function
 * @param {string} [options.absolutize=false] - Return absolute paths
 * @param {string} [options.matchBase=false] - If enabled and the pattern has no slashes in it, then it will seek for
 * any file anywhere in the tree with a matching basename.
 * @param {string} [options.patternRoot=null] - If provided, relative 'exclude' patterns (not starting with /) will
 * be treaten as relative to this directory.
 * @param {string[]} [options.exclude=[]] - List of patterns to exclude from the results
 * @returns {string[]}
 * @example
 * // List all files of current' folder
 * $file.glob('*');
 * // => ['sample', 'sample2']
 * @example
 * // List all files with the full path
 * $file.glob('*', {absolutize: true});
 * // => ['/foo/bar/sample', /foo/bar/sample2']
 * @example
 * // List all files matching a pattern and excluding other one
 * $file.glob('sample*', {exclude: ['*2']});
 * // => ['sample']
 */
function globFile(filePath, options) {
  options = _.sanitize(options, {
    absolutize: false, cwd: null, patternRoot: null, ignore: [], exclude: [],
    packedFilesMatching: true, globMatch: true, fileList: [],
    simpleMatching: false, matchBase: false
  });

  let files = [];
  if (_.isArray(filePath)) {
    files = filePath;
  } else {
    files = [filePath];
  }
  if (!options.globMatch) return files;

  let result = [];

  // options.ignore is deprecated in favor of options.exclude
  if (!_.isEmpty(options.ignore) && _.isEmpty(options.exclude)) options.exclude = options.ignore;
  const exclude = [];
  _.each(options.exclude, (pattern) => {
    if (options.patternRoot && !path.isAbsolute(pattern)) {
      pattern = path.join(options.patternRoot, pattern);
    }
    exclude.push(_patternExpander(pattern, options));
  });
  // realpath: true resolves symbolic links
  const globOptions = {realpath: false, ignore: exclude, dot: true, matchBase: options.matchBase};
  if (options.cwd !== null) {
    globOptions.cwd = options.cwd;
  }
  _.each(files, (filePattern) => {
    result = _.union(result, glob.sync(_patternExpander(filePattern, options), globOptions));
  });
  if (options.absolutize) {
    result = result.map((f) => {
      return options.cwd ? path.resolve(options.cwd, f) : path.resolve(f);
    });
  }
  return result;
}
module.exports = globFile;
