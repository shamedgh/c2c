'use strict';

const _ = require('lodash');
const util = require('util');
const common = require('./common.js');
const config = require('./config.js');

class BaseLogger {
  constructor(options) {
    options = _.defaults(options || {}, {
      level: 'info', prefix: null, silenced: false
    });

    _.each(config.levels, (data, key) => { this._addLevel(key); });

    Object.defineProperty(this, 'level', {
      set: function(newValue) {
        this._updateLogLevel(newValue);
      },
      get: function() {
        return this._level;
      },
      configurable: true
    });

    this.prefix = options.prefix;
    this.level = options.level;
    this.silenced = options.silenced;
  }
  _normalizeLogLevel(levelId) {
    if (_.isString(levelId) && _.has(config.levels, levelId.toLowerCase())) {
      return levelId.toLowerCase();
    } else {
      throw new Error(`Canot find log level ${levelId}`);
    }
  }

  _updateLogLevel(value) { this._level = this._normalizeLogLevel(value); }

  _addLevel(key) {
    const that = this;
    this[key.toLowerCase()] = function() {
      return that.log.apply(that, [key].concat(_.toArray(arguments)));
    };
  }

  _getLevelText(level, options) {
    options = _.defaults(options || {}, {justify: true});
    const text = level.toUpperCase();
    return options.justify ? common.justifyText(text, 5) : text;
  }
  _getPrefixText() { return common.justifyText(this.prefix); }

  _format(level, msg) {
    return _.compact([this._getPrefixText(), this._getLevelText(level), msg]).join(' ');
  }

  isEnabled() { return !this.silenced; }

  _shouldLog(level) {
    return this.isEnabled() && config.levels[level] <= config.levels[this.level];
  }
  _print(/* msg, levelData */) {}

  log(level /* , args */) {
    const key = this._normalizeLogLevel(level);
    if (!this._shouldLog(key)) { return; }

    const msg = this._format(
      key,
      (util.format).apply(null, _.toArray(arguments).slice(1))
    );
    this._print(key, msg);
  }
}

module.exports = BaseLogger;

