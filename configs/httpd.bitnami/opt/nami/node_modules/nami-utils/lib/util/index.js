'use strict';

/** @namespace $util */

const fnWrapping = require('../function-wrapping.js');
const delegate = require('../delegation.js');
const _ = require('../lodash-extra.js');

module.exports = {
  sleep: require('./sleep.js'),
  tail: require('./tail.js'),
  retryWhile: require('./retry-while.js')
};

module.exports.contextify = function(options) {
  options = _.opts(options, {
    wrapperList: [], wrapper: null,
    silentSanitizations: true, sanitizeUnknown: true,
    logger: null
  });
  options.wrapperList = _.isEmpty(options.wrapperList) ? [options.wrapper] : options.wrapperList;

  const obj = {};

  const wrapperHandler = new fnWrapping.WrapperHandler(obj).addWrappers(options.wrapperList);

  const wrappableKeys = ['tail'];
  const nonWrapableKeys = _.keys(_.omit(module.exports, wrappableKeys));


  // We will treat the specialWrappableKeys individually
  wrapperHandler.exportWrappable(_.pick(module.exports, wrappableKeys));

  delegate(obj, nonWrapableKeys, module.exports, {readOnly: true});
  return obj;
};
