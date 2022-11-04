'use strict';

const ini = require('ini');
const _ = require('../../lodash-extra.js');
const exists = require('../exists.js');
const isFile = require('../is-file.js');
const read = require('../read.js');

/**
 * Get value from ini file
 *
 * @function $file~ini/get
 * @param {string} file - Ini File to read the value from
 * @param {string} section - Section from which to read the key (null if global section)
 * @param {string} key
 * @param {Object} [options]
 * @param {string} [options.encoding=utf-8] - Encoding used to read the file
 * @param {string} [options.default=''] - Default value if key not found
 * @return {string}
 * @throws Will throw an error if the path is not a file
 * @example
 * // Get 'opcache.enable' property under the 'opcache' section
 * $file.ini.get('etc/php.ini', 'opcache', 'opcache.enable');
 * // => '1'
 */
function iniFileGet(file, section, key, options) {
  options = _.sanitize(options, {encoding: 'utf-8', default: ''});
  if (!exists(file)) {
    return '';
  } else if (!isFile(file)) {
    throw new Error(`File '${file}' is not a file`);
  }
  const config = ini.parse(read(file, _.pick(options, 'encoding')));
  let value;
  if (section in config) {
    value = config[section][key];
  } else if (_.isEmpty(section)) {
    // global section
    value = config[key];
  }
  return _.isUndefined(value) ? options.default : value;
}

module.exports = iniFileGet;
