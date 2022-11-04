'use strict';

const fs = require('fs-extra');
const _ = require('../lodash-extra.js');
const isFile = require('./is-file.js');
const exists = require('./exists.js');
const size = require('./size.js');
const normalize = require('./normalize.js');

// Is impossible (or at least a huge pain ) to have all functions use each other without having them use
// not yet defined functions

/* eslint-disable no-use-before-define */

/**
 * Return the contents of a file
 * @function $file~read
 * @param {string} file - File to read
 * @param {Object} [options]
 * @param {string} [options.encoding=utf-8] - Encoding used to read the file
 * @returns {string} Contents of the file
 * @throws Will throw an error if the path is not a file or does not exists
 * @example
 * // Read error log
 * $file.read('logs/error_log');
 * // => [Wed Oct 28 15:15:31.576189 2015] [ssl:warn] [pid 24582] AH01909: localhost:443:0 ...
 *       [Wed Oct 28 15:15:31.628165 2015] [ssl:warn] [pid 24583] AH01909: localhost:443:0 ...
 *       ...
 */
function read(file, options) {
  options = _.sanitize(options, {encoding: 'utf-8'});
  file = normalize(file);
  if (!exists(file)) {
    throw new Error(`File '${file}' does not exists`);
  } else if (!isFile(file)) {
    throw new Error(`File '${file}' is not a file`);
  }
  if (size(file) >= Math.pow(2, 28)) {
    throw new Error(`File '${file}' is too big to be read into memory`);
  } else {
    return fs.readFileSync(file, options);
  }
}

module.exports = read;
