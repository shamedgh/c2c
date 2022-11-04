'use strict';

const isFile = require('./is-file.js');
const isLink = require('./is-link.js');

/**
 * Returns true if the given path is a link or a file (is not a directory)
 * @private
 * @param {string} file
 * @returns {boolean}
 */
function isFileOrLink(file) {
  return (isLink(file) || isFile(file, {acceptLinks: false}));
}

module.exports = isFileOrLink;
