'use strict';

const fs = require('fs-extra');
const path = require('path');
const isDirectory = require('./is-directory.js');
const copy = require('./copy.js');
const exists = require('./exists.js');
const mkdir = require('./mkdir.js');
const fileDelete = require('./delete.js');


/**
 * Rename file or directory
 * @function $file~rename
 * @param {string} source
 * @param {string} destination
 * @example
 * // Rename default configuration file
 * $file.move('conf/php.ini-production', 'conf/php.ini');
 */
/**
 * Alias of {@link $file~rename}
 * @function $file~move
 */
function rename(source, destination) {
  const parent = path.dirname(destination);
  if (exists(destination)) {
    if (isDirectory(destination)) {
      destination = path.join(destination, path.basename(source));
    } else {
      if (isDirectory(source)) {
        throw new Error(`Cannot rename directory ${source} into existing file ${destination}`);
      }
    }
  } else if (!exists(parent)) {
    mkdir(parent);
  }
  try {
    fs.renameSync(source, destination);
  } catch (e) {
    if (e.code !== 'EXDEV') throw e;
    // Fallback for moving across devices
    copy(source, destination);
    fileDelete(source);
  }
}

module.exports = rename;
