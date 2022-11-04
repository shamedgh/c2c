'use strict';

const isPlatform = require('./is-platform.js');

/**
 * Check if the current platform is UNIX
 * @function $os~isUnix
 * @returns {boolean}
 * @example
 * // Check if the current platform is UNIX
 * $os.isPlatform('unix');
 * // => true
 */
function isUnix() {
  return isPlatform('unix');
}

module.exports = isUnix;
