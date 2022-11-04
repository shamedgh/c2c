'use strict';

const groupExists = require('./group-exists.js');
const isPlatform = require('../is-platform.js');
const runProgram = require('../run-program.js');
const runningAsRoot = require('../running-as-root.js');
const _isBusyboxBinary = require('../../common.js').isBusyboxBinary;
const _safeLocateBinary = require('../../common.js').safeLocateBinaryCached;

/**
 * Delete system group
 * @function $os~deleteGroup
 * @param {string|number} group - Groupname or group id
 * @example
 * // Delete mysql group
 * $os.deleteGroup('mysql');
 */
function deleteGroup(group) {
  if (!runningAsRoot()) return;
  if (!group) throw new Error('You must provide a group to delete');
  if (!groupExists(group)) {
    return;
  }
  const groupdelBin = _safeLocateBinary('groupdel');
  const delgroupBin = _safeLocateBinary('delgroup');

  if (isPlatform('linux')) {
    if (groupdelBin !== null) { // most modern systems
      runProgram(groupdelBin, [group]);
    } else {
      if (_isBusyboxBinary(delgroupBin)) { // busybox-based systems
        runProgram(delgroupBin, [group]);
      } else {
        throw new Error(`Don't know how to delete group ${group} on this strange linux`);
      }
    }
  } else if (isPlatform('osx')) {
    runProgram('dscl', ['.', '-delete', `/Groups/${group}`]);
  } else if (isPlatform('windows')) {
    throw new Error(`Don't know how to delete group ${group} on Windows`);
  } else {
    throw new Error(`Don't know how to delete group ${group} on the current platformp`);
  }
}

module.exports = deleteGroup;
