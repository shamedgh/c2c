'use strict';

const waitForPort = require('./wait-for-port.js');

/**
 * Wait until the port is free
 * @function $net~waitForPortToBeFree
 * @param {string|number} port - Port to wait for
 * @param {Object} [options]
 * @param {number} [options.timeout=30] - Max. seconds to wait for state.
 * @returns {boolean} - True if port free, false if timeout.
 * @example <caption>Wait until certain port is free</caption>
 * // blocks the execution until port 80 is free
 * waitForPortToBeFree(80);
 */
function waitForPortToBeFree(port, options) {
  return waitForPort(port, {state: 'free', timeout: options.timeout});
}

/**
 * Wait until the port is bound
 * @function $net~waitForPortToBeBound
 * @param {string|number} port - Port to wait for
 * @param {Object} [options]
 * @param {number} [options.timeout=30] - Max. seconds to wait for state.
 * @returns {boolean} - True if port bound, false if timeout.
 *
 * @example <caption>Wait until certain port is bound</caption>
 * // blocks the execution until port 80 is bound
 * waitForPortToBeBound(80);
 */
function waitForPortToBeBound(port, options) {
  return waitForPort(port, {state: 'bound', timeout: options.timeout});
}

module.exports = {waitForPortToBeFree, waitForPortToBeBound};
