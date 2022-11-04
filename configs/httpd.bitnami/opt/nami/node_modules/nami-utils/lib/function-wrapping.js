'use strict';

const _ = require('./lodash-extra.js');
const common = require('./common.js');
const path = require('path');
const fileExists = require('./file/exists.js');

function isAbsolute(file) {
  return file.slice(0, 2) === '~/' || path.isAbsolute(file);
}

class WrapperHandler {
  constructor(obj) {
    this.wrappingOptions = {};
    this.wrapperList = [];
    this.obj = obj;
  }
  addWrappers(list) {
    const _this = this;
    _.each(list, function(wrapper) {
      _this.addWrapper(wrapper);
    });
    return this;
  }
  addWrapper(wrapper) {
    if (wrapper) this.wrapperList.push(wrapper);
    return this;
  }
  isWrappable(key) {
    return (_.has(this.wrappingOptions, key) && !!this.wrappingOptions[key].wrappable);
  }
  export(map, options) {
    options = _.opts(options, {wrappable: false, prefix: null});
    const _this = this;
    let mappingObject = null;
    if (_.isArray(map)) {
      const prefix = options.prefix;
      const extendableObject = _.isEmpty(prefix) ? this.obj : (this.obj[prefix] || {});
      mappingObject = {};
      _.each(map, function(key) {
        mappingObject[key] = extendableObject[key];
      });
    } else {
      mappingObject = map;
    }
    _.each(mappingObject, function(value, key) {
      _this.wrappingOptions[key] = {wrappable: options.wrappable};
      if (_.isFunction(value)) {
        _this.wrap(key, value, options);
      } else {
        _this[key] = value;
      }
    });
  }
  process(data, type, options) {
    options = _.opts(options, {doOnce: false});
    let done = false;
    _.each(this.wrapperList, function(wrapper) {
      if (type && !wrapper.isa(type)) return;
      if (done && options.doOnce) return;
      data = wrapper.process(data, options);
      done = true;
    });
    return data;
  }
  wrap(key, fn, options) {
    options = _.opts(options, {prefix: null});
    const _this = this;

    let wrappedFn = null;
    let extendableObject = null;
    if (_.isEmpty(this.wrapperList) || !this.isWrappable(key)) {
      wrappedFn = fn;
    } else {
      wrappedFn = fn;
      _.eachRight(this.wrapperList, function(wrapper) {
        wrappedFn = wrapper.wrap(_this.obj, wrappedFn, {fnName: key});
      });
    }
    if (_.isEmpty(options.prefix)) {
      extendableObject = this.obj;
    } else {
      const prefix = options.prefix;
      if (!_.has(this.obj, prefix)) this.obj[prefix] = {};
      extendableObject = this.obj[prefix];
    }
    extendableObject[key] = wrappedFn.bind(this.obj);
  }
  exportWrappable(map, options) {
    options = _.opts(options);
    this.export(map, _.extend(options, {wrappable: true}));
  }
}

class Wrapper {
  constructor(options) {
    options = _.opts(options, {logger: null});
    this.logger = options.logger;
  }
  log(level, msg) {
    if (!this.logger) return;
    try {
      this.logger[level.toLowerCase()](msg);
    } catch (e) { /* not empty */ }
  }
  wrap(obj, fn) {
    return fn.bind(obj);
  }
  isa(type) {
    return _.includes(common.getInheritanceChain(this), type);
  }
  getType() {
    return this.constructor.name;
  }
  process(data) {
    return data;
  }
}

class SubstitutorWrapper extends Wrapper {
  constructor(options) {
    super(options);
    options = _.opts(options, {variables: {}, substitutor: null, logger: null});
    // We do this here to avoid loops
    this.templates = require('./templates.js');

    this.substitutor = options.substitutor;
    this.variables = options.variables;
  }
  subst(text, options) {
    const allMappings = _.opts(options, this.variables);
    if (this.substitutor) {
      return this.substitutor.subst(text, allMappings);
    } else {
      return this.substText(text, allMappings);
    }
  }
  substText(text, options) {
    return this.templates.renderText(text, options);
  }
  wrap(obj, fn, options) {
    options = _.opts(options, {fnName: '', intercepter: null});
    const functionName = options.fnName;
    const _this = this;
    const wrappedFn = function(/* file */) {
      const newArguments = [];
      _.each(arguments, function(e) {
        const argValue = _.isString(e) ? _this.subst(e) : e;
        _this.log('TRACE8', `[${functionName}] Parameter substitution ${e} -> ${argValue}`);
        newArguments.push(argValue);
      });
      return fn.apply(obj, newArguments);
    };
    return super.wrap(obj, wrappedFn);
  }
  process(data) {
    this.subst(data);
  }
}

class FileWrapper extends Wrapper {
  constructor(root, options) {
    super(options);
    this.root = root;
  }
  process(data) {
    // Support arrays of files
    if (_.isArray(data)) {
      return _.map(data, f => this.normalizeFile(f));
    } else if (_.isString(data)) {
      return this.normalizeFile(data);
    } else {
      return data;
    }
  }

  normalizeFile(file) {
    return file;
  }
  wrap(obj, fn, options) {
    options = _.opts(options, {fnName: '', intercepter: null});
    const functionName = options.fnName;
    const _this = this;
    const wrappedFn = function(file) {
      const arrayArgs = _.toArray(arguments);
      arrayArgs[0] = _this.process(file);
      _this.log('TRACE8', `[${functionName}] File normalization: ${file} -> ${arrayArgs[0]}`);
      if (options.intercepter && _.isFunction(options.intercepter)) {
        options.intercepter(options.fnName, fn, arrayArgs);
      }
      return fn.apply(obj, arrayArgs);
    };
    return super.wrap(obj, wrappedFn);
  }
}

class FileSubstitutorWrapper extends FileWrapper {
  constructor(options) {
    super(options);
    this.substitutor = new SubstitutorWrapper(options);
  }
  normalizeFile(file) {
    return this.substitutor.subst(file);
  }
}

class PathSearcherWrapper extends FileWrapper {
  constructor(searchPath, options) {
    super(options);
    this.path = [];
    if (_.isString(searchPath)) {
      this.path.push(searchPath);
    } else if (_.isArray(searchPath)) {
      this.path = searchPath;
    }
  }

  normalizeFile(file) {
    return (this.searchInPath(file) || file);
  }
  searchInPath(file) {
    if (isAbsolute(file)) return null;
    const dir = _.find(this.path, function(e) {
      return fileExists(path.join(e, file));
    });
    return (!!dir ? path.join(dir, file) : null);
  }
}

class FileNormalizerWrapper extends FileWrapper {
  normalizeFile(file) {
    if (this.root === null || !_.isString(file) || isAbsolute(file)) return file;
    return path.resolve(this.root, file);
  }
}

exports.WrapperHandler = WrapperHandler;
exports.Wrapper = Wrapper;
exports.SubstitutorWrapper = SubstitutorWrapper;
exports.FileSubstitutorWrapper = FileSubstitutorWrapper;
exports.FileWrapper = FileWrapper;
exports.FileNormalizerWrapper = FileNormalizerWrapper;
exports.PathSearcherWrapper = PathSearcherWrapper;
