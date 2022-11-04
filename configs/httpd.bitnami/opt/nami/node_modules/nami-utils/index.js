'use strict';

/** @namespace $util */

// http://stackoverflow.com/questions/6551006/get-my-os-from-the-node-js-shell

const common = require('./lib/common.js');
const delegate = require('./lib/delegation.js');
const _ = require('./lodash-extra.js');

module.exports = {
  build: require('./lib/build/index.js'),
  net: require('./lib/net/index.js'),
  crypt: require('./lib/crypto/index.js'),
  os: require('./lib/os/index.js'),
  file: require('./lib/file/index.js'),
  util: require('./lib/util/index.js')
};

_.extend(module.exports, {
  toListFunction: _.toListFunction,
  getInheritanceChain: common.getInheritanceChain,
  delegate: delegate
});

module.exports.contextify = function(options) {
  options = _.opts(options, {
    wrapperList: [], wrapper: null,
    silentSanitizations: true, sanitizeUnknown: true,
    logger: null
  });
  options.wrapperList = _.isEmpty(options.wrapperList) ? [options.wrapper] : options.wrapperList;

  const obj = {};

  const submodules = ['os', 'file', 'util', 'build', 'net', 'crypt'];

  delegate(obj, _.keys(_.omit(submodules, submodules)), module.exports, {readOnly: true});
  // Wrappable modules
  _.each(submodules, function(pkg) {
    obj[pkg] = module.exports[pkg].contextify(options);
  });


  return obj;
};

