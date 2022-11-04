'use strict';

const fs = require('fs-extra');
const _ = require('../lodash-extra.js');

const isFile = require('./is-file.js');
const exists = require('./exists.js');
const chown = require('./chown.js');

/**
 * Create a directory
 * @function $file~mkdir
 * @param {string} dir
 * @param {Object} [options]
 * @param {string} [options.owner=null] - Owner of the created folder (only if running as root)
 * @param {string} [options.group=null] - Group of the created folder (only if running as root)
 * @throws Will throw an error if the path exists and is a file
 * @example
 * // Create '/foo/bar' directory
 * $file.mkdir('/foo/bar');
 * @example
 * // Create tmp folder and owned by user and group 'mysql'
 * $file.mkdir('tmp', {owner: 'mysql', group: 'mysql'});
 */
function mkdir(dir, options) {
  options = _.sanitize(options, {owner: null, username: null, group: null});
  if (!exists(dir)) {
    fs.mkdirpSync(dir);
  } else {
    if (isFile(dir)) {
      throw new Error(`Path '${dir}' already exists and is a file`);
    }
  }
  // TODO: Clean this mess...
  if (options.owner || options.group || options.username) {
    let uid = null;
    let gid = null;
    if (_.isString(options.owner)) {
      uid = options.owner;
    } else if (_.isObject(options.owner)) {
      uid = (options.owner.uid || options.owner.owner || options.owner.user || options.owner.username);
      gid = (options.owner.gid || options.owner.group);
    }
    if (_.isString(options.username)) {
      uid = options.username;
    }
    if (_.isString(options.group)) {
      gid = options.group;
    }
    chown(dir, uid, gid, {abortOnError: false});
  }
}

module.exports = mkdir;
