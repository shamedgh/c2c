'use strict';

const isPortInUse = require('./is-port-in-use.js');
const retryWhile = require('../util/retry-while.js');
const _ = require('../lodash-extra.js');

/**
 * Wait until the port is in certain state
 * @function $net~waitForPort
 * @param {string|number} port - Port to wait for
 * @param {Object} [options]
 * @param {string} [options.state='free'] - Port state to wait for. Possible values: `free` and `bound`.
 * @param {number} [options.timeout=30] - Max. seconds to wait for state.
 * @returns {boolean} - True if port in desired state, false if timeout.
 *
 * @example <caption>Wait until certain port is free</caption>
 * // blocks the execution until port 80 is free
 * waitForPort(80, {state: 'free'});
 * // equivalent
 * waitForPort(80);
 * @example <caption>Wait until certain port is used</caption>
 * // blocks the execution until port 80 is bound
 * waitForPort(80, {state: 'bound'});
 */
function waitForPort(port, options) {
  options = _.opts(options, {state: 'free', timeout: 30});
  let func = null;

  if (options.state === 'free') {
    func = () => isPortInUse(port);
  } else if (options.state === 'bound') {
    func = () => !isPortInUse(port);
  } else {
    throw new Error('Unknown value for option \'state\'.');
  }

  return retryWhile(func, {timeout: options.timeout});
}

module.exports = waitForPort;
