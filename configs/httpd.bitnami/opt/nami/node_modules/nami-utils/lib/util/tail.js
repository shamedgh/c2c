'use strict';

const fs = require('fs-extra');
const _ = require('../lodash-extra.js');
const Tail = require('tail').Tail;
const fileSize = require('../file/size.js');

// TODO: This only follow by lines. We may be interested in following any non-line-break-terminated chunk.
// Use fs.watchFile for that

/**
 * Tail a file (so its last lines)
 * @function $util~tail
 * @param {sting} file - File to tail
 * @param {Object} [options]
 * @param {boolean} [options.follow=false] - Wait for file changes to display instead of finish after the first read
 * @param {number} [options.lines=10] - Number of lines to display
 * @param {number} [options.offset=null] - Position from where to start reading (in bytes).
 * If not configured, it will be autocalculated based on the lines to print
 * @param {function} [options.callback=null] - Callback to execute for each line of data read. If 'follow' is enabled,
 * it defaults to console.log
 * @returns {string|object} - The read data or the 'tail' object if 'follow' is enabled. The tail object allows
 * finishing the tail at any point using tail.unwatch()
 * @example
 * // Print the last 10 lines of '/foo/bar/sample'
 * $util.tail('/foo/bar/sample');
 * @example
 * // Tail and follow the 'logs/access_log' file and print each line in capital letters
 * $util.tail('logs/access_log', {follow: true, callback: function(line) {
 *   console.log(line.toUpperCase());
 * }});
 */
function tail(file, options) {
  options = _.opts(options, {follow: false, lines: 10, callback: null, offset: null});
  let fileData = '';
  let callback = _.isFunction(options.callback) ? options.callback : null;
  // It makes no sense to do follow without a callback
  if (options.follow && !callback) callback = console.log;

  let lines = parseInt(options.lines, 10);
  if (!_.isFinite(lines) || lines < 0) lines = 10;
  const size = fileSize(file);
  if (size === -1) {
    return '';
  }
  let fd = null;
  try {
    fd = fs.openSync(file, 'r');
    const bytesToRead = Math.min(size, (1024 * lines));
    const offset = Math.max(options.offset || 0, size - bytesToRead);
    const buffer = new Buffer(bytesToRead);
    const bytesRead = fs.readSync(fd, buffer, 0, bytesToRead, offset);
    fileData = _.takeRight(
      buffer.slice(0, bytesRead)
        .toString().trim()
        .split('\n'),
      lines
    ).join('\n');
    if (callback) _.each(fileData.split('\n'), line => callback(line));
  } catch (e) {
    /* not empty */
  } finally {
    fs.closeSync(fd);
  }
  if (options.follow) {
    const tailObj = new Tail(file);
    tailObj.on('line', (d) => {
      callback(d);
    });
    tailObj.on('error', (d) => {
      callback(d);
    });
    return tailObj;
  } else {
    return fileData;
  }
}

module.exports = tail;
