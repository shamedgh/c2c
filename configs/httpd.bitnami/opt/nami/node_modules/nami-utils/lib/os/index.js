'use strict';

/** @namespace $os */

const fnWrapping = require('../function-wrapping.js');
const delegate = require('../delegation.js');
const fileExists = require('../file/exists.js');
const dummyLogger = require('../common.js').dummyLogger;
const _ = require('../lodash-extra.js');

module.exports = {
  runProgram: require('./run-program.js'),
  spawnAsync: require('./spawn.js'),
  execAsync: require('./exec.js'),
  isPlatform: require('./is-platform.js'),
  pidFind: require('./pid-find.js'),
  ps: require('./ps.js'),
  kill: require('./kill.js'),
  findInPath: require('./find-in-path.js'),
  isInPath: require('./is-in-path.js'),
  isUnix: require('./is-unix.js'),
  runningAsRoot: require('./running-as-root.js')
};

_.extend(
  module.exports,
  require('./temporary-files.js'),
  require('./user-management/index.js')
);

// Returns a clone of the package with certain functions wrapped (with customized behavior)
module.exports.contextify = (options) => {
  options = _.opts(options, {
    wrapperList: [], wrapper: null,
    silentSanitizations: true, sanitizeUnknown: true,
    logger: null
  });
  options.wrapperList = _.isEmpty(options.wrapperList) ? [options.wrapper] : options.wrapperList;

  const obj = {};

  const wrapperHandler = new fnWrapping.WrapperHandler(obj).addWrappers(options.wrapperList);

  const logger = options.logger || dummyLogger;

  const normalizeFile = (file) => { return wrapperHandler.process(file, 'FileWrapper'); };

  const wrappableKeys = ['runProgram'];
  const nonWrapableKeys = _.keys(_.omit(module.exports, wrappableKeys));

  delegate(obj, nonWrapableKeys, module.exports, {readOnly: true});

  const _runProgram = module.exports.runProgram;

  function runProgram(program, args, opts) {
    opts = _.opts(opts, {logger: logger});
    if (program) {
      const normalizedProgram = normalizeFile(program);
      if (fileExists(normalizedProgram)) {
        program = normalizedProgram;
      }
    }
    return _runProgram(program, args, _.opts(opts, opts));
  }
  obj.runProgram = runProgram;
  return obj;
};
