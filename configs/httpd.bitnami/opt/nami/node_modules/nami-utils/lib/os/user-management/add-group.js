'use strict';

const _ = require('../../lodash-extra.js');

const isPlatform = require('../is-platform.js');
const runProgram = require('../run-program.js');
const runningAsRoot = require('../running-as-root.js');
const groupExists = require('./group-exists.js');
const _getNextOsxGid = require('./common.js').getNextOsxGid;
const _isBusyboxBinary = require('../../common.js').isBusyboxBinary;
const _safeLocateBinary = require('../../common.js').safeLocateBinaryCached;

function _addGroupLinux(group, options) {
  const args = [group];
  if (!_.isNull(options.gid)) { args.push('-g', options.gid); }
  const groupaddBin = _safeLocateBinary('groupadd');
  const addgroupBin = _safeLocateBinary('addgroup');

  if (groupaddBin !== null) { // most modern systems
    runProgram(groupaddBin, args);
  } else {
    if (_isBusyboxBinary(addgroupBin)) { // busybox-based systems
      runProgram(addgroupBin, args);
    } else {
      throw new Error(`Don't know how to add group ${group} on this strange linux`);
    }
  }
}

function _addGroupOsx(group, options) {
  const gid = options.gid || _getNextOsxGid();
  runProgram('dscl', ['.', '-create', `/Groups/${group}`, 'gid', gid]);
}

/**
 * Add a group to the system
 * @function $os~addGroup
 * @param {string} group - Groupname
 * @param {Object} [options]
 * @param {string|number} [options.gid=null] - Group ID
 * @example
 * // Creates group 'mysql'
 * $os.addGroup('mysql');
 */
function addGroup(group, options) {
  options = _.opts(options, {gid: null});
  if (!runningAsRoot()) return;
  if (!group) throw new Error('You must provide a group');
  if (groupExists(group)) {
    return;
  }

  if (isPlatform('linux')) {
    _addGroupLinux(group, options);
  } else if (isPlatform('osx')) {
    _addGroupOsx(group, options);
  } else if (isPlatform('windows')) {
    throw new Error(`Don't know how to add group ${group} on Windows`);
  } else {
    throw new Error(`Don't know how to add group ${group} in current platform`);
  }
}

module.exports = addGroup;
