'use strict';

const fs = require('fs-extra');
const getGroupname = require('../os/user-management/index.js').getGroupname;
const getUsername = require('../os/user-management/index.js').getUsername;

/**
 * Get file owner and group information
 * @function $file~getOwnerAndGroup
 * @param {string} file
 * @returns {object} - Object containing the file ownership attributes: groupname, username, uid, gid
 * @example
 * // Get owner and group information of 'conf/my.cnf'
 * $file.getOwnerAndGroup('conf/my.cnf');
 * // => { uid: 1001, gid: 1001, username: 'mysql', groupname: 'mysql' }
 */
function getOwnerAndGroup(file) {
  const data = fs.lstatSync(file);
  const groupname = getGroupname(data.gid, {throwIfNotFound: false}) || null;
  const username = getUsername(data.uid, {throwIfNotFound: false}) || null;
  return {uid: data.uid, gid: data.gid, username: username, groupname: groupname};
}

module.exports = getOwnerAndGroup;
