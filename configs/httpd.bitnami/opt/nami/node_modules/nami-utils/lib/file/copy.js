'use strict';

const _ = require('../lodash-extra.js');
const fs = require('fs-extra');
const path = require('path');
const isFile = require('./is-file.js');
const isDirectory = require('./is-directory.js');
const exists = require('./exists.js');
const mkdir = require('./mkdir.js');
const link = require('./link.js');
const chown = require('./chown.js');
const matches = require('./matches.js');
const _matchingFilesArray = require('./common.js').matchingFilesArray;
const globFile = require('./glob.js');

/* eslint-disable no-use-before-define */

function _copy(src, dst, options) {
  options = _.opts(options, {exclude: [], owner: {}});
  if (matches(src, options.exclude)) return;
  const sstat = fs.lstatSync(src);
  let dstat;
  let sstatType = sstat.mode & 61440;
  let sstatMode = sstat.mode & 4095;

  if (exists(dst) && isDirectory(dst, {acceptLinks: false})) {
    dst = path.join(dst, path.basename(src));
  }

  if (exists(dst)) {
    dstat = fs.lstatSync(dst);
    sstatType = sstat.mode & 61440;
    const dstatType = dstat.mode & 61440;
    sstatMode = sstat.mode & 4095;

    if (sstatType !== dstatType) {
      throw new Error(`Types of '${src}' and '${dst}' differ`);
    }
  }
  const parent = path.dirname(dst);
  if (!exists(parent)) {
    mkdir(parent);
  } else if (!isDirectory(parent)) {
    throw new Error(`Cannot copy ${src} to non-directory ${parent}`);
  }
  if (sstat.isDirectory()) {
    _copyDirectory(src, dst, options);
    fs.chmodSync(dst, sstatMode);
  } else if (sstat.isSymbolicLink()) {
    if (dstat) {
      fs.unlinkSync(dst);
    }
    link(fs.readlinkSync(src), dst, {force: true});
  } else {
    // TODO: improve for long files
    fs.copySync(src, dst);
    fs.chmodSync(dst, sstatMode);
    if (!_.isEmpty(options.owner)) {
      chown(dst, options.owner, {abortOnError: false});
    }
  }
}
function _copyDirectory(src, dst, options) {
  options = _.opts(options, {exclude: [], owner: {}});
  const sstat = fs.lstatSync(src);
  const sstatMode = sstat.mode & 4095;

  if (!exists(dst)) {
    mkdir(dst);
    fs.chmodSync(dst, sstatMode);
  } else if (isFile(dst)) {
    throw new Error(`Error copying ${src} to ${dst}: Destination is a file`);
  }
  _.each(globFile(path.join(src, '*')), function(f) {
    _copy(f, dst, options);
  });
}

/* eslint-enable no-use-before-define */

/**
 * Copy file or directory
 * @function $file~copy
 * @param {string|string[]} source - File or array of files to copy. It also supports wildcards
 * @param {string} destination
 * @param {Object} [options]
 * @param {Object} [options.owner={}] - Ownership definition. Object containing the username and group to apply
 * to the copied files
 * @param {string|string[]} [options.exclude=[]] - List of patterns used to exclude files when copying
 * @example
 * // Copy a file
 * $file.copy('/foo/bar/sample', '/foo/bar/sample2');
 * @example
 * // Copy all files in the 'extra' directory excecept the language files
 * $file.copy('conf/extra/*', 'conf', {owner: {username: 'daemon'}, exclude: 'conf/extra/*language*'})
 */
function copy(src, dst, options) {
  options = _.opts(options, {exclude: [], owner: {}});
  const files = _matchingFilesArray(src, options);
  _.each(files, function(f) {
    _copy(f, dst, options);
  });
}

module.exports = copy;
