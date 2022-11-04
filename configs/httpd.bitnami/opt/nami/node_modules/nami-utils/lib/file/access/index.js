'use strict';

const fs = require('fs-extra');
const path = require('path');
const _ = require('../../lodash-extra.js');
const exists = require('../exists.js');
const getOwnerAndGroup = require('../get-owner-and-group.js');
const getUserGroups = require('../../os/user-management/index.js').getUserGroups;
const findUser = require('../../os/user-management/index.js').findUser;

function _accesibleByUser(userData, file, access) {
  const accessMasks = {user: access << 6, group: access << 3, others: access};
  const mode = fs.lstatSync(file).mode;
  const ownership = getOwnerAndGroup(file);
  if (ownership.uid === userData.id) {
    // If the user owns the file, and has not user write permissions, it does not matter
    // what others or group permissions says
    return !!(mode & accessMasks.user);
  }
  const userGroups = getUserGroups(userData.name);
  if (_.includes(userGroups, ownership.groupname) && mode & accessMasks.group) {
    return true;
  }
  return !!(mode & accessMasks.others);
}

/**
 * Check whether a file is readable or not
 * @function $file~readable
 * @param {string} file
 * @returns {boolean}
 * @example
 * // Check if /bin/ls is readable by the current user
 * $file.readable('/bin/ls')
 * // => true
 */
function readable(file) {
  if (!exists(file)) {
    return false;
  } else {
    try {
      fs.accessSync(file, fs.R_OK);
    } catch (e) {
      return false;
    }
    return true;
  }
}
/**
 * Check whether a file is readable or not by a given user
 * @function $file~readableBy
 * @param {string} file
 * @param {string|number} user - Username or user id to check permissions for
 * @returns {boolean}
 * @example
 * // Check if 'conf/my.cnf' is readable by the 'nobody' user
 * $file.readableBy('conf/my.cnf', 'nobody');
 * // => false
 */
function readableBy(file, user) {
  if (!exists(file)) {
    return readableBy(path.dirname(file), user);
  }
  const userData = findUser(user);
  if (userData.id === 0) {
    return true;
  } else if (userData.id === process.getuid()) {
    return readable(file);
  } else {
    return _accesibleByUser(userData, file, fs.R_OK);
  }
}

/**
 * Check whether a file is writable or not
 * @function $file~writable
 * @param {string} file
 * @returns {boolean}
 * @example
 * // Check if 'conf/my.cnf' is writable by the current user
 * $file.writable('conf/my.cnf');
 * // => true
 */
function writable(file) {
  if (!exists(file)) {
    return writable(path.dirname(file));
  } else {
    try {
      fs.accessSync(file, fs.W_OK);
    } catch (e) {
      return false;
    }
    return true;
  }
}

/**
 * Check whether a file is writable or not by a given user
 * @function $file~writableBy
 * @param {string} file
 * @param {string|number} user - Username or user id to check permissions for
 * @returns {boolean}
 * @example
 * // Check if 'conf/my.cnf' is writable by the 'nobody' user
 * $file.writableBy('conf/my.cnf', 'nobody');
 * // => false
 */
function writableBy(file, user) {
  function _writableBy(f, userData) {
    if (!exists(f)) {
      return _writableBy(path.dirname(f), userData);
    } else {
      return _accesibleByUser(userData, f, fs.W_OK);
    }
  }
  const uData = findUser(user);
  // root can always write
  if (uData.id === 0) {
    return true;
  } else if (uData.id === process.getuid()) {
    return writable(file);
  } else {
    return _writableBy(file, uData);
  }
}

/**
 * Check whether a file is executable or not
 * @function $file~executable
 * @param {string} file
 * @returns {boolean}
 * @example
 * // Check if '/bin/ls' is executable by the current user
 * $file.executable('/bin/ls');
 * // => true
 */
function executable(file) {
  try {
    fs.accessSync(file, fs.X_OK);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check whether a file is executable or not by a given user
 * @function $file~executable
 * @param {string} file
 * @param {string|number} user - Username or user id to check permissions for
 * @returns {boolean}
 * @example
 * // Check if '/bin/ls' is executable by the 'nobody' user
 * $file.executable('/bin/ls', 'nobody');
 * // => true
 */
function executableBy(file, user) {
  if (!exists(file)) {
    return false;
  }
  const userData = findUser(user);
  if (userData.id === 0) {
    // Root can do anything but execute a file with no exec permissions
    const mode = fs.lstatSync(file).mode;
    return !!(mode & parseInt('00111', 8));
  } else if (userData.id === process.getuid()) {
    return executable(file);
  } else {
    return _accesibleByUser(userData, file, fs.X_OK);
  }
}

function _accesibleByOthers(file, access) {
  if (!exists(file)) {
    return _accesibleByOthers(path.dirname(file), access);
  }
  const mode = fs.lstatSync(file).mode;
  return !!(mode & access);
}

/**
 * Check whether a file is readable or not by 'others' users
 * @function $file~readableByOthers
 * @param {string} file
 * @returns {boolean}
 * @example
 * // Check if the file 'conf/my.cnf' is readable by 'others'
 * $file.readableByOthers('conf/my.cnf');
 * // => false
 */
function readableByOthers(file) {
  return _accesibleByOthers(file, fs.R_OK);
}

/**
 * Check whether a file is writable or not by 'others' users
 * @function $file~writableByOthers
 * @param {string} file
 * @returns {boolean}
 * @example
 * // Check if the file 'conf/my.cnf' is writable by 'others'
 * $file.writableByOthers('conf/my.cnf');
 * // => false
 */
function writableByOthers(file) {
  return _accesibleByOthers(file, fs.W_OK);
}

/**
 * Check whether a file is executable or not by 'others' users
 * @function $file~executableByOthers
 * @param {string} file
 * @returns {boolean}
 * @example
 * // Check if the file '/bin/ls' is executable by 'others'
 * $file.executableByOthers('/bin/ls');
 * // => true
 */
function executableByOthers(file) {
  if (!exists(file)) { return false; }
  return _accesibleByOthers(file, fs.X_OK);
}

module.exports = {
  readable,
  readableBy,
  readableByOthers,
  writable,
  writableBy,
  writableByOthers,
  executable,
  executableBy,
  executableByOthers
};
