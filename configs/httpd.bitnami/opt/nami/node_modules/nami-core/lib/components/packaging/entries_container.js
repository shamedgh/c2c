'use strict';
const _ = require('nami-utils/lodash-extra.js');
const path = require('path');
const nfile = require('nami-utils/file');
const runningAsRoot = require('nami-utils/os').runningAsRoot;

class FileEntry {
  constructor(definition) {
    definition = _.opts(definition, {
      prefix: null, owner: null, group: null,
      mode: null, atime: null, ctime: null, mtime: null,
      type: 'file', file: null, srcPath: null,
      strip: 0
    }, {onlyDefaultKeys: true});

    _.extend(this, definition);
  }
  get isDirectory() {
    return this.type === 'directory';
  }
  get entryName() {
    return this.file;
  }
  get fullPath() {
    return this.srcPath || this.file;
  }
  getAttributes() {
    return _.pick(this, [
      'destination', 'srcPath',
      'mode', 'permissions', 'owner', 'group',
      'atime', 'ctime', 'mtime'
    ]);
  }
  applyAttributes(dest, extraAttrs) {
    extraAttrs.mode = extraAttrs.mode || extraAttrs.permissions;
    const attributes = _.opts(this.getAttributes(), extraAttrs, {overwriteFalsy: true});
    attributes.mode = attributes.permissions || attributes.mode || attributes.permissions;
    nfile.setAttrs(dest, attributes);
    if (runningAsRoot() && (attributes.owner || attributes.group)) {
      nfile.chown(dest, attributes.owner, attributes.group);
    }
    return attributes;
  }
  getDestination(destDir, options) {
    // prefix specifies a prefix to remove from the packed file
    // if prefix == a; a/b/c.txt -> b/c.txt
    options = _.opts(options, {prefix: null});
    const tail = nfile.relativize(this.file, options.prefix);
    // strip allows specifing a number of path elements to strip
    // if strip == 1; a/b/c.txt -> b/c.txt
    const strippedTail = nfile.stripPath(tail, this.strip);
    if (_.isEmpty(strippedTail)) return null;
    return path.join(destDir, strippedTail);
  }
}

class DirectoryPackage {
  /* eslint-disable no-unused-vars */
  constructor(dir, options) {
    options = _.opts(options, {});
    nfile.mkdir(dir);
    this.directory = dir;
    this.manifest = null;
  }
  /* eslint-enable no-unused-vars */
  unpack(patternList, dest, options) {
    return this.unpackEntries(this.getEntries(patternList, options), dest, options);
  }
  unpackEntries(list, dest, options) {
    const unpackInfoList = [];
    _.each(list, fileInfo => {
      const entry = this.newEntry(fileInfo);
      const unpackInfo = this._unpackEntry(entry, dest, options);
      unpackInfoList.push(unpackInfo);
    });
    return unpackInfoList;
  }
  normalize(file) {
    return path.join(this.directory, file);
  }
  exists(file) {
    return nfile.exists(this.normalize(file));
  }
  getMatchingFiles(patternList, options) {
    options = _.opts(options, {include: ['*'], exclude: []}, {onlyDefaultKeys: true});
    const files = [];
    const listDirOpts = _.opts(options, {includeTopDir: true, stripPrefix: true, compact: false, getAllAttrs: true});
    _.each(nfile.glob(patternList), filePath => {
      // We want to use path.dirname(filePath) as the root dir so we get back files relative
      // (and including) the folder being packed
      _.each(nfile.listDir(filePath, _.opts(listDirOpts, {rootDir: path.dirname(filePath)})), fileInfo => {
        if (fileInfo.type === 'unknown') return;
        if (nfile.matches(fileInfo.file, options.include, options.exclude)) {
          files.push(fileInfo);
        }
      });
    });
    return files;
  }
  _unpackEntry(entry, destDir, options) {
    options = _.opts(options, {
      owner: null, group: null,
      prefix: null, desination: null,
      permissions: null, attributes: null
    });
    const attributes = options.attributes || {};
    const dest = entry.getDestination(destDir || options.destination, options);
    if (dest === null) return null;
    if (entry.type === 'directory') {
      nfile.mkdir(dest);
    } else {
      nfile.copy(entry.fullPath, dest);
    }
    if (entry.type !== 'link') {
      entry.applyAttributes(dest, _.opts(options, attributes, {overwriteFalsy: true}));
    }
    return {file: dest, type: entry.type};
  }
  newEntry(data) {
    return new FileEntry(data);
  }
  getEntries(patternList, options) {
    options = _.opts(options, {include: ['*'], exclude: [], strip: 0});
    const entries = _.map(this.getMatchingFiles(patternList, options), fileInfo => {
      _.extend(fileInfo, {strip: options.strip});
      const entry = this.newEntry(fileInfo);
      return entry;
    });
    return entries;
  }
}

module.exports = DirectoryPackage;
