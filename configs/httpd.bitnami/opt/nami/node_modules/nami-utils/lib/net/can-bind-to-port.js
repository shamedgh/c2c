'use strict';

const _validatePortFormat = require('./common.js').validatePortFormat;
const runningAsRoot = require('../os/running-as-root.js');
const isPortInUse = require('./is-port-in-use.js');

/**
 * Check if the process can bind to a given port
 * @function $net~canBindToPort
 * @param {string} port - Port to bind to
 * @returns {boolean} - Whether the process can bind to the port or not
 * @example
 * // Check if current process can bind the port 80
 * $net.canBindToPort(80);
 * => false
 */
function canBindToPort(port) {
  _validatePortFormat(port);
  if (port < 1024 && !runningAsRoot()) {
    return false;
  } else {
    return !isPortInUse(port);
  }
}

module.exports = canBindToPort;
