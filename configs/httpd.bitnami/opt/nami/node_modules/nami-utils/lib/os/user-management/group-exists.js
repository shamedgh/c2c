'use strict';

const _ = require('../../lodash-extra.js');
const findGroup = require('./find-group.js');
const isPlatform = require('../is-platform.js');

/**
 * Check for group existence
 * @function $os~groupExists
 * @param {string|number} group - Groupname or group id
 * @returns {boolean} - Whether the group exists or not
 * @example
 * // Check if group 'mysql' exists
 * $os.groupExists('mysql');
 * // => true
 */
function groupExists(group) {
  if (isPlatform('windows')) {
    throw new Error('Don\'t know how to check for group existence on Windows');
  } else {
    if (_.isEmpty(findGroup(group, {refresh: true, throwIfNotFound: false}))) {
      return false;
    } else {
      return true;
    }
  }
}

module.exports = groupExists;
