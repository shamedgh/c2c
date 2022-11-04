'use strict';
const ExtendedObject = require('../extended-object.js');
const _ = require('nami-utils/lodash-extra.js');
const Logger = require('nami-logger');
const DelegatedLogger = require('nami-logger/delegated-logger');
const nu = require('nami-utils');
const nfile = require('nami-utils/file');
const templates = require('nami-utils/templates');
const fnWrapping = require('nami-utils/lib/function-wrapping.js');
const path = require('path');
const VmContext = require('../vm_context.js');
const runningAsRoot = require('nami-utils/os').runningAsRoot;

const ComponentParser = require('./component-parser.js');

class Option extends ExtendedObject {
  constructor(options) {
    super();
    options = _.defaults(options || {}, {crypter: null});
    this._crypter = options.crypter;

    this.serializationPolicy = 'secure';
    this.getter = null;
    this.setter = null;
    this.name = '';
    this.encrypt = false;
    this.type = 'string';
    this.required = false;
    this.description = '';
    this.validValues = null;
    this.default = '';
    this.validation = null;

    // For the command line handling, this should probably live elsewhere
    this.cliName = null;

    this._value = '';

    this.defineProperty('isEncrypted', {
      getter: value => this.encryptEnabled() && !!value,
      initialValue: false
    });
    this.defineProperty('serializable', {
      getter: value => {
        if (value !== null) {
          return !!value;
        } else if (this.serializationPolicy === 'secure' && this.type === 'password') {
          return false;
        } else {
          return true;
        }
      }
    });
  }

  encryptEnabled() {
    return this.encrypt;
    // For now, only on demand
    // return this.encrypt !== null ? this.encrypt : (this.type === 'password');
  }

  getEncryptedValue() {
    if (!this._crypter || !this.encryptEnabled()) return this.value;

    if (this._value === '' || _.isUndefined(this._value)) {
      return this._crypter.filter(this.default);
    } else {
      const value = this._value;
      if (this.isEncrypted) {
        return value;
      } else {
        return this._crypter.filter(value);
      }
    }
  }
  setEncryptedValue(value) {
    this._value = value;
    this.isEncrypted = true;
  }
  get value() {
    let value = null;
    if (this._value === '' || _.isUndefined(this._value)) {
      value = this.default;
    } else {
      value = this._value;
      if (this.isEncrypted) {
        if (this._crypter) {
          value = this._crypter.unfilter(value);
          if (this._crypter.applied) {
            this.value = value;
            this.isEncrypted = false;
          }
        } else {
          value = null;
        }
      }
    }
    if (this.type === 'boolean') {
      value = !!value;
    }
    return value;
  }

  set value(v) { this._value = v; }

  load(data) {
    const sanitizedData = _.pick(data, [
      'getter', 'setter', 'name', 'value', 'default',
      'required', 'validation', 'description', 'validValues', 'type',
      'type', 'encrypt', 'serializable',
      'cliName'
    ]);
    _.extend(this, sanitizedData);
  }
  validate(opts) {
    opts = _.defaults(opts || {}, {validateRequiredAndNotProvided: true});
    const v = this.value;
    if (opts.validateRequiredAndNotProvided) {
      if (this.required && v === '') {
        throw new Error(`${this.name} cannot be empty`, opts);
      }
    }
    if (this.type === 'choice') {
      if (_.isEmpty(this.validValues)) {
        throw new Error(`${this.name} must provide a valid list of options`);
      } else if (!_.includes(this.validValues, v)) {
        throw new Error(`'${v}' is not a valid value for '${this.name}'. Allowed: ${this.validValues.join(', ')}`);
      }
    }
    if (this.validation !== null) {
      if (typeof this.validation === 'string') {
        switch (this.validation) {
          case 'alphanumeric':
            if (!/^([a-z0-9\s_]*)$/.test(v)) {
              throw new Error(`${this.name} must only contain number letters and underscores`, opts);
            }
            break;
          default:
            throw new Error(`Unkwnown validation ${this.validation}`);
        }
      } else {
        throw new Error(this.validation(this.name, v), opts);
      }
    }
  }
}

/**
 * Constructs an instance of a BaseComponent
 * @class
 * @param {object} spec - Spec definition of the component. It corresponds to the loaded JSON file
 * of the serialized package.
 * @param {object} [options]
 * @param {object} [options.logger=null] - External logger to use. If none is provided, a default one will be used
**/
class BaseComponent extends ExtendedObject {
  constructor(spec, options) {
    super();
    this._spec = spec;
    this._defaults = {installPrefix: '/opt/bitnami'};
    this._expects = this._spec.expects || [];
    this._exportsMetadata = _.opts(this._spec.exports);

    /** Id of the component */
    this.id = spec.id;
    if (!this.id) throw new Error('Component id cannot be empty');

    /** Name of the component */
    this.name = spec.name || this.id;

    /** Package licenses */
    this.licenses = _.clone(spec.licenses || []);

    /** Current step of the component lifecycle */
    this.lifecycle = null;

    /** Whether the component was installed or not as root */
    this.installedAsRoot = runningAsRoot();

    /** Version of the component */
    this.version = spec.version;

    /** Revision of the component */
    this.revision = spec.revision;

    /** Owner information */
    this.owner = this._spec.owner || {};

    /** Component installation directory */
    this.installdir = this._defaults.installPrefix;

    /** Exported component methods. They will be available to other components */
    this.exports = {};

    /** Component helper functions */
    this.helpers = {};

    this.defineProperty('_options', {initialValue: {}});

    options = _.options(options, {
      environment: {},
      srcDirRoot: null,
      metadataDir: null,
      logger: null,
      serializationPolicy: 'secure',
      crypter: null,
      jsFiles: null,
      modulesManager: {}
    });

    this._modulesManager = options.modulesManager;

    /** Component environment variables (PATH, LD_LIBRARY_PATH...) */
    this.env = options.environment;

    /** At install time, directory containing the component nami.json */
    this.srcDirRoot = options.srcDirRoot;

    /** Directory containing the component resource files (JS files and nami.json). */
    /** At install time, it is equal to the srcDirRoot */
    this.metadataDir = options.metadataDir || this.srcDirRoot;

    this.jsFiles = options.jsFiles || ['helpers.js', 'main.js', 'packaging.js'];

    this._crypter = options.crypter;
    this._serializationPolicy = options.serializationPolicy;

    this._logger = options.logger ? new DelegatedLogger(options.logger, {
      prefix: this.name, prefixColor: 'cyan'
    }) : new Logger();
    nu.delegate(this, [
      'info', 'error', 'debug',
      'trace', 'trace1', 'trace2',
      'trace3', 'trace4', 'trace5',
      'trace6', 'trace7', 'trace8', 'warn'
    ], this._logger);

    this._addAttributesFromSpec();
    this._defineDynamicPathProperties({
      logsDir: 'logs',
      confDir: 'conf',
      dataDir: 'data',
      tmpDir: 'tmp',
      binDir: 'bin',
      libDir: 'lib'
    });


    // Commands will be added later on based on the lifecycle value
    this.parser = new ComponentParser(this, {
      addCommands: false
    });
  }
  _extraHiddenAttributes() {
    return ['parser', 'jsFiles', 'srcDirRoot', 'metadataDir', 'installation'];
  }
  _getAttributesFromSpec() {
    return this._spec.properties || {};
  }
  _addAttributesFromSpec() {
    _.each(this._getAttributesFromSpec(), (data, key) => this.defineMetaAttribute(key, data));
  }
  _loadJsFiles() {
    const context = this._createContext();
    _.each(this._getJsFiles({kind: 'initialization'}), file => {
      const fullPath = this.metadataDir ? path.resolve(this.metadataDir, file) : file;

      // Either because metadataDir is empty (manually created object?) or because it
      // was incorrectly defined, we refuse to load relative paths.
      if (path.isAbsolute(fullPath) && nfile.exists(fullPath)) {
        context.evalFile(fullPath, {displayErrors: false});
      }
    });
  }

  /** Directory containing the bundled package templates */
  get templatesDir() { return this.metadataDir ? path.join(this.metadataDir, 'templates') : null; }

  /**
   * Initialize the component object.
   * @desc During initialization, the component JS files will be loaded as well as populated its exported commands
   * @param {string|object} options - Options object or destination where to save the definition
   * @param {object} [options.destination=null] - Destination where to save the definition
   * This allows serializing into, for example, zip files (if the proper driver is created
   * supporting the required methods)
   */
  initialize() {
    this._modules = this._getWrappedModules();
    this._nos = this._modules.$os;
    this._nfile = this._modules.$file;
    this._hhb = this._modules.$hb;

    this._loadJsFiles();
    this._fixDeprecations();

    // Allow accessing the builtin commands through app.exports.foo with proper binding
    nu.delegate(this.exports, _.keys(this._builtinExports()), this, {enumerable: true});

    // Hide all underscored attrs
    this.hideInternalAttributes(this._extraHiddenAttributes());
  }

  _serializeResourceFiles(destination) {
    const srcDir = this.srcDirRoot || this.metadataDir || null;
    const resources = {json: 'nami.json'};
    nfile.mkdir(destination);
    if (_.isEmpty(srcDir)) {
      // We don't have a serialized JSON file to copy but we can serialize the spec definition
      // Is not very useful for now as we are merely serializing the original data at instantation time
      // but we can extend that in the future to save the new configured data:
      // obj = new Component({id: 'foo'})
      // obj.version = 'bar'
      // obj.serialize('/tmp/new-definition')
      nfile.write(path.join(destination, resources.json), JSON.stringify(this._spec));
    } else {
      let flag = false;
      _.each(['nami.json', 'bitnami.json'], f => {
        if (nfile.exists(path.join(srcDir, f))) {
          nfile.copy(path.join(srcDir, f), path.join(destination, resources.json));
          flag = true;
          return false;
        }
      });
      if (!flag) throw new Error('No nami.json found.');
    }

    _.each({
      js: this._getJsFiles(),
      extra: ['templates', 'test', 'node_modules', 'lib']
    }, (files, key) => {
      resources[key] = [];
      _.each(files, f => {
        const fullPath = srcDir ? path.resolve(srcDir, f) : f;
        // Either because metadataDir is empty (manually created object?) or because it
        // was incorrectly defined, we refuse to copy relative paths.
        if (path.isAbsolute(fullPath) && nfile.exists(fullPath)) {
          resources[key].push(path.basename(fullPath));
          nfile.copy(fullPath, destination);
        }
      });
    });

    if (!_.isEmpty(this._unpackedFiles)) {
      resources.installedFiles = 'installed-files.txt';
      nfile.write(path.join(destination, resources.installedFiles), JSON.stringify(this._unpackedFiles));
    }
    return resources;
  }
  _serializeValues() {
    const values = {};
    _.each(this.getOptions(), (opt, key) => {
      if (!opt.serializable) {
        return;
      }
      // If the option should be encrypted but we don't know how, we skip it
      if (this.serializationPolicy === 'secure' && opt.encryptEnabled() && this._crypter === null) {
        return;
      }
      if (opt.encryptEnabled() && this._crypter !== null && !opt.isEncrypted) {
        values[key] = this._crypter.filter(opt.value);
      } else {
        values[key] = opt.value;
      }
    });
    return values;
  }
  _deserializeValues(values) {
    const res = {};
    _.each(values, (data, key) => {
      const opt = this._options[key];
      opt.isEncrypted = opt.encryptEnabled();
      res[key] = data;
    });
    return res;
  }
  _serializableAttributes() {
    return ['id', 'name', 'version', 'revision', 'installedAsRoot', 'lifecycle', 'installdir', 'installPrefix'];
  }

  /* eslint-disable no-unused-vars */
  // TODO: serializeData should generata the exact same data expected by deserializeData
  serializeData(options) {
    options = _.defaults(options || {}, {prefix: null, onlyValues: false});
    const data = _.pick(this, this._serializableAttributes());
    _.extend(data, {
      values: this._serializeValues(),
      extends: this._spec.extends,
      environment: this.env,
      exports: _.keys(this.exports)
    });
    return data;
  }
  /* eslint-enable no-unused-vars */
  deserializeData(data) {
    data = _.defaults(data || {}, {values: {}});
    _.extend(
      this,
      _.pick(data, this._serializableAttributes())
    );
    if (this.lifecycle === 'installed') {
      this.parser.addCommands();
    }
    this.parser.parseData(this._deserializeValues(data.values), {force: false});
  }

  /**
   * Serialize the object into a given directory and returns a hash containing its metadata (including information of
   * the saved resource files)
   * @param {string|object} options - Options object or destination where to save the definition
   * @param {object} [options.destination=null] - Destination where to save the definition
   * This allows serializing into, for example, zip files (if the proper driver is created supporting
   * the required methods)
   */
  serialize() {
    let options = null;
    const defaultOpts = {destination: null};
    if (_.isString(arguments[0])) {
      options = {destination: arguments[0]};
    } else {
      options = arguments[0];
    }
    options = _.opts(options, defaultOpts);

    const currentData = this.serializeData();
    currentData.definition = {};
    currentData.definition.resources = this._serializeResourceFiles(options.destination);
    return currentData;
  }

  deserialize(serializedData) {
    const root = _.tryOnce(serializedData, 'definition', 'root');
    if (!this.metadataDir && root) this.metadataDir = root;
    const jsFiles = _.tryOnce(serializedData, 'definition', 'resources', 'js') || {};
    if (!_.isEmpty(jsFiles)) this.jsFiles = jsFiles;
    if (_.has(serializedData, 'data')) {
      this.deserializeData(serializedData.data);
    }
  }
  _validateExports() {
    const declaredExports = _.keys(this.getExports());
    const definedExports = _.keys(this.exports);
    const missing = _.difference(declaredExports, definedExports);
    if (missing.length > 0) {
      throw new Error(`'${this.id}' does not implement all the declared exports. Missing: ${missing.join(', ')}`);
    }
  }
  _validateOpts(options) {
    options = _.opts(options, {validateRequiredAndNotProvided: true});
    _.each(this.getOptions(), function(opt) {
      opt.validate(_.pick(options, 'validateRequiredAndNotProvided'));
    });
  }
  validate(options) {
    options = _.opts(options, {validateRequiredAndNotProvidedOptions: true});
    this._validateOpts({validateRequiredAndNotProvided: options.validateRequiredAndNotProvidedOptions});
    this._validateExports();
  }

  /**
   * Attach a dynamic attribute to the component. This attribute resolves handlebar strings in its value
   * @param {string} name - Name of the new property
   * @param {object} [options]
   * @param {boolean} [options.writable=true] - Whether to make the property writable or not
   * @param {boolean} [options.enumerable=null] - Whether to make the property enumerable or not.
   * If set to null, it will be enumerable unless its name starts with an underscore
   * @param [options.initialValue=null] - Initial value for the new attribute
   * @param {ExtendedObject~getterCb} [options.getter=_.identity] - Getter called after performing
   * handlerbar replacements.
   * @param {ExtendedObject~setterCb} [options.setter=_.identity] - Setter called before saving the value.
   */
  defineDynamicProperty(name, options) {
    options = _.opts(options, {
      enumerable: null,
      initialValue: null,
      getter: _.identity,
      setter: _.identity,
      writable: true
    });
    const dynamicGetter = _.flow(val => this.subst(val), options.getter);
    return this.defineProperty(
      name,
      _.opts(options, {getter: dynamicGetter}, {mode: 'overwrite'})
    );
  }

  /**
   * Attach a dynamic path attribute to the component. This attribute resolves handlebar strings in its value as well
   * as normalizing
   * paths relative to the component installdir
   * @param {string} name - Name of the new property
   * @param {object} [options]
   * @param {boolean} [options.writable=true] - Whether to make the property writable or not
   * @param {boolean} [options.enumerable=null] - Whether to make the property enumerable or not.
   * If set to null, it will be enumerable unless its name starts with an underscore
   * @param [options.initialValue=''] - Initial value for the new attribute
   * @param {ExtendedObject~getterCb} [options.getter=_.identity] - Getter called after performing handlerbar
   * replacements and normalization.
   * @param {ExtendedObject~setterCb} [options.setter=_.identity] - Setter called before saving the value. Returned
   * non-string values are ignored and result in an empty string.
   */
  defineDynamicPathProperty(key, options) {
    options = _.opts(options, {getter: _.identity, setter: _.identity, initialValue: ''});
    const dynamicGetter = _.flow(val => this._nfile.normalize(val), options.getter);
    const dynamicSetter = _.flow(options.setter, val => (_.isString(val) ? val : ''));
    return this.defineDynamicProperty(key, _.opts(options, {
      getter: dynamicGetter, setter: dynamicSetter
    }, {mode: 'overwrite'}));
  }

  _defineDynamicPathProperties(keys) {
    _.each(keys, (initialValue, key) => this.defineDynamicPathProperty(key, {initialValue: initialValue}));
  }

  _getJsFiles(options) {
    options = _.opts(options, {kind: 'all'});
    if (options.kind === 'initialization') {
      return _.omit(this.jsFiles, function(f) { return path.basename(f) === 'packaging.js'; });
    } else if (options.kind === 'packaging') {
      return _.filter(this.jsFiles, function(f) { return path.basename(f) === 'packaging.js'; });
    } else {
      return this.jsFiles;
    }
  }

  /**
   * Return a restrictive version of the component with only a subset of the keys exposed
   */
  getHandler() {
    let keys = [];
    keys = keys.concat(_.keys(this._getAttributesFromSpec()));
    keys.push('exports');
    // We need to find a better way of deciding what to make available
    keys = keys.concat([
      'name', 'id', 'version', 'revision', 'licenses',
      'installdir', 'dataDir', 'logsDir', 'tmpDir',
      'confDir', 'libDir', 'binDir', 'logFile'
    ]);
    const handler = {};
    nu.delegate(handler, keys, this, {readOnly: true});

    const exportKeys = _.keys(this.getExports());
    nu.delegate(handler, exportKeys, this.exports, {readOnly: true});
    return handler;
  }
  getOptions() {
    return this._options;
  }
  getExports() {
    return _.defaults(this._exportsMetadata || {}, this._builtinExports());
  }
  _builtinExports() { return {}; }

  _fixDeprecations() {
    const _this = this;
    const deprecatedHooks = {preUninstall: 'preUninstallation', postUninstall: 'postUninstallation'};
    _.each(deprecatedHooks, function(newHook, deprecatedHook) {
      if (_.has(_this, deprecatedHook)) {
        _this._logger.warn(`Hook ${deprecatedHook} is deprecated in favor of ${newHook}`);
        _this[newHook] = _this[deprecatedHook];
      }
    });
  }
  _wrapNamiTemplates() {
    const helpers = {
      expandPath: (f) => this._nfile.normalize(_.isString(f) ? f : '')
    };
    return templates({
      wrapperList: [
        new fnWrapping.PathSearcherWrapper(this.templatesDir),
        new fnWrapping.FileNormalizerWrapper(this.installdir)
      ],
      settings: {
        $app: this,
        $global: {env: process.env}
      },
      helpers: helpers,
      logger: this,
      silentSanitizations: false
    });
  }
  _wrapNamiUtils() {
    if (this._nu) return this._nu;
    const wrappedUtils = nu.contextify({
      wrapper: new fnWrapping.FileNormalizerWrapper(this.installdir, {logger: this}),
      logger: this, silentSanitizations: false
    });
    this._nu = wrappedUtils;
    return wrappedUtils;
  }
  _requireInContext(module) {
    const context = new VmContext();
    return context.requireUncached(module, {fullCacheWipe: true});
  }
  _getWrappedModules() {
    const utils = this._wrapNamiUtils();
    this._nu = utils;
    const tpl = this._wrapNamiTemplates();
    return {
      $util: utils.util, $file: utils.file,
      $Browser: require('../browser'),
      $os: utils.os, $build: utils.build,
      $hb: tpl, $net: utils.net,
      $crypt: this._requireInContext('nami-utils/crypto')
    };
  }
  _getVmContextData(extraGlobals) {
    // Do we really need the spec??
    const appData = {
      $app: this,
      $modules: _.isEmpty(this._modulesManager) ? {} : this._modulesManager.getRequiredModules(this._expects),
      $spec: this._spec
    };
    _.extend(appData, this._modules || this._getWrappedModules());
    _.extend(appData, extraGlobals || {});
    return appData;
  }
  _createContext(extraGlobals) {
    const customRequires = {lodash: _.safe()};
    // this is for assuring b/c and will be removed in the future
    _.extend(customRequires, {
      'harpoon-logger': Logger,
      'harpoon-utils': nu,
      'harpoon-utils/file': nu.file,
      'harpoon-utils/os': nu.os,
      'harpoon-utils/templates': templates
    });
    return new VmContext(this._getVmContextData(extraGlobals), customRequires);
  }
  _evalCodeInContext(code, context) {
    // Setting the package path so we can use local npm modules
    return context.evalCode(code, {displayErrors: false, modulePath: this.metadataDir});
  }
  _evalFileInContext(file, context) {
    // Setting the package path so we can use local npm modules
    return context.evalFile(file, {displayErrors: false, modulePath: this.metadataDir});
  }

  /**
   * Evaluates JS code in the component context
   * @param {string} code - Code to execute
   * @param {object} [options]
   * @param {object} [options.globals={}] - Extra globals to expose to the context
   */
  evalCode(code, options) {
    options = _.opts(options, {globals: {}});
    const context = this._createContext(options.globals);
    return this._evalCodeInContext(code, context);
  }

  /**
   * Evaluates JavaSript file in the component context
   * @param {string} file - File to execute
   * @param {object} [options]
   * @param {object} [options.globals={}] - Extra globals to expose to the context
   */
  evalFile(file, options) {
    options = _.opts(options, {globals: {}});
    const context = this._createContext(options.globals);
    return this._evalFileInContext(file, context);
  }

  defineMetaAttribute(name, value) {
    const options = _.isObject(value) ? value : {value: value};
    const licycleOptions = _.tryOnce(options, 'lifecycle', this.lifecycle) || {};
    if (!this._options[name]) this._options[name] = new Option({crypter: this._crypter});
    const option = this._options[name];

    if (!option.name) option.name = name;

    option.load(_.extend(options, licycleOptions));
    const subst = val => this.subst(val);
    option.name = name;
    option.serializationPolicy = this._serializationPolicy;
    Object.defineProperty(this, name, {
      configurable: true,
      enumerable: true,
      get: function() {
        const opt = this._options[name];
        const getter = _.flow(subst, opt.getter || _.identity);
        return getter(opt.value, opt);
      },
      set: function(val) {
        const opt = this._options[name];
        const setter = opt.setter || _.identity;
        opt.value = setter(val, opt);
      }
    });
    return option;
  }

  /**
   * Resolves handlebar templates in text. It makes available the component object as $app
   * @param {string} text - Text to resolve. If a non-string is provided, it will be return right away.
   * @param {object} data - Extra information to use when resolving the template.
   */
  subst(text, data) {
    const hhb = this._wrapNamiTemplates();
    if (!_.isString(text)) return text;
    try {
      return hhb.renderText(text, data);
    } catch (e) {
      this._logger.warn(e.message);
      return text;
    }
  }
}


module.exports = BaseComponent;
