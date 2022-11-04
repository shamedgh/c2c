'use strict';

const fs = require('fs-extra');
const _ = require('../lodash-extra.js');
const mkdir = require('./mkdir.js');
const path = require('path');
const normalize = require('./normalize.js');

/**
 * Writes text to a file
 * @function $file~write
 * @param {string} file - File to write to
 * @param {string} text - Text to write
 * @param {Object} [options]
 * @param {string} [options.encoding=utf-8] - Encoding used to read the file
 * @param {boolean} [options.retryOnENOENT=true] - Retry if writing files because of the parent directory
 * does not exists
 */
function write(file, text, options) {
  options = _.sanitize(options, {encoding: 'utf-8', retryOnENOENT: true});
  file = normalize(file);
  try {
    fs.writeFileSync(file, text, options);
  } catch (e) {
    if (e.code === 'ENOENT' && options.retryOnENOENT) {
      // If trying to create the parent failed, there is no point on retrying
      try {
        mkdir(path.dirname(file));
      } catch (emkdir) {
        throw e;
      }
      write(file, text, _.opts(options, {retryOnENOENT: false}, {mode: 'overwite'}));
    } else {
      throw e;
    }
  }
}

module.exports = write;
