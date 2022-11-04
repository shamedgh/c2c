'use strict';
const _ = require('lodash');

const Logger = require('./logger.js');

class DelegatedLogger extends Logger {
  constructor(delegatedLogger, options) {
    options = _.defaults(options || {}, {level: delegatedLogger.level});
    if (!delegatedLogger) {
      throw new Error('You must provide a logger to delegate to');
    }

    super(options);

    this._delegatedLogger = delegatedLogger;
    if (delegatedLogger._transports.file) {
      this._transports.file = delegatedLogger._transports.file;
    }

    this.level = options.level;
  }
  _updateLogLevel(value) {
    super._updateLogLevel(value);
    // This gets invoked in the parent constructor so we may not yet have access
    // to the delegatedLogger
    if (this._delegatedLogger) { this._delegatedLogger.level = value; }
  }
}

module.exports = DelegatedLogger;
