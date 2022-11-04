'use strict';

const ConsoleLogger = require('./console-logger.js');
const FileLogger = require('./file-logger.js');
const BaseLogger = require('./base-logger.js');
const _ = require('lodash');

class Logger extends BaseLogger {
  constructor(options) {
    super(options);
    options = _.defaults(
      options || {}, {
        prefix: null,
        logFile: null,
        fileLogLevel: this.level,
        consoleLogLevel: this.level,
        prefixColor: 'white',
        nocolor: false
      });

    this._transports = {
      console: new ConsoleLogger({
        level: options.consoleLogLevel,
        prefix: options.prefix,
        prefixColor: options.prefixColor,
        nocolor: options.nocolor
      }),
      file: new FileLogger({
        level: options.fileLogLevel,
        prefix: options.prefix,
        file: options.logFile
      })
    };
  }

  // Directly modifying the 'level' attribute will override the internal loggers
  _updateLogLevel(value) {
    super._updateLogLevel(value);
    _.each(this._transports, t => {
      if (t) {
        t.level = value;
      }
    });
  }

  log() {
    const args = _.toArray(arguments);
    _.each(this._transports, t => t.log.apply(t, args));
  }
}

module.exports = Logger;
