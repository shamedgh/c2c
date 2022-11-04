'use strict';

const yaml = require('js-yaml');
const _ = require('../../lodash-extra.js');
const exists = require('../exists.js');
const touch = require('../touch.js');
const read = require('../read.js');
const write = require('../write.js');

function _setValue(data, keyPath, value) {
  let keyList = [];

  if (_.isPlainObject(keyPath)) {
    return _.merge(data, keyPath);
  } else if (_.isUndefined(keyPath) || _.isNull(keyPath) || keyPath === '' || keyPath === '/') {
    keyList.push('');
  } else if (_.isArray(keyPath)) {
    if (_.every(keyPath, (k) => _.isString(k))) {
      keyList = keyPath;
    } else {
      throw new TypeError(`All the components in 'keyPath' should be strings.`);
    }
  // convert '/outerKey/innerKey' -> ['outerKey', 'innerKey']
  } else if (_.isString(keyPath)) {
    keyList = keyPath.replace(/^\//, '').split('/');
  } else {
    throw new TypeError(`Expected 'keyPath' to be a string ('/outerKey/innerKey') or an array of strings \
("['outerKey', 'innerKey']")`);
  }

  if (keyList.length === 1) {
    data[keyList[0]] = value;
    return data;
  } else {
    const parentKey = keyList.shift();
    if (_.isUndefined(data[parentKey])) {
      data[parentKey] = {};
    } else if (!_.isPlainObject(data[parentKey])) {
      throw new Error(`Cannot set key, parent key '${parentKey}' does not contain an object.`);
    }
    // recursive call with an inner level
    data[parentKey] = _setValue(data[parentKey], keyList, value);
    return data;
  }
}

/**
 * Set value in yaml file
 *
 * @function $file~yaml/set
 * @param {string} file - Yaml file to write the value to
 * @param {string} keyPath (it can read nested keys: `'outerKey/innerKey'` or `'/outerKey/innerKey'`. `null`
 * or `'/'` will match all the document). Alternative format: ['outerKey', 'innerKey'].
 * @param {string|Number|boolean|Array|Object} value
 * @param {Object} [options]
 * @param {string} [options.encoding=utf-8] - Encoding used to read the file
 * @param {boolean} [options.retryOnENOENT=true] - Retry if writing files because of the parent directory does not
 * exists
 * @throws Will throw an error if the path is not a file
 */
/**
 * Set value in yaml file
 *
 * @function $file~yaml/set²
 * @param {string} file - Yaml file to write the value to
 * @param {Object} keyMapping - key-value map to set in the file
 * @param {Object} [options]
 * @param {string} [options.encoding=utf-8] - Encoding used to read the file
 * @param {boolean} [options.retryOnENOENT=true] - Retry if writing files because of the parent directory does not
 * exists
 * @throws Will throw an error if the path is not a file
 */
function yamlFileSet(file, keyPath, value, options) {
  if (_.isPlainObject(keyPath)) { // key is keyMapping
    if (!_.isUndefined(options)) {
      throw new Error('Wrong parameters. Cannot specify a keymapping and a value at the same time.');
    }
    if (_.isPlainObject(value)) {
      options = value;
      value = null;
    } else {
      options = {};
    }
  } else if (!_.isString(keyPath) && !_.isArray(keyPath)) {
    throw new Error('Wrong parameter `keyPath`.');
  }
  options = _.sanitize(options, {encoding: 'utf-8', retryOnENOENT: true});
  if (!exists(file)) {
    touch(file);
  }

  let content = yaml.safeLoad(read(file, _.pick(options, 'encoding')));
  if (_.isUndefined(content)) {
    content = {};
  }
  content = _setValue(content, keyPath, value);
  write(file, yaml.safeDump(content), options);
}

module.exports = yamlFileSet;
