'use strict';

const _ = require('../lodash-extra.js');
const fs = require('fs-extra');
const exists = require('./exists.js');
const write = require('./write.js');

/**
 * Add text to file
 * @function $file~append
 * @param {string} file - File to add text to
 * @param {string} text - Text to add
 * @param {Object} [options]
 * @param {string} [options.encoding=utf-8] - Encoding used to read/write the file
 * @param {boolean} [options.atNewLine=false] - Force the added text to start at a new line
 * @example
 * // Append new lines to 'Changelog' file
 * $file.append('Changelog', 'Added new plugins');
 */
function append(file, text, options) {
  options = _.sanitize(options, {atNewLine: false, encoding: 'utf-8'});

  if (!exists(file)) {
    write(file, text, {encoding: options.encoding});
  } else {
    if (options.atNewLine && !text.match(/^\n/) && exists(file)) text = `\n${text}`;
    fs.appendFileSync(file, text, {encoding: options.encoding});
  }
}

module.exports = append;
