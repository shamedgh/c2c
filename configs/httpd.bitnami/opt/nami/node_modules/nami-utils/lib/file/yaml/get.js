'use strict';

const yaml = require('js-yaml');
const _ = require('../../lodash-extra.js');
const read = require('../read.js');

// 'builds[0]' -> { element: builds, index: 0 }
// 'builds' -> { element: builds, index: null }
function _parseKey(key) {
  const result = key.match(/^(.+)\[([0-9]+)\]$/);

  if (result) {
    return {element: result[1], index: parseInt(result[2], 10)};
  } else {
    return {element: key, index: null};
  }
}

function _extractValue(data, keyPath) {
  let keyList = [];

  if (_.isUndefined(keyPath) || _.isNull(keyPath) || keyPath === '' || keyPath === '/') {
    keyList.push('');
  } else if (_.isArray(keyPath)) {
    if (_.every(keyPath, (k) => _.isString(k))) {
      keyList = keyPath;
    } else {
      throw new TypeError(`Expected 'keyPath' to be a string ('/outerKey/innerKey') or an array of strings \
("['outerKey', 'innerKey']")`);
    }
  // convert '/outerKey/innerKey' -> ['outerKey', 'innerKey']
  } else if (_.isString(keyPath)) {
    keyList = keyPath.replace(/^\//, '').split('/');
  } else {
    throw new TypeError('Expected `keyPath` to be an array or a string.');
  }

  if (keyList.length === 1) {
    const key = _parseKey(keyList[0]);

    if (_.isNumber(key.index)) {
      return data[key.element][key.index];
    } else {
      return key.element === '' ? data : data[key.element];
    }
  } else {
    const parentKey = keyList.shift();
    if (!_.isString(parentKey)) {
      throw new TypeError(`All the components in the array 'keyPath' should be strings.`);
    }
    const newData = data[parentKey];
    if (newData === undefined) {
      // we support the key to not be found.
      return undefined;
    } else if (!_.isPlainObject(newData)) {
      throw new Error(`Cannot get key '${keyList}', parent key '${parentKey}' does not contain an object.`);
    } else {
      // recursive call with an inner level
      return _extractValue(newData, keyList);
    }
  }
}

/**
 * Get value from .yaml file
 *
 * @function $file~yaml/get
 * @param {string} file - Yaml File to read the value from
 * @param {string} keyPath to read (it can read nested keys: `'outerKey/innerKey'` or `'/outerKey/innerKey'`. `null`
 * or `'/'` will match all the document). Alternative format: ['outerKey', 'innerKey'].
 * @param {Object} [options]
 * @param {string} [options.encoding=utf-8] - Encoding used to read the file
 * @param {string} [options.default=''] - Default value if key not found
 * @returns {string|Number|boolean|Array|Object} Returns the field extracted from the yaml or the default value
 * @throws Will throw an error if the path is not a file
 */
function yamlFileGet(file, keyPath, options) {
  if (_.isPlainObject(keyPath) && arguments.length === 2) {
    options = keyPath;
    keyPath = undefined;
  }
  options = _.sanitize(options, {encoding: 'utf-8', default: ''});
  const content = yaml.safeLoad(read(file, _.pick(options, 'encoding')));
  const value = _extractValue(content, keyPath);
  return _.isUndefined(value) ? options.default : value;
}


module.exports = yamlFileGet;
