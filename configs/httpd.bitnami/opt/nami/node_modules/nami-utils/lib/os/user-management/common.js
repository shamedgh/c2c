'use strict';

const _ = require('../../lodash-extra.js');
const runProgram = require('../run-program.js');
const readFile = require('../../file/read.js');
const fileExists = require('../../file/exists.js');
const isPlatform = require('../is-platform.js');
const usersAndGroupsCache = {users: [], groups: []};

/* ISTANBUL_IGNORE_IF_NOT_OSX */
function _getMaxOsxID(text) {
  let max = 0;
  _.each(text.split('\n'), line => {
    line = line.trim();
    if (line === '') return;
    const id = parseInt(line.replace(/.*\s+(-?\d+)\s*$/, '$1'), 10);
    if (_.isFinite(id) && id > max) {
      max = id;
    }
  });
  return max + 1;
}

/* ISTANBUL_IGNORE_IF_NOT_OSX */
function getNextOsxGid() {
  const text = runProgram('dscl', ['.', '-list', '/Groups', 'PrimaryGroupID']);
  return _getMaxOsxID(text);
}

/* ISTANBUL_IGNORE_IF_NOT_OSX */
function getNextOsxUid() {
  const text = runProgram('dscl', ['.', '-list', '/Users', 'UniqueID']);
  return _getMaxOsxID(text);
}

function _parseIdentityFile(type) {
  const res = [];
  let file = null;
  switch (type) {
    case 'users':
      file = '/etc/passwd';
      break;
    case 'groups':
      file = '/etc/group';
      break;
    default:
      throw new Error(`Unknown file type ${type} to parse`);
  }
  if (fileExists(file)) {
    const lines = readFile(file).toString().split('\n') || [];
    lines.forEach((line) => {
      line = line.trim();
      if (_.isEmpty(line) || line.match(/^\s*#.*/)) return;
      line = line.split(':');
      res.push({name: line[0].toString(), id: parseInt(line[2], 10)});
    });
  }
  return res;
}

function _getentIdGet(kind, value) {
  let entry = null;

  try {
    entry = runProgram('getent', [kind, value]).trim().split(':');
  } catch (e) { /* empty */ }

  if (_.isEmpty(entry)) {
    return null;
  } else {
    return {name: entry[0], id: parseInt(entry[2], 10)};
  }
}

function findUserOrGroup(id, kind, options) {
  options = _.opts(options, {refresh: true, throwIfNotFound: false});
  const cacheId = kind === 'user' ? 'users' : 'groups';
  let cachedData = usersAndGroupsCache[cacheId];
  if (options.refresh || _.isEmpty(cachedData)) {
    cachedData = _parseIdentityFile(cacheId);
    usersAndGroupsCache[cacheId] = cachedData;
  }
  let entry = _.filter(cachedData, e => {
    return _.isFinite(id) ? e.id === id : e.name === id;
  })[0];
  if (_.isEmpty(entry)) {
    try {
      if (isPlatform('osx')) {
        // We only have a good alternative for users when running on OS X
        if (kind === 'user') {
          const res = runProgram('id', [id]).trim();
          const match = res.match(/^uid=(\d+)\(([^)]+)\)\s/);
          if (match) {
            entry = {name: match[2], id: parseInt(match[1], 10)};
          }
        }
      } else {
        entry = _getentIdGet(kind === 'user' ? 'passwd' : 'group', id);
      }
    } catch (e) { /* empty */ }
    if (!_.isEmpty(entry)) {
      cachedData.push(entry);
    }
  }
  return entry || null;
}


module.exports = {getNextOsxGid, getNextOsxUid, findUserOrGroup};
