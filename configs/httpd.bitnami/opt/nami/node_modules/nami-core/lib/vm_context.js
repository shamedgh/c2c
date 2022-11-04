'use strict';

const us = require('nami-utils/lodash-extra.js');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const Module = require('module');

class VmContext {
  constructor(globals, requires) {
    globals = globals || {};
    requires = requires || {};
    // mimic exports for modules to allow exporting objects if needed
    this._vmExports = {};
    this._globals = globals;
    this._requires = requires;
    this._vmSandbox = us.extend(us.clone({
      // console can be useful for debugging loading of code
      'console': console,
      'process': process,
      'setTimeout': setTimeout
    }), globals);
  }
  _uncachePaths(cache, patternList) {
    patternList = patternList || [/.*/];
    return this._wipeCache(cache, key => {
      return us.any(patternList, pattern => pattern.test(key));
    });
  }
  _wipeCache(cache, predicate) {
    predicate = predicate || function() { return true; };
    const wipedData = {};
    us.each(cache, function(cachedData, key) {
      if (predicate(key)) {
        wipedData[key] = cachedData;
        delete cache[key];
      }
    });
    return wipedData;
  }
  _recachePaths(cache, newCacheData, options) {
    options = us.defaults(options || {}, {fullRestore: false});
    if (options.fullRestore) us.each(cache, (val, key) => delete cache[key]);
    us.extend(cache, newCacheData);
  }
  _exposeRequire(mod, context, options) {
    options = us.defaults(options || {}, {disableCache: false, uncachedPaths: [/.*/]});
    const _this = this;

    // We try to allow loading both modules installed with nami as well
    // as modules locally bundled within the package;
    function require(p) {
      return us.tryFuncs([
        () => mod.require(p),
        () => _this.requireWrapper(_this, [p]),
        () => {
          const ctx = _this.evalFile(require.resolve(p), {exports: {}, returnContext: true}).context;
          return ctx.module.exports;
        }
      ]);
    }

    function requireUncached(p, opts) {
      opts = us.defaults(opts || {}, {fullCacheWipe: false, disableCache: false, uncachedPaths: [/.*/]});
      const uncachedFiles = opts.fullCacheWipe ?
        _this._wipeCache(require.cache) :
        _this._uncachePaths(require.cache, requireUncached.uncachedPaths);

      try {
        return require(p);
      } finally {
        if (!us.isEmpty(uncachedFiles)) {
          const performFullRestore = opts.fullCacheWipe ? true : false;
          _this._recachePaths(require.cache, uncachedFiles, {fullRestore: performFullRestore});
        }
      }
    }
    requireUncached.uncachedPaths = options.uncachedPaths;

    // We mimic the module definition in module.js
    require.extensions = Module._extensions;
    require.resolve = function(request) {
      return Module._resolveFilename(request, mod);
    };
    require.main = process.mainModule;
    require.extensions = Module._extensions;
    require.cache = Module._cache;
    context.requireUncached = requireUncached;
    context.require = options.disableCache ? requireUncached : require;
  }
  _createModule(options) {
    options = us.defaults(options || {}, {exports: null, filename: null, modulePath: null, paths: []});
    const filename = options.filename;
    const parentModule = process.mainModule;
    const mod = new Module(filename, parentModule);
    const parentModuleFilename = parentModule ? parentModule.filename : null;
    mod.filename = filename;
    // Populate module search path
    if (us.isEmpty(options.paths)) {
      const modulePath = options.modulePath || path.dirname(mod.filename || parentModuleFilename);
      mod.paths = Module._nodeModulePaths(modulePath);
    } else {
      mod.paths = options.paths;
    }
    mod.exports = options.exports || this._vmExports;
    Module._cache[filename] = mod;
    return mod;
  }
  _createModuleContext(options) {
    const mod = this._createModule(options);
    const filename = mod.filename;
    const dirname = filename ? path.dirname(filename) : null;
    const sandbox = us.clone(this._vmSandbox);
    const context = vm.createContext(sandbox);
    this._exposeRequire(mod, context, options);
    context.exports = mod.exports;
    context.__filename = filename;
    context.__dirname = dirname;
    context.module = mod;
    return context;
  }
  require(module, options) {
    if (us.isString(options)) {
      options = {filename: options};
    }
    const context = this._createModuleContext(options);
    return context.require(module);
  }
  requireUncached(module, options) {
    if (us.isString(options)) {
      options = {filename: options};
    }
    const context = this._createModuleContext(options);
    return context.requireUncached(module, options);
  }

  evalCode(code, options) {
    if (us.isString(options)) {
      options = {filename: options};
    }
    const context = this._createModuleContext(options);
    const result = vm.runInContext(code, context, options);
    return options.returnContext ? {result: result, context: context} : result;
  }

  evalFile(fileName, options) {
    let contents = fs.readFileSync(fileName, 'utf8');
    options = us.defaults(options || {}, {
      displayErrors: true, filename: fileName, modulePath: null, paths: [], exports: null, returnContext: false
    });
    // remove shebang
    contents = contents.replace(/^#!.*[^\n]*/, '');
    return this.evalCode(contents, options);
  }

  evalFiles(paths, base) {
    const _this = this;
    // make sure the list is an array; if not, map to one
    if (!us.isArray(paths)) {
      paths = [paths];
    }
    paths.foEach(function(name) {
      if (base) {
        name = path.join(base, name);
      }
      _this.evalFile(name);
    });
  }
  getExports() {
    return this._vmExports;
  }
  requireWrapper(_this, args) {
    // TODO: handle relative files
    if ((args.length === 1) && (_this._requires[args[0]])) {
      return _this._requires[args[0]];
    } else if ((args.length === 1) && (_this._globals[args[0]])) {
      return _this._globals[args[0]];
    } else {
      return require.apply(null, args);
    }
  }
}

module.exports = VmContext;
