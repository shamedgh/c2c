'use strict';

const _ = require('../lodash-extra.js');
const _validatePortFormat = require('./common.js').validatePortFormat;
const isPlatform = require('../os/is-platform.js');
const isInPath = require('../os/is-in-path.js');
const fileExists = require('../file/exists.js');
const read = require('../file/read.js');
const runProgram = require('../os/run-program.js');

function _isPortInUseNetstat(port) {
  const result = runProgram('netstat', ['-alntp', 'tcp'], {retrieveStdStreams: true});
  if (result.code !== 0) {
    throw new Error(`Cannot check port status: ${result.stderr}`);
  }
  return _.some(String(result.stdout).split('\n'), (line) => {
    // Entries format look like
    // OS X (ip.port):  tcp4       0      0  127.0.0.1.6263         *.*                    LISTEN
    // Linux (ip:port): tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      -
    const lineData = line.trim().split(/ +/g);
    const portSpec = lineData[3];
    if (!portSpec) return false;

    const match = portSpec.match(/^.*[.:]([^\s]+)/);
    if (match) {
      const listenPort = match[1];
      return parseInt(listenPort, 10) === parseInt(port, 10);
    }
    return false;
  });
}
function _isPortInUseRaw(port) {
  const tcpFiles = ['/proc/net/tcp', '/proc/net/tcp6'];
  if (_.some(tcpFiles, fileExists)) {
    return _.some(tcpFiles, (f) => {
      if (!fileExists(f)) {
        return false;
      }
      const result = read(f);
      return _.some(result.split('\n'), (line) => {
        /* eslint-disable max-len */
        // File entries look like:
        //
        // sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode
        // 0: 00000000:0016 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 418276 1 0000000000000000 100 0 0 10 0
        //
        // With local_address being IP:PORT in hexadecimal
        /* eslint-enable max-len */
        const lineData = line.trim().split(/ +/g);
        const portSpec = lineData[1];
        if (!portSpec) return false;
        const match = portSpec.match(/^.*:(.{4})$/);
        if (match) {
          const listenPort = match[1];
          return parseInt(listenPort, 16) === parseInt(port, 10);
        }
        return false;
      });
    });
  } else {
    throw new Error('Cannot parse used ports from /proc/net');
  }
}

/**
 * Check if the given port is in use
 * @function $net~isPortInUse
 * @param {string} port - Port to check
 * @returns {boolean} - Whether the port is in use or not
 * @example
 * // Check if the port 8080 is already in use
 * $net.isPortInUse(8080);
 * => false
 */
function isPortInUse(port) {
  _validatePortFormat(port);
  if (isPlatform('unix')) {
    if (isPlatform('linux') && fileExists('/proc/net')) {
      return _isPortInUseRaw(port);
    } else if (isInPath('netstat')) {
      return _isPortInUseNetstat(port);
    } else {
      throw new Error('Cannot check port status');
    }
  } else {
    throw new Error('Port checking not supported on this platform');
  }
}

module.exports = isPortInUse;
