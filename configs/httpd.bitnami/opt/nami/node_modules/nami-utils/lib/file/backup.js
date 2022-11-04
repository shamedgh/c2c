'use strict';

const copy = require('./copy.js');
const _ = require('../lodash-extra.js');

/**
 * Backup a file or directory
 * @function $file~backup
 * @param {string} source
 * @param {Object} [options]
 * @param {Object} [options.destination] - Destination path to use when copying. By default, the backup will
 * be placed in the same directory, adding a timestamp
 * @returns {string} - The final destination
 * @example
 * // Backup a file (it will automatically append a timestamp to it: 'conf/my.cnf_1453811340')
 * $file.backup('conf/my.cnf'});
 * @example
 * // Backup a file with a specific name and location 'conf/my.cnf.default'
 * $file.backup('conf/my.cnf', {destination: 'conf/my.cnf.default'});
 */
function backup(source, options) {
  options = _.sanitize(options, {destination: null});
  let dest = options.destination;
  if (dest === null) {
    dest = `${source.replace(/\/*$/, '')}_${Date.now()}`;
  }
  copy(source, dest);
  return dest;
}

module.exports = backup;
