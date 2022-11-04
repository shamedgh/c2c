'use strict';

const _ = require('../lodash-extra.js');
const append = require('./append.js');

/**
 * Add new text to a file with a trailing new line.
 * @function $file~puts
 * @param {string} file - File to 'echo' text into
 * @param {string} text - Text to add
 * @param {Object} [options]
 * @param {string} [options.encoding=utf-8] - Encoding used to read/write the file
 * @param {boolean} [options.atNewLine=false] - Force the added text to start at a new line
 * @example
 * // Append new lines to 'Changelog' file
 * $file.puts('Changelog', 'Added new plugins');
 * // Append multiple entries to a 'Changelog' file with extra new line
 * $file.puts('Changelog', 'Added new plugins');
 * $file.puts('Changelog', 'Updated to 5.3.2');
 * $file.puts('Changelog', 'Fixed documentation typo');
 * //  Added new plugins
 * //  Updated to 5.3.2
 * //  Fixed documentation typo
 */
function puts(file, text, options) {
  options = _.sanitize(options, {atNewLine: false, encoding: 'utf-8'});
  append(file, `${text}\n`, options);
}

module.exports = puts;
