'use strict';

/** @namespace $net */

const delegate = require('../delegation.js');
const _ = require('../lodash-extra.js');
const portChecking = require('./port-checking.js');

module.exports = {
  isPortInUse: require('./is-port-in-use.js'),
  canBindToPort: require('./can-bind-to-port.js'),
  waitForPort: require('./wait-for-port.js'),
  waitForPortToBeFree: portChecking.waitForPortToBeFree,
  waitForPortToBeBound: portChecking.waitForPortToBeBound
};

module.exports.contextify = function() {
  const obj = {};
  delegate(obj, _.keys(module.exports), module.exports);
  return obj;
};
