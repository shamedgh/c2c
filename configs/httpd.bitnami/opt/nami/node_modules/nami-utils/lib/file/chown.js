'use strict';

const fs = require('fs-extra');
const _ = require('../lodash-extra.js');
const nodeFs = require('fs');

const exists = require('./exists.js');
const isPlatform = require('../os/is-platform.js');
const isDirectory = require('./is-directory.js');
const _fileStats = require('./common.js').fileStats;
const getUid = require('../os/user-management/index.js').getUid;
const getGid = require('../os/user-management/index.js').getGid;
const listDirContents = require('./list-dir-contents.js');

// this is a strict function signature version of _chown, it also do not worry
// about recursivity
function _chown(file, uid, gid, options) {
  options = _.opts(options, {abortOnError: true});
  uid = parseInt(uid, 10);
  uid = _.isFinite(uid) ? uid : getUid(_fileStats(file).uid, {refresh: false});
  gid = parseInt(gid, 10);
  gid = _.isFinite(gid) ? gid : getGid(_fileStats(file).gid, {refresh: false});
  try {
    if (options.abortOnError) {
      nodeFs.chownSync(file, uid, gid);
    } else {
      fs.chownSync(file, uid, gid);
    }
  } catch (e) {
    if (options.abortOnError) {
      throw e;
    }
  }
}

/**
 * Change file owner
 * @function $file~chown
 * @param {string} file - File which owner and grop will be modified
 * @param {string|number} uid - Username or uid number to set. Can be provided as null
 * @param {string|number} gid - Group or gid number to set. Can be provided as null
 * @param {Object} [options]
 * @param {boolean} [options.abortOnError=true] - Throw an error if the function fails to execute
 * @param {boolean} [options.recursive=false] - Change directory owner recursively
 * @example
 * // Set the owner of 'conf/my.cnf' to 'mysql'
 * $file.chown('conf/my.cnf', 'mysql');
 * @example
 * // Change 'plugins' directory owner user and group recursively
 * $file.chown('plugins', 'daemon', 'daemon', {recursive: true});
 */
function chown(file, uid, gid, options) {
  if (!isPlatform('unix')) return;

  if (_.isObject(uid)) {
    options = gid;
    const ownerInfo = uid;
    uid = (ownerInfo.uid || ownerInfo.owner || ownerInfo.user || ownerInfo.username);
    gid = (ownerInfo.gid || ownerInfo.group);
  }
  options = _.sanitize(options, {abortOnError: true, recursive: false});
  let recurse = false;
  try {
    if (uid) uid = getUid(uid, {refresh: false});
    if (gid) gid = getGid(gid, {refresh: false});
    if (!exists(file)) throw new Error(`Path '${file}' does not exists`);
    recurse = options.recursive && isDirectory(file);
  } catch (e) {
    if (options.abortOnError) {
      throw e;
    } else {
      return;
    }
  }
  if (recurse) {
    _.each(listDirContents(file, {includeTopDir: true}), function(f) {
      _chown(f, uid, gid, options);
    });
  } else {
    _chown(file, uid, gid, options);
  }
}

module.exports = chown;
