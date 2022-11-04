'use strict';

const _ = require('../lodash-extra.js');
const exists = require('./exists.js');
const write = require('./write.js');
const read = require('./read.js');

/**
 * Add text at the beginning of a file
 * @function $file~prepend
 * @param {string} file - File to add text to
 * @param {string} text - Text to add
 * @param {Object} [options]
 * @param {string} [options.encoding=utf-8] - Encoding used to read/write the file
 * @example
 * // Prepend new lines to 'Changelog' file
 * $file.prepend('Changelog', 'Latest Changes:\n * Added new plugins\n');
 */
function prepend(file, text, options) {
  options = _.sanitize(options, {encoding: 'utf-8'});
  const encoding = options.encoding;
  if (!exists(file)) {
    write(file, text, {encoding: encoding});
  } else {
    const currentText = read(file, {encoding: encoding});
    write(file, text + currentText, {encoding: encoding});
  }
}

module.exports = prepend;
