'use strict';
const _ = require('lodash');

const config = require('./config.js');
const colorize = require('./common.js').colorize;

const BaseLogger = require('./base-logger.js');

class ConsoleLogger extends BaseLogger {
  constructor(options) {
    options = _.defaults(options || {}, {prefixColor: 'white', nocolor: false});
    super(options);
    this.nocolor = options.nocolor;
    this.prefixColor = options.prefixColor;
  }
  _format(level, msg, options) {
    options = _.defaults(options || {}, {colorize: true});
    const shouldColorize = !this.nocolor && options.colorize;

    let prefixText = this._getPrefixText();
    let levelText = this._getLevelText(level);

    if (shouldColorize) {
      prefixText = colorize(prefixText, this.prefixColor || 'white');
      levelText = colorize(levelText, config.colors[level]);
    }
    return _.compact([prefixText, levelText, msg]).join(' ');
  }

  _print(level, msg) {
    if (level === 'error') {
      console.error(msg);
    } else {
      console.log(msg);
    }
  }
}

module.exports = ConsoleLogger;
