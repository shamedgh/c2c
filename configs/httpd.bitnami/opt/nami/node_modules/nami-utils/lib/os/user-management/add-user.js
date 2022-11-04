'use strict';

const _ = require('../../lodash-extra.js');

const isPlatform = require('../is-platform.js');
const runProgram = require('../run-program.js');
const runningAsRoot = require('../running-as-root.js');
const userExists = require('./user-exists.js');
const findGroup = require('./find-group.js');
const _getNextOsxGid = require('./common.js').getNextOsxGid;
const _getNextOsxUid = require('./common.js').getNextOsxUid;
const _isBusyboxBinary = require('../../common.js').isBusyboxBinary;
const _safeLocateBinary = require('../../common.js').safeLocateBinaryCached;

const _supportsNoUserGroup = _.memoize(
  () => {
    const helpText = runProgram(_safeLocateBinary('useradd'), ['--help'], {logCommand: false});
    return !helpText.match(/--no-user-group/);
  }
);

function _dsclCreate(user, key, value) {
  const args = ['.', '-create', `/Users/${user}`];
  if (key) args.push(key, value);
  runProgram('dscl', args);
}

function _addUserLinux(user, options) {
  // check if it has useradd -> use it (centos & ubuntu)
  // check if it has adduser and it is linked to /bin/busybox -> use it (busybox)

  const runProgramOpts = {uid: 0, gid: 0, cwd: '/', logCommand: false};
  const args = [];
  const useraddBin = _safeLocateBinary('useradd');
  const adduserBin = _safeLocateBinary('adduser');
  const passwdBin = _safeLocateBinary('passwd');
  const addgroupBin = _safeLocateBinary('addgroup');

  if (useraddBin !== null) { // most modern systems
    if (options.home) args.push('-d', options.home);
    if (options.gid) {
      args.push('-g', options.gid);
    } else {
      if (_supportsNoUserGroup(runProgramOpts)) {
        args.push('--no-user-group');
      }
    }
    if (options.id) args.push('-u', options.uid);
    if (options.systemUser) args.push('-r');
    if (!_.isEmpty(options.groups)) args.push('-G', options.groups.join(','));
    args.push(user);
    runProgram(useraddBin, args, runProgramOpts);
    if (options.password) {
      runProgramOpts.input = `${options.password}\n${options.password}\n`;
      runProgram(passwdBin, [user], runProgramOpts);
    }
  } else {
    if (_isBusyboxBinary(adduserBin)) { // busybox-based systems
      if (options.home) args.push('-h', options.home);
      if (options.gid) args.push('-G', findGroup(options.gid).name);
      if (options.id) args.push('-u', options.uid);
      if (options.systemUser) args.push('-S');
      if (options.password) {
        runProgramOpts.input = `${options.password}\n${options.password}\n`;
      } else {
        args.push('-D');
      }
      args.push(user);
      runProgram(adduserBin, args);
      runProgramOpts.input = '';
      _.each(options.groups, (group) => {
        runProgram(addgroupBin, [user, group], runProgramOpts);
      });
    } else {
      throw new Error(`Don't know how to add user ${user} on this strange linux`);
    }
  }
}

function _addUserOsx(user, options) {
  // TODO: Unify with linux options, missing groups
  const uid = options.id || _getNextOsxUid();
  const gid = options.gid || _getNextOsxGid();

  _dsclCreate(user);
  _dsclCreate(user, 'UserShell', '/bin/bash');
  _dsclCreate(user, 'RealName', user);
  _dsclCreate(user, 'UniqueID', uid);
  _dsclCreate(user, 'PrimaryGroupID', gid);
  if (options.home) _dsclCreate(user, 'NFSHomeDirectory', options.home);
  if (options.password) runProgram('dscl', ['.', '-passwd', `/Users/${user}`, options.password]);
  if (options.systemUser) {
    runProgram('defaults', ['write',
      '/Library/Preferences/com.apple.loginwindow',
      'HiddenUsersList',
      '-array-add',
      user]);
  }
}

/**
 * Add a user to the system
 * @function $os~addUser
 * @param {string} user - Username
 * @param {Object} [options]
 * @param {boolean} [options.systemUser=false] - Set user as system user (UID within 100 and 999)
 * @param {string} [options.home=null] - User home directory
 * @param {string} [options.password=null] - User password
 * @param {string|number} [options.gid=null] - User Main Group ID
 * @param {string|number} [options.uid=null] - User ID
 * @param {string[]} [options.groups=[]] - Extra groups for the user
 * @example
 * // Creates a 'mysql' user and add it to 'mysql' group
 * $os.addUser('mysql', {gid: $os.getGid('mysql')});
 */
function addUser(user, options) {
  if (!runningAsRoot()) return;
  if (!user) throw new Error('You must provide an username');
  options = _.opts(options, {systemUser: false, home: null, password: null, gid: null, uid: null, groups: []});
  if (userExists(user)) {
    return;
  }
  if (isPlatform('linux')) {
    _addUserLinux(user, options);
  } else if (isPlatform('osx')) {
    _addUserOsx(user, options);
  } else if (isPlatform('windows')) {
    throw new Error("Don't know how to add user in Windows");
  } else {
    throw new Error("Don't know how to add user in current platform");
  }
}

module.exports = addUser;
