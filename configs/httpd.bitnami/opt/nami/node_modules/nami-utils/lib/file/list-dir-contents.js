'use strict';

const _ = require('../lodash-extra.js');
const getAttrs = require('./get-attrs.js');
const walkDir = require('./walk-dir.js');
const matches = require('./matches.js');
const path = require('path');

function _getFileMetadata(file, extra) {
  const res = getAttrs(file);
  return _.extend(res, extra);
}

/**
 * List content in a directory
 * @private
 * @param {string} prefix - Directory to walk over
 * @param {Object} [options]
 * @param {boolean} [options.stripPrefix=false] - Strip prefix from filename.
 * @param {boolean} [options.includeTopDir=false] - Include top directory in the returned list.
 * @param {boolean} [options.compact=true] - Return only the filename instead of filename and additional information
 * of the file.
 * @param {boolean} [options.getAllAttrs=false] - Add even more information about the file.
 * @param {boolean} [options.include=['*']] - Files to include.
 * @param {boolean} [options.exclude=[]] - Files to exclude.
 * @param {boolean} [options.onlyFiles=false] - Exclude directories.
 * @param {boolean} [options.followSymLinks=false] - Follow symbolic links.
 * @param {boolean} [options.listSymLinks=true] - List symbolic links.
 */
function listDirContents(prefix, options) {
  prefix = path.resolve(prefix);
  options = _.sanitize(options, {stripPrefix: false, includeTopDir: false, compact: true, getAllAttrs: false,
    include: ['*'], exclude: [], onlyFiles: false, rootDir: null, prefix: null, followSymLinks: false,
    listSymLinks: true});
  const results = [];
  // TODO: prefix is an alias to rootDir. Remove it
  const root = options.rootDir || options.prefix || prefix;
  walkDir(prefix, (file, data) => {
    if (!matches(file, options.include, options.exclude)) return;
    if (data.type === 'directory' && options.onlyFiles) return;
    if (data.type === 'link' && !options.listSymLinks) return;
    if (data.topDir && !options.includeTopDir) return;
    const filename = options.stripPrefix ? data.file : file;
    if (options.compact) {
      results.push(filename);
    } else {
      let fileInfo = {file: filename, type: data.type};
      if (options.getAllAttrs) {
        fileInfo = _getFileMetadata(file, fileInfo);
        fileInfo.srcPath = file;
      }
      results.push(fileInfo);
    }
  }, {prefix: root});
  return results;
}

module.exports = listDirContents;
