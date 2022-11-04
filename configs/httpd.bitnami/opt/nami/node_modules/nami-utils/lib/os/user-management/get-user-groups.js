'use strict';

const runProgram = require('../run-program.js');
const isBusyboxCommand = require('../../common.js').isBusyboxCommand;

/**
 * Get User Groups
 * @function $os~getUserGroups
 * @param {string|number} user - Username or user id
 * @returns {string[]} - User groups
 * @example
 * // Get group names of user 'mysql'
 * $os.getUserGroups('mysql');
 * // => ['mysql', 'system']
 */
function getUserGroups(user) {
  try {
    const output = runProgram('groups', [user]).trim();
    const groupsText = isBusyboxCommand('groups') ? output : output.split(':')[1].trim();
    return groupsText.split(/\s+/);
  } catch (e) {
    throw new Error(`Cannot resolve user ${user}`);
  }
}

module.exports = getUserGroups;
