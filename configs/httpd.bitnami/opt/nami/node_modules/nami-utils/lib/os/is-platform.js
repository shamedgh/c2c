'use strict';

const _ = require('../lodash-extra.js');
const constants = require('../constants.js');

/**
 * Check if the current platform matches
 * @function $os~isPlatform
 * @param {string} platform
 * @returns {boolean}
 * @example
 * // Check if the current platform is Linux
 * $os.isPlatform('linux');
 * // => true
 */
const isPlatform = _.memoize((value) => {
  let response = false;

  const platform = constants.system.platform;
  if ((value === 'linux') && platform.match(/^linux/)) {
    response = true;
  } else if ((value === 'windows') && platform.match(/^windows/)) {
    response = true;
  } else if ((value === 'unix') && !platform.match(/^windows/)) {
    response = true;
  } else if ((value === 'osx') && platform.match(/^osx/)) {
    response = true;
  } else {
    response = (platform === value);
  }
  return response;
});

module.exports = isPlatform;
