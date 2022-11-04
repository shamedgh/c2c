'use strict';

const nu = require('nami-utils');
const nfile = require('nami-utils/file');
const ntest = require('nami-test');
const _ = require('nami-utils/lodash-extra.js');
const path = require('path');
const BaseComponent = require('./base-component.js');
const packaging = require('./packaging');
const TestRunner = require('../testing/test_runner');

/**
 * Constructs an instance of a Component
 * @class
 * @augments BaseComponent
 * @param {object} spec - Spec definition of the component. It corresponds to the loaded JSON file of
 * the serialized package.
 * e@param {object} [options]
 * @param {object} [options.manifest=null] - Manifest file providing a list of packed files information. This replaces
 * the 'packaging' section in the JSON spec
 * It is used when installing from pre-packed zip files, that already used the 'packaging' info a created the manifest
 * from them.
**/
class Component extends BaseComponent {
  constructor(spec, options) {
    options = _.opts(options, {manifest: null, installdir: null});
    spec = spec || {};
    super(spec, options);

    this.installation = _.opts(
      this._spec.installation, {
        root: options.installPrefix || this._defaults.installPrefix,
        prefix: this.name, strip: 0, srcDir: 'files', packaging: null
      }, {onlyDefaultKeys: true}
    );
    this.prefix = this.installation.prefix;

    this.defineProperty('installPrefix', {
      getter: value => value || this.installation.root || this._defaults.installPrefix,
      setter: newValue => {
        this.installation.root = newValue;
        return newValue;
      },
      initialValue: this.installation.root
    });

    this.installdir = options.installdir || path.join(this.installPrefix, this.prefix);
    this._manifestFile = options.manifest || null;
    this._installedFilesFile = null;
    this._unpackedFiles = [];
    this._packaging = {components: []};

    this._setupDefaultHooks();
  }
  _getSupportedHooks() {
    return [
      'preInstallChecks',
      'preInstallation',
      'preUnpackFiles',
      'unpackFiles',
      'installFiles',
      'postUnpackFiles',
      'postInstallation',
      'preUninstallation',
      'uninstallFiles',
      'postUninstallation'
    ];
  }

  _setupDefaultHooks() {
    // Expose user modificable hooks while still preserving built-in ones
    this.builtin = {};
    const map = {};
    _.each(this._getSupportedHooks(), hook => {
      const internalHookName = `_${hook}`;
      this[hook] = this[internalHookName].bind(this);
      map[hook] = internalHookName;
    });
    nu.delegate(this.builtin, map, this, {readOnly: true});
  }

  deserialize(serializedData) {
    super.deserialize(serializedData);
    const installedFiles = _.tryOnce(serializedData, 'installedFiles');
    if (installedFiles) {
      this._installedFilesFile = installedFiles;
    }
  }

  /**
   * Directory containing the bundled package tests
   * @type {string}
   */
  get testDir() { return path.join(this.metadataDir, 'test'); }

  runTests(fn, options) {
    options = _.opts(options, {
      testDir: null,
      include: ['*'], exclude: [],
      grep: null,
      reporter: 'spec', fileReporter: 'xunit', reportFile: null
    });
    const testDir = options.testDir || this.testDir;
    const testRunner = new TestRunner({
      context: this._getVmContextData({_: _.safe(), $test: ntest}),
      callback: fn
    });
    testRunner.addDirectory(testDir, _.pick(options, ['include', 'exclude', 'grep']));
    testRunner.configureReporter(_.pick(options, ['reporter', 'fileReporter', 'reportFile']));
    testRunner.run();
  }

  createWrapper(file, options) {
    options = _.opts(options, {setenv: null});
    let setenv = options.setenv;
    if (setenv === null) {
      if (!this._nfile.exists('scripts/setenv.sh')) {
        this.writeSetenv(_.defaults(options, {
          libPaths: options.libPaths || [this._nfile.normalize('lib')],
          binPaths: options.binPaths || [this._nfile.normalize('bin')]
        }));
      }
      setenv = this._nfile.normalize('scripts/setenv.sh');
    }
    this._nu.build.createWrapper(file, _.extend(options, {setenv: setenv}));
  }
  writeSetenv(options) {
    this._nu.build.writeSetenv(path.join(this.installdir, 'scripts/setenv.sh'), options);
    // TODO: This is not as easy. The written setenv should not extend the current one. Vars such as the PATH
    // should be prepend. Until that, we disable saving this
    // We should allow providing this in the nami.json
    // const env = this._nu.build.writeSetenv(path.join(this.installdir, 'scripts/setenv.sh'), options);
    // this.env = _.extend(this.env, env);
  }
  console(options) {
    options = _.opts(options, {globals: {}});
    const context = this._createContext(options.globals);
    let consoleText = `
const repl = require('repl');
const context = repl.start('nami> ').context;
`;
    _.each(context._globals, function(val, key) {
      consoleText += `context.${key} = ${key};\n`;
    });
    consoleText += 'context.require = require;\n';
    return this._evalCodeInContext(consoleText, context);
  }
  runStep(step) {
    const lifecycleMilestones = {
      preInstallChecks: 'validated',
      postUnpackFiles: 'unpacked',
      postInstallation: 'installed',
      preUninstallation: 'preUninstalled',
      uninstallFiles: 'uninstalledFiles',
      postUninstallation: 'uninstalled'
    };
    const func = this[step];
    try {
      func.apply(this);
    } catch (e) {
      e.message = `Error executing '${step}': ${e.message}`;
      throw e;
    }
    if (_.has(lifecycleMilestones, step)) {
      this.lifecycle = lifecycleMilestones[step];
    }
  }
  uninstall(/* options */) {
    const steps = ['preUninstallation', 'uninstallFiles', 'postUninstallation'];
    _.each(steps, step => this.runStep(step));
  }
  _preUninstallation() {}
  _uninstallFiles() {
    const directories = [];
    _.each(this.getUnpackedFiles(), obj => {
      // Dirs will be deleted later, from longest to shorter depth
      if (obj.type === 'directory') {
        directories.push(obj.file);
      } else {
        this._nfile.delete(obj.file, {deleteDirs: false});
      }
    });

    _.each(
      _.sortBy(directories, dir => -nfile.split(dir).length),
      dir => {
        const deleted = this._nfile.delete(dir, {onlyEmptyDirs: true});
        if (!deleted) this._logger.debug(`Skipping non-empty dir '${dir}'`);
      }
    );
  }

  _postUninstallation() {}
  _preInstallChecks() {}
  _preInstallation() {}
  _preUnpackFiles() {}

  _unpackFiles(srcDir, destination, opts) {
    opts = _.opts(opts, {prefix: path.basename(srcDir)});
    this._unpackedFiles = [];
    _.each(
      this.getSelectedPackingComponents(),
      component => {
        const data = component.unpack(null, opts);
        _.each(data.folders, folder => {
          this._unpackedFiles.push.apply(this._unpackedFiles, folder.files);
        });
      }
    );
  }
  _installFiles(opts) {
    const options = _.opts(opts, {
      installdir: this.installdir,
      srcDir: this.installation.srcDir,
      strip: this.installation.strip
    });
    const filesDir = path.join(this.srcDirRoot, options.srcDir);
    this.unpackFiles(filesDir, options.installdir, options);
    return options;
  }
  _postUnpackFiles() {}
  _postInstallation() {}

  install(options) {
    this.populateComponents();
    options = _.defaults(options || {}, {onlyPostInstall: false, skipPostInstall: false});
    const steps = [];
    if (!options.onlyPostInstall) {
      steps.push(
        'preInstallChecks', 'preInstallation',
        'preUnpackFiles', 'installFiles',
        'postUnpackFiles'
      );
    }
    if (!options.skipPostInstall) steps.push('postInstallation');
    _.each(steps, step => this.runStep(step));
  }
  populateComponents() {
    const _this = this;
    this._packaging.components = packaging.populate(
      this.getPackingData(), {
        installdir: this.installdir,
        srcDir: this.srcDirRoot,
        renderer: this,
        strip: this.installation.strip,
        logger: this._logger
      }
    );
    // TODO
    // We wont be exposing the real objects, just a wrapper around. We should implement a WrapperObject
    // so we have more fine control over this (making readonly properties, for example)
    this.packaging = {};
    this.packaging.components = {};
    const outputFilter = function(value) { return _this.subst(value); };
    const notifyCallback = function(event /* , sender, extra */) {
      if (event === 'unpacked') {
        this.postUnpackFiles();
      }
    };
    const exposedAttributes = ['name', 'destination', 'selected', 'shouldBePacked', 'permissions', 'owner', 'group'];
    _.each(this._packaging.components, function(component) {
      const componentData = {};
      _this.packaging.components[component.name] = componentData;
      nu.delegate(componentData, exposedAttributes, component, {outputFilter: outputFilter});
      componentData.postUnpackFiles = function() {};
      componentData.notify = notifyCallback;
      component.addObserver(componentData);
      componentData.folders = {};
      _.each(component.folders, function(folder) {
        const folderData = {};
        componentData.folders[folder.name] = folderData;
        nu.delegate(folderData, exposedAttributes, folder, {outputFilter: outputFilter});
        folderData.postUnpackFiles = function() {};
        folderData.notify = notifyCallback;
        folder.addObserver(folderData);
      });
    });
    _.each(this._getJsFiles({kind: 'packaging'}), function(file) {
      if (nfile.exists(file)) {
        _this._createContext().evalFile(file, {displayErrors: false});
      }
    });
  }
  getDefaultPackingData() {
    const packingComponents = [];
    const sourceFilesDir = path.join(this.srcDirRoot, 'files');
    if (nfile.exists(sourceFilesDir)) {
      const coreComponent = {
        name: 'core',
        folders: [{
          destination: '{{$app.installdir}}',
          name: 'core',
          files: [{origin: [path.join(sourceFilesDir, '*')]}]
        }]
      };
      packingComponents.push(coreComponent);
    }
    return {components: packingComponents};
  }
  getPackingData() {
    if (this._manifestFile) {
      return JSON.parse(nfile.read(this._manifestFile));
    } else {
      return this.installation.packaging || this.getDefaultPackingData();
    }
  }
  getPackingComponents(/* options */) {
    return this._packaging.components;
  }
  getSelectedPackingComponents() {
    return _.where(this.getPackingComponents(), {selected: true});
  }
  getUnpackedFiles() {
    if (_.isEmpty(this._unpackedFiles) && !_.isEmpty(this._installedFilesFile)) {
      this._unpackedFiles = JSON.parse(nfile.read(this._installedFilesFile));
    }
    return this._unpackedFiles || [];
  }
  createManifest() {
    _.each(this._packaging.components, c => c.createManifest());
  }
}
module.exports = Component;
