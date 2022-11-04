'use strict';

const fs = require('fs-extra');
const _ = require('../lodash-extra.js');
const exists = require('./exists.js');
const globFile = require('./glob.js');

function fileStats(file, options) {
  options = _.opts(options, {acceptLinks: true});
  return (options.acceptLinks ? fs.statSync(file) : fs.lstatSync(file));
}

function fileType(file) {
  let type = 'unknown';
  try {
    const stats = fs.lstatSync(file);
    switch (true) {
      case stats.isSymbolicLink():
        type = 'link';
        break;
      case stats.isDirectory():
        type = 'directory';
        break;
      case stats.isFile():
        type = 'file';
        break;
      default:
        type = 'unknown';
    }
  } catch (e) {
    type = 'unknown';
  }
  return type;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchingFilesArray(src, options) {
  options = _.opts(options, {exclude: []});
  let files;
  // We implemented this because it was not possible to copy files with literal regexp-like chars.
  // We should make all this configurable
  if (_.isNotEmpty(options.exclude)
      || _.isArray(src)
      || (_.isString(src) && !exists(src))) {
    files = globFile(src, {exclude: options.exclude});
  } else {
    files = [src];
  }
  return files;
}

module.exports = {fileStats, fileType, escapeRegExp, matchingFilesArray};
