'use strict';

const crypto = require('crypto');
const common = require('../common.js');
const delegate = require('../delegation.js');

/** @namespace $crypt */

const _ = require('../lodash-extra.js');

function _getToEncryptData(data) {
  const toEncryptData = {string: null, file: null};
  if (_.isObject(data)) {
    _.extend(toEncryptData, data);
    if (toEncryptData.string === null && toEncryptData.file === null) {
      throw new Error(`You must provide either a file or a string`);
    }
  } else {
    toEncryptData.string = data;
  }
  // We will also accept numbers and booleans as valid stuff to crypt, let the rest invalid values break
  if (toEncryptData.string && _.isFinite(toEncryptData.string) || _.isBoolean(toEncryptData.string)) {
    toEncryptData.string = String(toEncryptData.string);
  }
  return toEncryptData;
}
function _validateAlgorithm(algorithm) {
  if (!_.includes(['sha1', 'md5', 'sha256', 'sha512'], algorithm)) {
    throw new Error(`Unknown algorithm '${algorithm}'`);
  }
}
function _cryptOperation(operator, data, options) {
  data = _getToEncryptData(data);
  options = _.defaults(options || {}, data, {encoding: 'binary'});
  if (options.string) {
    operator.update(options.string, options.encoding);
  } else if (options.file) {
    common.processFileInChunks(options.file, function(buff) {
      operator.update(buff);
    });
  } else {
    throw new Error(`Don't know what to process`);
  }
  return operator.digest('hex');
}
function hash(algorithm, data, options) {
  _validateAlgorithm(algorithm);
  return _cryptOperation(crypto.createHash(algorithm), data, options);
}

function hmac(algorithm, key, data, options) {
  _validateAlgorithm(algorithm);
  return _cryptOperation(crypto.createHmac(algorithm, key), data, options);
}

/**
 * Calculate md5 of a given string or file
 * @function $crypt~md5
 * @param {string|object} toHash - Data to hash. It can be either a string, or an object defining what to hash.
 * @param {string} [object.string] - String to hash
 * @param {string} [object.file] - File to hash
 * @returns {string} - Calculated md5
 * @example
 * // Get hash of a string
 * $crypt.md5('This is a text');
 * // => '0cd0a3afe6daaa52baf1874d56764e79'
 *
 * $crypt.md5({'string': 'This is a text'});
 * // => '0cd0a3afe6daaa52baf1874d56764e79'
 * @example
 * // Get hash of a file
 * $crypt.md5({'file': 'myfile.txt'});
 * // => '0cd0a3afe6daaa52baf1874d56764e79'
 */
function md5(data, options) {
  return hash('md5', data, options);
}
/**
 * Calculate sha1 of a given string or file
 * @function $crypt~sha1
 * @param {string|object} toHash - Data to hash. It can be either a string, or an object defining what to hash.
 * @param {string} [object.string] - String to hash
 * @param {string} [object.file] - File to hash
 * @returns {string} - Calculated sha1
 * @example
 * // Get hash of a string
 * $crypt.sha1('This is a text');
 * // => 'a1a8d5a209038469ba57d5505bfb8e1ff68a8c3b'
 *
 * $crypt.sha1({'string': 'This is a text'});
 * // => 'a1a8d5a209038469ba57d5505bfb8e1ff68a8c3b'
 * @example
 * // Get hash of a file
 * $crypt.sha1({'file': 'myfile.txt'});
 * // => 'a1a8d5a209038469ba57d5505bfb8e1ff68a8c3b'
 */
function sha1(data, options) {
  return hash('sha1', data, options);
}
/**
 * Calculate sha256 of a given string or file
 * @function $crypt~sha256
 * @param {string|object} toHash - Data to hash. It can be either a string, or an object defining what to hash.
 * @param {string} [object.string] - String to hash
 * @param {string} [object.file] - File to hash
 * @returns {string} - Calculated sha256
 * @example
 * // Get hash of a string
 * $crypt.sha256('This is a text');
 * // => '1719b9ed2519f52da363bef16266c80c679be1c3ad3b481722938a8f1a9c589b'
 *
 * $crypt.sha256({'string': 'This is a text'});
 * // => '1719b9ed2519f52da363bef16266c80c679be1c3ad3b481722938a8f1a9c589b'
 * @example
 * // Get hash of a file
 * $crypt.sha256({'file': 'myfile.txt'});
 * // => '1719b9ed2519f52da363bef16266c80c679be1c3ad3b481722938a8f1a9c589b'
 */
function sha256(data, options) {
  return hash('sha256', data, options);
}
/**
 * Calculate sha512 of a given string or file
 * @function $crypt~sha512
 * @param {string|object} toHash - Data to hash. It can be either a string, or an object defining what to hash.
 * @param {string} [object.string] - String to hash
 * @param {string} [object.file] - File to hash
 * @returns {string} - Calculated sha512
 * @example
 * // Get hash of a string
 * $crypt.sha512('This is a text');
 * // => 'eb8af9be43c13df373b0827623c688f98d501417b63465c81c93c6b4141c50aa56530dc87dcb4479ac70f25...2da90f2c9539a6a942'
 *
 * $crypt.sha512({'string': 'This is a text'});
 * // => 'eb8af9be43c13df373b0827623c688f98d501417b63465c81c93c6b4141c50aa56530dc87dcb4479ac70f25...2da90f2c9539a6a942'
 * @example
 * // Get hash of a file
 * $crypt.sh512({'file': 'myfile.txt'});
 * // => 'eb8af9be43c13df373b0827623c688f98d501417b63465c81c93c6b4141c50aa56530dc87dcb4479ac70f24...2da90f2c9539a6a942'
 */
function sha512(data, options) {
  return hash('sha512', data, options);
}

/**
 * Generate pseudo random value
 * @function $crypt~rand
 * @param {object} [options]
 * @param {number} [options.size=32] - Number of bytes to return
 * @param {boolean} [options.ascii=false] - Return ascii values
 * @param {boolean} [options.alphanumeric=false] - Return alphanumeric value
 * @param {boolean} [options.numeric=false] - Return numeric-only value
 * @returns {string} - Random bytes string
 * @example
 * // Generate an alphanumeric 10 chars string
 * $crypt.rand({'size': 10, 'alphanumeric': true});
 * // => 'hT8sePMvVM'
 */
function rand(options) {
  options = _.opts(options, {size: 32, ascii: false, alphanumeric: false, numeric: false});
  const size = options.size;
  let data = '';
  while (data.length < size) {
    // ASCII is in range of 0 to 127
    let randBytes = crypto.pseudoRandomBytes(Math.max(size, 32)).toString();
    /* eslint-disable no-control-regex */
    if (options.ascii) randBytes = randBytes.replace(/[^\s\x00-\x7F]/g, '');
    /* eslint-enable no-control-regex */
    if (options.alphanumeric) randBytes = randBytes.replace(/[^a-zA-Z0-9]/g, '');
    if (options.numeric) randBytes = randBytes.replace(/[^0-9]/g, '');
    data += randBytes;
  }
  data = data.slice(0, size);
  return data;
}

/**
 * Base64 encode and decode
 * @function $crypt~base64
 * @param {string} string  - String to encode or decode
 * @param {string} [operation=encode] - Operation to perform. Allowed values: 'encode', 'decode'
 * @returns {string} - Base64 encoded or decoded value
 * @example
 * // Encode binary text
 * $crypt.base64('hello');
 * // => 'aGVsbG8='
 * @example
 * // Decode base64 encoded text
 * $crypt.base64('aGVsbG8=', 'decode');
 * // => 'hello'
 */
function base64(text, operation) {
  operation = operation || 'encode';
  if (operation === 'decode') {
    return (new Buffer(text, 'base64')).toString();
  } else {
    return (new Buffer(text)).toString('base64');
  }
}

hmac.md5 = function(data, key, options) {
  return this.call(this, 'md5', key, data, options);
};

module.exports = {hmac, md5, sha512, sha256, sha1, rand, base64};

module.exports.contextify = function() {
  const obj = {};
  delegate(obj, _.keys(module.exports), module.exports);
  return obj;
};
