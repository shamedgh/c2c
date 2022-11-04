'use strict';
const _ = require('lodash');
const tmp = require('tmp');
const fs = require('fs-extra');
const path = require('path');

const cleaupList = [];

process.on('exit', function() {
  _.each(cleaupList, function(sb) {
    try {
      sb.cleanup();
    } catch (e) {
      // Emppty
    }
  });
});

// TODO: We should add some basic testing to make sure we can trust the sandbox
class Sandbox {
  constructor(dir, options) {
    options = _.defaults(options || {}, {autoCleanup: true});
    if (options.autoCleanup) {
      cleaupList.push(this);
    }
    this.setupRoot(dir);
  }
  isSandboxed(f) {
    if (!path.isAbsolute(f)) { return false; }
    const normalizedFile = path.normalize(f);
    return normalizedFile === this.root ||
      _.startsWith(normalizedFile, `${this.root}/`);
  }
  setupRoot(dir) {
    this.root = dir || tmp.tmpNameSync();
    fs.mkdirpSync(this.root);
    this._files = [];
    this._dirs = [];
  }
  _fileExists(f) {
    try {
      fs.lstatSync(f);
      return true;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      return false;
    }
  }
  cleanup() {
    const _this = this;
    if (!this._fileExists(this.root)) return;
    _.each(fs.readdirSync(this.root), function(f) {
      f = _this.normalize(f);
      if (!_this.isSandboxed(f)) {
        throw new Error(`File resolved to an unsandboxed path!: ${f} (root = ${_this.root})`);
      }
      fs.removeSync(f);
    });
    if (fs.readdirSync(this.root).length === 0) {
      fs.removeSync(this.root);
    }
  }
  mkdir(dir) {
    dir = this.normalize(dir);
    fs.mkdirpSync(dir);
    return dir;
  }
  read(f, options) {
    options = _.defaults(options || {}, {encoding: 'binary'});
    f = this.normalize(f);
    return fs.readFileSync(f, options);
  }
  write(f, text, options) {
    f = this.normalize(f);
    fs.mkdirpSync(path.dirname(f));
    fs.writeFileSync(f, text, options);
    return f;
  }
  normalize(f) {
    return this.isSandboxed(f) ? f : path.join(this.root, f.replace(/^\/+/, ''));
  }
  createFilesFromManifest(manifest, prefix) {
    let paths = [];
    prefix = prefix || '';
    const _this = this;

    // Manifest structure can use the shortcut form, where the definition is really the contents,
    // and the type is implied (a hash would be a dir, an string a file, an array a link)
    //    'some_dir': {'file.txt': 'foo', 'other_file.png': 'bar', 'some_link': ['target']}
    // Or it can be more verbose and be explicit about everything always providing objects:
    //    {
    //      'file.txt': {type: 'file', contents: 'foobar'},
    //      'some_dir': {type: 'directory', contents: {'otherfile': {...}}
    //    }
    _.each(manifest, function(definition, filename) {
      filename = path.join(prefix, filename);
      let contents = null;
      let type = null;
      let permissions = null;
      if (_.isString(definition)) {
        type = 'file';
        contents = definition;
      } else if (_.isArray(definition)) {
        type = 'link';
        contents = definition[0];
      } else if (_.isObject(definition)) {
        // We could be either using the detailed form of defining or just using the shorcut to define dirs
        if (definition.contents || (definition.type && _.includes(['file', 'directory', 'link'], definition.type))) {
          type = definition.type || 'file';
          permissions = definition.permissions || null;
          contents = definition.contents;
        } else {
          type = 'directory';
          contents = definition;
        }
      } else {
        throw new Error('Malformed manifest data');
      }
      switch (type) {
        case 'file': {
          const f = _this.write(filename, contents || '');
          if (permissions) fs.chmodSync(f, permissions);
          paths.push(f);
          break;
        }
        case 'directory': {
          const d = _this.mkdir(filename);
          if (permissions) fs.chmodSync(d, permissions);
          paths.push(d);
          paths = paths.concat(_this.createFilesFromManifest(contents || {}, filename));
          break;
        }
        case 'link': {
          const link = _this.normalize(filename);
          fs.symlinkSync(contents, link);
          paths.push(link);
          break;
        }
        default:
          throw new Error(`Unknown path type ${type}`);
      }
    });
    return paths;
  }
}

module.exports = Sandbox;
