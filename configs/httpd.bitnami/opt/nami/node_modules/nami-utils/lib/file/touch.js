'use strict';

const exists = require('./exists.js');
const write = require('./write.js');
const setAttrs = require('./set-attrs.js');

/**
 * Touch file
 * @function $file~touch
 * @param {string} file - File to touch
 * @example
 * // Create a empty file '.initialized'
 * $file.touch('.initialized');
 */
function touch(file) {
  if (!exists(file)) {
    write(file, '');
  }
  const now = new Date();
  setAttrs(file, {atime: now, mtime: now});
}

module.exports = touch;
