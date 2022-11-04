'use strict';

const isPlatform = require('./is-platform.js');

/**
 * Check if the process is being executed by a privileged user
 * @returns {boolean} - Whether the process is being executed by a privileged user or not
 * @example
 * // Check if the current process is running as root
 * $os.runningAsRoot();
 * // => true
 */
function runningAsRoot() {
  if (isPlatform('unix')) {
    return (process.getuid() === 0);
  } else {
    throw new Error('runningAsRoot is not supported on this platform');
  }
}

module.exports = runningAsRoot;
