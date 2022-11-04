'use strict';

const _ = require('../../lodash-extra.js');
const findGroup = require('./find-group.js');

/**
 * Get group name
 * @function $os~getGroupname
 * @param {string} gid
 * @param {Object} [options]
 * @param {boolean} [options.refresh=false] - By default, this function operates over a cached database of groups,
 * this setting allows refreshing it
 * @param {boolean} [options.throwIfNotFound=true] - By default, this function throws an error if the specified
 * group cannot be found
 * @returns {string} - The group name
 * @example
 * // Get group name of GID 1001
 * $os.getGroupname(1001);
 * // => 'mysql'
 */
function getGroupname(gid, options) {
  return _.tryOnce(findGroup(gid, options), 'name') || null;
}

module.exports = getGroupname;
