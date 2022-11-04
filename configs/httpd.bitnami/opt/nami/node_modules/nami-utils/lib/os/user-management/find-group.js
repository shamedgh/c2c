'use strict';

const _ = require('../../lodash-extra.js');
const _findUserOrGroup = require('./common.js').findUserOrGroup;

function _findGroup(value, options) {
  options = _.opts(options, {refresh: true, throwIfNotFound: true});
  const group = _findUserOrGroup(value, 'group', options);
  if (_.isEmpty(group) && options.throwIfNotFound) {
    throw new Error(`Group '${value}' not found`);
  } else {
    return group || null;
  }
}

/**
 * Lookup system group information
 * @function $os~findGroup
 * @param {string|number} group - Groupname or group id to look for
 * @param {Object} [options]
 * @param {boolean} [options.refresh=true] - Setting this to false allows operating over a cached database of groups,
 * for improved performance. It may result in incorrect results if the affected group changes
 * @param {boolean} [options.throwIfNotFound=true] - By default, this function throws an error if the specified group
 * cannot be found
 * @returns {object|null} - Object containing the group id and name: ( { id: 0, name: wheel } )
 * or null if not found and throwIfNotFound is set to false
 * @example
 * // Get group information of 'mysql'
 * $os.findGroup('mysql');
 * // => { name: 'mysql', id: 1001 }
 */
function findGroup(group, options) {
  options = _.opts(options, {refresh: true, throwIfNotFound: true});
  if (_.isString(group) && group.match(/^[0-9]+$/)) {
    group = parseInt(group, 10);
  }
  return _findGroup(group, options);
}

module.exports = findGroup;
