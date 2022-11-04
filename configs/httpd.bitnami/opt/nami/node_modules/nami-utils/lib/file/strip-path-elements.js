'use strict';

const path = require('path');
const split = require('./split.js');
const join = require('./join.js');

/**
 * Return the provided path with nelements path elements removed
 * @function $file~stripPath
 * @param {string} path - File path to modify
 * @param {number} nelements - Number of path elements to strip
 * @param {string} [from=start] - Strip from the beginning (start) or end (end)
 * @returns {string} - The stripped path
 * @example
 * // Remove first two elements of a path
 * $file.stripPath('/foo/bar/file', 2);
 * // => 'file'
 * @example
 * // Remove last element of a path
 * $file.stripPath('/foo/bar/file', 1, 'end');
 * // => '/foo/bar'
 */
function stripPathElements(filePath, nelements, from) {
  if (!nelements || nelements <= 0) return filePath;
  from = from || 'start';
  filePath = filePath.replace(/\/+$/, '');
  let splitPath = split(filePath);
  if (from === 'start' && path.isAbsolute(filePath) && splitPath[0] === '/') splitPath = splitPath.slice(1);
  let start = 0;
  let end = splitPath.length;
  if (from === 'start') {
    start = nelements;
    end = splitPath.length;
  } else {
    start = 0;
    end = splitPath.length - nelements;
  }
  return join(splitPath.slice(start, end));
}

module.exports = stripPathElements;
