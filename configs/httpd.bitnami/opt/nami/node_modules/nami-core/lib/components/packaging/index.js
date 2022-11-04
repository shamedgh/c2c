'use strict';

const Logger = require('nami-logger');
const fnWrapping = require('nami-utils/lib/function-wrapping.js');
const nu = require('nami-utils');
const nfile = require('nami-utils/file');
const _ = require('nami-utils/lodash-extra.js');
const EntriesContainer = require('./entries_container');
const runningAsRoot = require('nami-utils/os').runningAsRoot;

class FileOperation {
  constructor(definition, options) {
    options = _.opts(options, {renderer: null});
    this.renderer = options.renderer;
  }
  subst(text, data) {
    if (this.renderer) {
      return this.renderer.subst(text, data);
    } else {
      return text;
    }
  }
  apply(fileList) {
    _.each(fileList, file => this.executeOperation(file));
  }
}

class SetPermissions extends FileOperation {
  constructor(definition, options) {
    definition = _.opts(definition, {username: null, group: null, permissions: null});
    super(definition, options);
    this.username = definition.username;
    this.group = definition.group;
    this.permissions = definition.permissions;
  }
  executeOperation(file) {
    const permissions = this.subst(this.permissions);
    const username = this.subst(this.username);
    const group = this.subst(this.group);
    if (permissions) {
      nfile.chmod(file, permissions);
    }
    if (runningAsRoot() && (username || group)) {
      nfile.chown(file, username, group);
    }
  }
}

const fileOperations = {setPermissions: SetPermissions};

class FsPathManager {
  constructor(srcDir, destDir, options) {
    options = _.opts(options, {renderer: null, variables: {}});
    options.variables = _.opts(options.variables, _.pick({srcDir: srcDir, destdir: destDir}, _.identity));
    const substitutor = new fnWrapping.FileSubstitutorWrapper(_.opts(options, {substitutor: options.renderer}));
    const srcWrapperList = [substitutor];
    const destWrapperList = [substitutor];
    if (srcDir) srcWrapperList.push(new fnWrapping.FileNormalizerWrapper(srcDir));
    if (destDir) destWrapperList.push(new fnWrapping.FileNormalizerWrapper(destDir));
    const srcNu = nu.contextify({wrapperList: srcWrapperList});
    const destNu = nu.contextify({wrapperList: destWrapperList});
    this.srcResolver = srcNu.file;
    this.destResolver = destNu.file;
    this.renderer = options.renderer;
    this.src = this.srcResolver;
    this.dest = this.destResolver;
  }
}

class BaseContainer {
  constructor(definition, options) {
    definition = _.opts(definition, {destination: null, permissions: null, owner: null, group: null, strip: 0});
    this.permissions = definition.permissions;
    this.owner = definition.owner;
    this.group = definition.group;
    this.strip = definition.strip;
    options = _.opts(options, {
      prefix: null,
      pathManager: null,
      srcDir: null,
      destdir: null,
      renderer: null,
      logger: null
    });
    this.renderer = options.renderer;
    this.pathManager = options.pathManager ||
      new FsPathManager(options.srcDir, options.destdir, {renderer: this.renderer});

    this.destination = definition.destination || options.installdir;
    this.logger = options.logger || new Logger({level: 'error', silenced: true});
    this.hideAttributes(['pathManager']);
  }
  hideAttributes(list) {
    const _this = this;
    _.each(list, function(attr) {
      Object.defineProperty(_this, attr, {enumerable: false, writable: true});
    });
  }
  getAttributes(fallbackAttrs) {
    const currentAttrs = _.pick({
      destination: this.destination,
      permissions: this.permissions,
      owner: this.owner,
      group: this.group
    }, function(value) { return value !== null; });
    return _.opts(currentAttrs, fallbackAttrs);
  }
}

class NamedContainer extends BaseContainer {
  constructor(definition, options) {
    definition = _.opts(definition, {name: 'somename', tagOperations: {}, selected: true});
    options = _.opts(options, {prefix: null});
    super(definition, options);
    this.name = definition.name;
    this.selected = definition.selected;
    this.tagOperations = definition.tagOperations;
    this.observerList = [];
  }
  serializableAttributes() {
    return ['name', 'destination', 'permissions', 'owner', 'group', 'strip', 'selected', 'tagOperations'];
  }
  getInheritableAttributes() {
    return _.pick(this, ['destination', 'permissions', 'owner', 'group', 'strip', 'tagOperations']);
  }

  addObserver(obj) {
    this.observerList.push(obj);
  }
  notifyObservers(event) {
    const args = _.toArray(arguments).slice(1);
    _.each(this.observerList, o => o.notify(event, this, args));
  }
  executeTagOperations(options) {
    const taggedFiles = this.getTaggedFiles();
    _.each(this.tagOperations, function(operations, tagName) {
      if (!_.has(taggedFiles, tagName)) return;
      _.each(operations, function(operation) {
        _.each(operation, function(operationData, operationName) {
          if (!_.has(fileOperations, operationName)) throw new Error(`Unknown tag operation ${operationName}`);
          const operationObj = new fileOperations[operationName](operationData, options);
          operationObj.apply(taggedFiles[tagName]);
        });
      });
    });
  }
}

class File extends BaseContainer {
  constructor(definition, options) {
    definition = _.opts(definition, {allowEmptyList: false, orign: null, include: ['*'], exclude: [], manifest: null});
    options = _.opts(options);
    super(definition, options);
    _.extend(
      this,
      _.pick(definition, this.serializableAttributes())
    );
    this.container = new EntriesContainer(options.srcDir);
    this.hideAttributes(['unpacker']);
  }

  serializableAttributes() {
    return ['allowEmptyList', 'include', 'exclude', 'origin', 'manifest'];
  }
  normalize(file, options) {
    if (this.pathManager) {
      return this.pathManager.dest.normalize(file, options);
    } else {
      return file;
    }
  }
  normalizeSrc(file, options) {
    if (this.pathManager) {
      return this.pathManager.src.normalize(file, options);
    } else {
      return file;
    }
  }
  unpack(dest, options) {
    const attributes = this.getAttributes(options);
    const _this = this;
    dest = dest || attributes.destination || attributes.installdir;
    dest = this.pathManager.dest.normalize(dest);
    const res = [];
    if (!nfile.exists(dest)) {
      nfile.mkdir(dest);
      res.push({file: dest, type: 'directory'});
    }
    const unpackOptions = {include: this.include, exclude: this.exclude, strip: this.strip, attributes: attributes};
    if (!_.isEmpty(this.manifest)) {
      res.push.apply(res, this.container.unpackEntries(this.manifest, dest, unpackOptions));
    } else {
      const unpackedFiles = this.container.unpack(
        _.map(this.origin, pattern => _this.normalizeSrc(pattern)),
        dest,
        unpackOptions
      );
      if (_.isEmpty(unpackedFiles) && !_.isEmpty(this.origin) && !this.allowEmptyList) {
        throw new Error(`Origin '${JSON.stringify(this.origin)}' resolved to an empty list of files`);
      } else {
        res.push.apply(res, unpackedFiles);
      }
    }
    return res;
  }
}

class Folder extends NamedContainer {
  constructor(definition, options) {
    definition = _.opts(definition, {name: 'sampleFolder', tags: []});
    options = _.opts(options, {prefix: null});
    super(definition, options);
    this.files = [];
    this.addFilesFromDefinition(definition.files || [], options);
    this.tags = definition.tags;
    this._taggedFiles = {};
  }
  getInheritableAttributes() {
    return _.pick(this, ['strip', 'permissions']);
  }
  addFilesFromDefinition(definition, options) {
    options = _.opts(options);
    _.each(definition, fileData => this.files.push(
      new File(
        _.opts(fileData, this.getInheritableAttributes(), {overwriteFalsy: true}),
        options
      )
    ));
  }
  unpack(dest, options) {
    const attributes = this.getAttributes(options);
    dest = dest || attributes.destination || attributes.installdir;
    dest = this.pathManager.dest.normalize(dest);
    const res = {};
    res.name = this.name;
    res.destination = dest;
    res.files = [];
    _.each(this.files, function(fileObj) {
      res.files.push.apply(res.files, fileObj.unpack(dest, attributes));
    });

    if (!_.isEmpty(this.tags)) {
      _.each(this.tags, tag => {
        let matchedFiles = null;
        let tagName = null;
        if (_.isString(tag)) {
          tagName = tag;
          matchedFiles = _.pluck(res.files, 'file');
        } else {
          tagName = tag.name;
          const tagPattern = tag.pattern;
          matchedFiles = _.filter(
            _.pluck(res.files, 'file'),
            file => nu.file.matches(file, tagPattern)
          );
        }
        if (!_.isEmpty(matchedFiles)) {
          this._taggedFiles[tagName] = matchedFiles;
        }
      });
    }
    this.executeTagOperations({renderer: this.renderer});
    this.notifyObservers('unpacked');
    return res;
  }
  getTaggedFiles() {
    return this._taggedFiles;
  }
}

class Component extends NamedContainer {
  constructor(definition, options) {
    definition = _.opts(definition, {name: 'somename', destination: null});
    options = _.opts(options, {
      prefix: null,
      srcDir: null,
      installdir: null,
      renderer: null,
      pathManager: null,
      logger: null
    });
    super(definition, options);

    this.folders = [];
    this.addFoldersFromDefinition(definition.folders || [], options);
    this.packedFiles = {};
    this.unpackedFiles = {};
    this.hideAttributes(['unpakcer', 'packedFiles']);
  }
  selectedFolders() {
    return _.where(this.folders, {selected: true});
  }
  unpack(dest, options) {
    if (this.selected === false) return {};

    const attributes = this.getAttributes(options);
    this.unpackedFiles = _.map(this.selectedFolders(), folder => {
      try {
        return folder.unpack(dest, attributes);
      } catch (e) {
        e.message = `Error unpacking folder '${folder.name}' of component '${this.name}': ${e.message}`;
        throw e;
      }
    });
    this.executeTagOperations({renderer: this.renderer});
    this.notifyObservers('unpacked');
    return {name: this.name, folders: this.unpackedFiles};
  }

  getTaggedFiles() {
    const taggedFiles = {};
    _.each(this.folders, function(folderObj) {
      _.each(folderObj.getTaggedFiles(), function(files, tagName) {
        taggedFiles[tagName] = _.union(taggedFiles[tagName], files);
      });
    });
    return taggedFiles;
  }
  addFoldersFromDefinition(definition, options) {
    options = _.opts(options);
    _.each(definition, folderData => this.folders.push(
      new Folder(
        _.opts(folderData, this.getInheritableAttributes(), {overwriteFalsy: true}),
        options)
    ));
  }
}

function populate(definition, options) {
  options = _.opts(options, {
    srcDir: null,
    strip: 0,
    installdir: null,
    renderer: null,
    pathManager: null,
    logger: null
  });
  options.pathManager = options.pathManager ||
    new FsPathManager(options.srcDir, options.installdir, {renderer: options.renderer});

  const globalDefaults = _.pick(options, ['strip']);
  definition = _.opts(definition);
  return _.map(
    definition.components,
    data => new Component(_.opts(data, globalDefaults), options)
  );
}

exports.Component = Component;
exports.Folder = Folder;
exports.populate = populate;
