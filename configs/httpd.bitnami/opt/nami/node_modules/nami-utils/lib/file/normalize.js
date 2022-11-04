'use strict';

const path = require('path');
const os = require('os');

function _expandTilde(f) {
  if (f[0] !== '~' || os.platform === 'win32') return f;
  const home = process.env.HOME;

  if (f.length === 1 || f[1] === '/') {
    return home + f.slice(1);
  } else {
    return f.replace(/^~([^/]+)/, path.join(path.dirname(home), '$1'));
  }
}

/**
 * Resolve path to an absolute path, including resolving the tile (~) character
 * @function $file~normalize
 * @param {string} file - File to normalize
 * @return {string}
 * @example
 * // Resolve '~/../' to an absolute path
 * $file.normalize('~/../');
 * // => '/home'
 */
function normalize(file) {
  file = file.trim();
  return path.resolve(_expandTilde(file));
}

module.exports = normalize;
