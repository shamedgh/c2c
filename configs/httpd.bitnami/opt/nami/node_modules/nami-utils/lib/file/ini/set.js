'use strict';

const ini = require('ini');
const _ = require('../../lodash-extra.js');
const exists = require('../exists.js');
const touch = require('../touch.js');
const isFile = require('../is-file.js');
const read = require('../read.js');
const write = require('../write.js');

/**
 * Set value in ini file
 *
 * @function $file~ini/set
 * @param {string} file - Ini File to write the value to
 * @param {string} section - Section in which to add the key (null if global section)
 * @param {string} key
 * @param {string} value
 * @param {Object} [options]
 * @param {string} [options.encoding=utf-8] - Encoding used to read the file
 * @param {boolean} [options.retryOnENOENT=true] - Retry if writing files because of the parent directory
 * does not exists
 * @throws Will throw an error if the path is not a file
 * @example
 * // Set a single property 'opcache.enable' under the 'opcache' section to 1
 * $file.ini.set('etc/php.ini', 'opcache', 'opcache.enable', 1);
 */
/**
 * Set value in ini file
 *
 * @function $file~ini/set²
 * @param {string} file - Ini File to write the value to
 * @param {string} section - Section in which to add the key (null if global section)
 * @param {Object} keyMapping - key-value map to set in the file
 * @param {Object} [options]
 * @param {string} [options.encoding=utf-8] - Encoding used to read the file
 * @param {boolean} [options.retryOnENOENT=true] - Retry if writing files because of the parent directory
 * does not exists
 * @throws Will throw an error if the path is not a file
 * @example
 * // Set several properties under the 'opcache' section to 1
 * $file.ini.set('etc/php.ini', 'opcache', {'opcache.enable': 1, 'opcache.enable_cli': 1});
 */
function iniFileSet(file, section, key, value, options) {
  options = _.sanitize(options, {encoding: 'utf-8', retryOnENOENT: true});
  if (typeof key === 'object') {
    if (typeof value === 'object') {
      options = value;
    } else {
      options = {};
    }
  }
  if (!exists(file)) {
    touch(file, '', options);
  } else if (!isFile(file)) {
    throw new Error(`File ${file} is not a file`);
  }
  const config = ini.parse(read(file, {encoding: options.encoding}));
  if (!_.isEmpty(section)) {
    config[section] = config[section] || {};
    section = config[section];
  } else {
    section = config;
  }
  if (typeof key === 'string') {
    section[key] = value;
  } else {
    _.merge(section, key);
  }
  write(file, ini.stringify(config), options);
}


module.exports = iniFileSet;
