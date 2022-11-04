'use strict';

const isPlatform = require('../os/is-platform.js');
const chmod = require('../file/chmod.js');
const write = require('../file/write.js');
const rename = require('../file/rename.js');
const path = require('path');
const _ = require('../lodash-extra.js');
const delegate = require('../delegation.js');
const fnWrapping = require('../function-wrapping.js');

function writeSetenv(file, options) {
  options = _.opts(options, {extraText: '', libPaths: [], binPaths: [], env: {}});
  let scriptText = '';
  const libraryPaths = options.libPaths;
  const binaryPaths = options.binPaths;
  const env = {};
  if (isPlatform('unix')) {
    const libPathVar = isPlatform('osx') ? 'DYLD_LIBRARY_PATH' : 'LD_LIBRARY_PATH';
    if (!_.isEmpty(libraryPaths)) {
      const libPath = `${libraryPaths.join(':')}:$${libPathVar}`;
      env[libPathVar] = libPath;
      scriptText += `${libPathVar}="${libPath}"\nexport ${libPathVar}\n`;
    }
    if (!_.isEmpty(binaryPaths)) {
      const binPath = `${binaryPaths.join(':')}:$PATH`;
      env.PATH = binPath;
      scriptText += `PATH="${binPath}"\nexport PATH\n`;
    }
    _.each(options.env, function(val, key) {
      scriptText += `${key}="${val}"\n`;
      env[key] = val;
    });
    scriptText += options.extraText;
  } else {
    console.log('TODO: writeSetenv is not supported on Windows');
    return null;
  }
  write(file, scriptText);
  return env;
}

function createWrapper(file, options) {
  options = _.opts(options, {setenv: null});
  const destDir = path.dirname(file);
  const binaryName = `.${path.basename(file)}.bin`;
  const destBinary = path.join(destDir, binaryName);
  rename(file, destBinary);
  write(file, `#!/bin/bash
${options.setenv ? `. ${options.setenv}` : ''}
exec "${destBinary}" "$@"
`);
  chmod(file, '0755');
}

module.exports = {writeSetenv, createWrapper};

module.exports.contextify = function(options) {
  options = _.opts(options, {
    wrapperList: [], wrapper: null, silentSanitizations: true, logger: null, sanitizeUnknown: true
  });
  options.wrapperList = _.isEmpty(options.wrapperList) ? [options.wrapper] : options.wrapperList;

  const obj = {};

  const wrapperHandler = new fnWrapping.WrapperHandler(obj).addWrappers(options.wrapperList);

  const wrappableKeys = ['createWrapper', 'writeSetenv'];
  const nonWrapableKeys = _.keys(_.omit(module.exports, wrappableKeys));

  // We will treat the specialWrappableKeys individually
  wrapperHandler.exportWrappable(_.pick(module.exports, wrappableKeys));
  delegate(obj, nonWrapableKeys, module.exports, {readOnly: true});

  return obj;
};
