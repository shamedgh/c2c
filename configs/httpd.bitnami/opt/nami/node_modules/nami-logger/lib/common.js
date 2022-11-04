'use strict';

const _ = require('lodash');
const fs = require('fs');
const colors = require('colors/safe');
const allowedColors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'grey'];

const handledLogs = [];
function closeLogs() {
  _.each(handledLogs, function(fd) {
    try {
      fs.fsyncSync(fd);
      fs.closeSync(fd);
    } catch (e) {
      console.log(e);
    }
  });
}

function justifyText(text, length) {
  if (!text) return '';
  length = length || 7;
  return text.length > length ? text.slice(0, length) : _.padEnd(text, length);
}

function openLogFile(f) {
  const fd = fs.openSync(f, 'w');

  if (_.isEmpty(handledLogs)) {
    process.on('exit', closeLogs);
  }
  handledLogs.push(fd);
  return fd;
}

function colorize(msg, color) {
  if (_.has(colors, color) && _.includes(allowedColors, color)) {
    return colors[color](msg);
  } else {
    return colors.white(msg);
  }
}

module.exports = {justifyText, colorize, openLogFile};
