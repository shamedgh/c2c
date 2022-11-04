'use strict';

const _ = require('../lodash-extra.js');
const read = require('./read.js');


/**
 * Callback for processing file lines
 *
 * @callback lineProcessCallback
 * @param {string} line - The line to process
 * @param {number} index - The current index of the file
 */
/**
 * Callback to execute after processing a file
 *
 * @callback afterFileProcessCallback
 * @param {string} text - Full processed text
 */
/**
 * Iterate over and process the lines of a file
 * @function $file~eachLine
 * @param {string} file
 * @param {lineProcessCallback} [lineProcessCallback] - The callback to run over the line.
 * @param {afterFileProcessCallback} [finallyCallback] - The callback to execute after all the lines
 * have been processed.
 * @param {} [options]
 * @param {boolean} [options.reverse=false] - Iterate over the lines in reverse order
 * @param {string} [options.encoding=utf-8] - Encoding used to read the file
 * @example
 * // Parse each line of a file
 * $file.eachLine('file.txt', function(line) {
 *   console.log(line);
 * }, function() {
 *   console.log('File processed');
 * });
 * // => This is a text
 *       File processed
 */
function eachLine(file, lineProcessFn, finallyFn, options) {
  if (arguments.length === 2) {
    if (_.isFunction(lineProcessFn)) {
      finallyFn = null;
      options = {};
    } else {
      options = lineProcessFn;
      lineProcessFn = null;
    }
  } else if (arguments.length === 3) {
    if (_.isFunction(finallyFn)) {
      options = {};
    } else {
      finallyFn = null;
      options = finallyFn;
    }
  }
  options = _.sanitize(options, {reverse: false, eachLine: null, finally: null, encoding: 'utf-8'});
  finallyFn = finallyFn || options.finally;
  lineProcessFn = lineProcessFn || options.eachLine;

  const data = read(file, _.pick(options, 'encoding'));
  const lines = data.split('\n');
  if (options.reverse) lines.reverse();

  const newLines = [];
  _.each(lines, (line, index) => {
    const res = lineProcessFn(line, index);
    newLines.push(res);
    // Returning false from lineProcessFn will allow us early aborting the loop
    return res;
  });
  if (options.reverse) newLines.reverse();
  if (finallyFn !== null) finallyFn(newLines.join('\n'));
}

module.exports = eachLine;
