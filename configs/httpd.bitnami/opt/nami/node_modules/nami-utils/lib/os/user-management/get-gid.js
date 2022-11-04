'use strict';

const _ = require('../../lodash-extra.js');
const findGroup = require('./find-group.js');

/**
 * Get group GID
 * @function $os~getGid
 * @param {string} groupname
 * @param {Object} [options]
 * @param {boolean} [options.refresh=true] - Setting this to false allows operating over a cached database of groups,
 * for improved performance. It may result in incorrect results if the affected group changes
 * @param {boolean} [options.throwIfNotFound=true] - By default, this function throws an error if the specified group
 * cannot be found
 * @returns {number|null} - The group ID or null, if it cannot be found
 * @example
 * // Get GID of 'mysql' group
 * $os.getGid('mysql');
 * // => 1001
 */
function getGid(groupname, options) {
  const gid = _.tryOnce(findGroup(groupname, options), 'id');
  return _.isUndefined(gid) ? null : gid;
}


module.exports = getGid;
