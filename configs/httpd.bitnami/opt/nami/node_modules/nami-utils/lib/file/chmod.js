'use strict';

const fs = require('fs-extra');
const _ = require('../lodash-extra.js');
const exists = require('./exists.js');
const isLink = require('./is-link.js');
const isPlatform = require('../os/is-platform.js');
const isDirectory = require('./is-directory.js');
const listDirContents = require('./list-dir-contents.js');

function _chmod(file, permissions) {
  if (isLink(file)) return;
  fs.chmodSync(file, permissions);
}

/**
 * Change file permissions
 * @function $file~chmod
 * @param {string} file - File which permissions will be modified
 * @param {string|Object} permissions - String describing the new permissions or object defining different set of
 * permissions for 'file' and 'directory' types.
 * @param {string} [permissions.file] - File permissions
 * @param {string} [permissions.directory] - Directory permissions
 * @param {Object} [options]
 * @param {boolean} [options.recursive=false] - Change directory permissions recursively
 * @example
 * // Set permissions of '/foo/bar' to '664'
 * $file.chmod('/foo/bar', '664');
 * @example
 * // Recursively change all permissions in plugins directory
 * $file.chmod('plugins', {file: '664', directory: '775'}, {recursive: true});
 */
function chmod(file, permissions, options) {
  if (!isPlatform('unix')) return;
  if (!exists(file)) throw new Error(`Path '${file}' does not exists`);
  const isDir = isDirectory(file);

  options = _.sanitize(options, {recursive: false});
  let filePermissions = null;
  let dirPermissions = null;
  if (_.isReallyObject(permissions)) {
    filePermissions = permissions.file || null;
    dirPermissions = permissions.directory || null;
  } else {
    filePermissions = permissions;
    dirPermissions = permissions;
  }

  if (isDir && options.recursive) {
    _.each(listDirContents(file, {compact: false, includeTopDir: true}), function(data) {
      _chmod(data.file, data.type === 'directory' ? dirPermissions : filePermissions);
    });
  } else {
    _chmod(file, isDir ? dirPermissions : filePermissions);
  }
}

module.exports = chmod;
