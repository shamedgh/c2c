'use strict';

/** @namespace $util */

const sleep = require('./sleep.js');
const _ = require('../lodash-extra.js');

/**
 * Retry while function returns falsy.
 * @function $util~retryWhile
 * @param {function} func - Function to be executed.
 * @param {Object} [options]
 * @param {number} [options.step=1] - Time between attempts in seconds.
 * @param {number} [options.timeout=30] - Timeout in seconds. `Infinity` means no timeout (it will wait forever).
 * @returns {boolean} Returns true if the function returns true or false if timeout is reached.
 *
 * @example <caption>Waiting until a file is created</caption>
 * if (retryWhile(() => !exists('/tmp/file'))) {
 *   // do something with the file
 * } else {
 *   // throw exception saying the expected file has not been created
 * }
 */
function retryWhile(func, options) {
  options = _.opts(options, {step: 1, timeout: 30});
  const step = Number(options.step);
  const timeout = Number(options.timeout);

  if (!_.isFunction(func)) {
    throw new TypeError('`func` must be a function');
  }
  if (!_.isFinite(step)) {
    throw new TypeError('`options.step` must be a finite number');
  }
  if (!_.isFinite(timeout) && timeout !== Infinity) {
    throw new TypeError('`options.timeout` must be a number');
  }

  let time = 0;
  while (func()) {
    if (time < timeout) {
      sleep(step);
      time += step;
    } else {
      return false;
    }
  }
  return true;
}

module.exports = retryWhile;
