'use strict';

const _ = require('../../lodash-extra.js');
const findUser = require('./find-user.js');

/**
 * Check for user existence
 * @function $os~userExists
 * @param {string|number} user - Username or user id
 * @returns {boolean} - Whether the user exists or not
 * @example
 * // Check if user 'mysql' exists
 * $os.userExists('mysql');
 * // => true
 */
function userExists(user) {
  if (_.isEmpty(findUser(user, {refresh: true, throwIfNotFound: false}))) {
    return false;
  } else {
    return true;
  }
}

module.exports = userExists;
