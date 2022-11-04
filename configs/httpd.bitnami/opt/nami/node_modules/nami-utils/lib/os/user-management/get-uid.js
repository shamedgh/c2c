'use strict';

const _ = require('../../lodash-extra.js');
const findUser = require('./find-user.js');

/**
 * Get user UID
 * @function $os~getUid
 * @param {string} username
 * @param {Object} [options]
 * @param {boolean} [options.refresh=true] - Setting this to false allows operating over a cached database of users,
 * for improved performance. It may result in incorrect results if the affected user changes
 * @param {boolean} [options.throwIfNotFound=true] - By default, this function throws
 * an error if the specified user cannot be found
 * @returns {number|null} - The user ID or null, if it cannot be found
 * @example
 * // Get UID of user 'mysql'
 * $os.getUid('mysql');
 * // => 1001
 */
function getUid(username, options) {
  const uid = _.tryOnce(findUser(username, options), 'id');
  return _.isUndefined(uid) ? null : uid;
}

module.exports = getUid;
