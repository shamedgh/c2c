'use strict';

const _ = require('lodash');
const fs = require('fs');
const openLogFile = require('./common.js').openLogFile;
const BaseLogger = require('./base-logger.js');

class FileLogger extends BaseLogger {
  constructor(options) {
    options = _.defaults(options || {}, {file: null});
    super(options);
    this._logFileFd = null;
    let _filename = null;
    Object.defineProperty(this, 'file', {
      enumerable: true,
      get: () => _filename,
      set: filename => {
        if (filename) { this._logFileFd = openLogFile(filename); }
        _filename = filename;
      }
    });
    this.file = options.file;
  }
  _shouldLog(level) { return this._logFileFd !== null && super._shouldLog(level); }
  _print(key, msg) { fs.writeSync(this._logFileFd, `${msg}\n`); }
  _format(level, msg) { return `[${new Date()}] ${super._format(level, msg)}`; }
}

module.exports = FileLogger;
