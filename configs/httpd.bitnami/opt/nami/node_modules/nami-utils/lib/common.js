'use strict';


const fs = require('fs');
const path = require('path');
const _ = require('./lodash-extra.js');
const isLink = require('./file/is-link.js');
const fileExists = require('./file/exists.js');

const dummyLogger = {};
_.each([
  'info', 'error', 'debug', 'trace', 'trace1',
  'trace2', 'trace3', 'trace4', 'trace5',
  'trace6', 'trace7', 'trace8', 'warn'
], k => dummyLogger[k] = _.noop);

const BUF_LENGTH = 64 * 1024;

/**
 * Get full path to a binary in the provided list of directories
 * @function lookForBinary
 * @private
 * @param {string} binary - Binary to look for
 * @param {string[]} [pathList] - List of directories in which to locate the binary.
 * If it is not provided or is empty, the system PATH will be used
 * @returns {string} - The full path to the binary or null if it is not in the PATH
 * @example
 * // Get the path of the 'node' binary in the System PATH
 * lookForBinary('node');
 * => '/usr/local/bin/node'
 */
function lookForBinary(binary, pathList) {
  let envPath = _.toArrayIfNeeded(pathList);
  if (_.isEmpty(envPath)) {
    envPath = (process.env.PATH || '').split(path.delimiter);
  }
  const foundPath = _.first(_.filter(envPath, (dir) => {
    return fileExists(path.join(dir, binary));
  }));
  return foundPath ? path.join(foundPath, binary) : null;
}

function safeLocateBinary(binary) {
  const wellKnownPATH = [
    '/usr/local/sbin', '/usr/local/bin',
    '/usr/sbin', '/usr/bin', '/sbin', '/bin'
  ];
  const currentPATH = (process.env.PATH || '').split(path.delimiter);
  return lookForBinary(binary, wellKnownPATH.concat(currentPATH));
}
const safeLocateBinaryCached = _.memoize(safeLocateBinary);

function getInheritanceChain(obj) {
  let tocheck = null;
  if (!obj) return [];
  if ((typeof obj) === 'object') {
    tocheck = obj.constructor;
  } else {
    tocheck = Object.getPrototypeOf(obj);
  }
  if (!tocheck || !tocheck.name || _.includes(['Object', 'Function', 'Empty'], tocheck.name)) {
    return [];
  } else {
    return [tocheck.name].concat(getInheritanceChain(tocheck));
  }
}

function processFileInChunks(file, callback, options) {
  options = _.defaults(options || {}, {size: BUF_LENGTH});
  const size = options.size;
  const fd = fs.openSync(file, 'r');
  let bytesRead = 1;
  let pos = 0;
  const _buff = new Buffer(size);
  while (bytesRead > 0) {
    bytesRead = fs.readSync(fd, _buff, 0, size, pos);
    if (bytesRead > 0) {
      callback(_buff.slice(0, bytesRead));
    }
    pos += bytesRead;
  }
  fs.closeSync(fd);
}

function _globToRegExp(string) {
  if (!_.isString(string)) return string;

  const maps = {'*': '.*', '.': '\\.', '?': '.'};
  const escapeCharRe = /[.*+?^${}()|\\]/g;
  function isEscapedChar(chars, position) {
    let result = false;
    while (position > 0) {
      if (chars[position - 1] === '\\') {
        // Depending on if it was already escaped or not, an extra slash unescapes:
        // \[ is escaped, but \\[ is not
        result = !result;
      } else {
        break;
      }
      position--;
    }
    return result;
  }
  const regexpStr = string.split('').map(function(char, position, chars) {
    if (isEscapedChar(chars, position)) {
      // It may be special, but is escaped
      return char;
    } else if (maps[char]) {
      return maps[char];
    } else if (char === '\\' && _.includes(['?', '[', ']', '*'], chars[position + 1])) {
      return char;
    } else {
      return char.replace(escapeCharRe, '\\$&');
    }
  }).join('');

  return new RegExp(`^${regexpStr}$`);
}

function globMatch(string, pattern) {
  return _globToRegExp(pattern).test(string);
}

function isBusyboxBinary(fullPath) {
  if (_.isNull(fullPath)) {
    return false;
  } else {
    return isLink(fullPath) && fs.readlinkSync(fullPath).match(/^.*\/busybox$/);
  }
}

function isBusyboxCommand(command) {
  return isBusyboxBinary(safeLocateBinaryCached(command));
}

module.exports = {
  getInheritanceChain,
  processFileInChunks,
  dummyLogger,
  globMatch,
  isBusyboxCommand,
  isBusyboxBinary,
  lookForBinary,
  safeLocateBinary,
  safeLocateBinaryCached
};
