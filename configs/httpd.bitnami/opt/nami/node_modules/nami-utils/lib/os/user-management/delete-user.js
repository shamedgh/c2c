'use strict';

const userExists = require('./user-exists.js');
const isPlatform = require('../is-platform.js');
const runProgram = require('../run-program.js');
const runningAsRoot = require('../running-as-root.js');
const _isBusyboxBinary = require('../../common.js').isBusyboxBinary;
const _safeLocateBinary = require('../../common.js').safeLocateBinaryCached;

/**
 * Delete system user
 * @function $os~deleteUser
 * @param {string|number} user - Username or user id
 * @example
 * // Delete mysql user
 * $os.deleteUser('mysql');
 */
function deleteUser(user) {
  if (!runningAsRoot()) return;
  if (!user) throw new Error('You must provide an username');
  if (!userExists(user)) {
    return;
  }
  const userdelBin = _safeLocateBinary('userdel');
  const deluserBin = _safeLocateBinary('deluser');

  if (isPlatform('linux')) {
    if (userdelBin !== null) { // most modern systems
      runProgram(userdelBin, [user]);
    } else {
      if (_isBusyboxBinary(deluserBin)) { // busybox-based systems
        runProgram(deluserBin, [user]);
      } else {
        throw new Error(`Don't know how to delete user ${user} on this strange linux`);
      }
    }
  } else if (isPlatform('osx')) {
    runProgram('dscl', ['.', '-delete', `/Users/${user}`]);
  } else if (isPlatform('windows')) {
    throw new Error('Don\'t know how to delete user in Windows');
  } else {
    throw new Error('Don\'t know how to delete user in current platform');
  }
}

module.exports = deleteUser;
