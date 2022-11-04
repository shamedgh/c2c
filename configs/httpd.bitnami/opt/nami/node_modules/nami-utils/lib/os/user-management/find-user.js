'use strict';

const _ = require('../../lodash-extra.js');
const _findUserOrGroup = require('./common.js').findUserOrGroup;

function _findUser(value, options) {
  options = _.opts(options, {refresh: true, throwIfNotFound: true});
  const user = _findUserOrGroup(value, 'user', options);
  if (_.isEmpty(user) && options.throwIfNotFound) {
    throw new Error(`User '${value}' not found`);
  } else {
    return user || null;
  }
}

/**
 * Lookup system user information
 * @function $os~findUser
 * @param {string|number} user - Username or user id to look for
 * @param {Object} [options]
 * @param {boolean} [options.refresh=true] - Setting this to false allows operating over a cached database of users,
 * for improved performance. It may result in incorrect results if the affected user changes
 * @param {boolean} [options.throwIfNotFound=true] - By default, this function throws an error if the specified user
 * cannot be found
 * @returns {object|null} - Object containing the user id and name: ( { id: 0, name: root } )
 * or null if not found and throwIfNotFound is set to false
 * @example
 * // Get user information of 'mysql'
 * $os.findUser('mysql');
 * // => { name: 'mysql', id: 1001 }
 */
function findUser(user, options) {
  options = _.opts(options, {refresh: true, throwIfNotFound: true});
  if (_.isString(user) && user.match(/^[0-9]+$/)) {
    user = parseInt(user, 10);
  }
  return _findUser(user, options);
}

module.exports = findUser;
