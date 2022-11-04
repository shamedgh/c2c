'use strict';

const _ = require('../../lodash-extra.js');
const findUser = require('./find-user.js');

/**
 * Get user name
 * @function $os~getUsername
 * @param {string} uid
 * @param {Object} [options]
 * @param {boolean} [options.refresh=false] - By default, this function operates over a cached database of users,
 * this setting allows refreshing it
 * @param {boolean} [options.throwIfNotFound=true] - By default, this function throws an error if the specified
 * user cannot be found
 * @returns {number} - The user name
 * @example
 * // Get user name of UID 1001
 * $os.getUsername(1001);
 * // => 'mysql'
 */
function getUsername(uid, options) {
  return _.tryOnce(findUser(uid, options), 'name') || null;
}

module.exports = getUsername;
