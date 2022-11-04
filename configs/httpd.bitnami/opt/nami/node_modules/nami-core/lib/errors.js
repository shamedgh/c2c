'use strict';
const _ = require('nami-utils/lodash-extra');

class DetailedError extends Error {
  constructor(msg, details) {
    // If we pass msg to super, the message getter is not used for some reason
    super();
    this.msg = msg;
    this.details = details || '';
  }
  get message() {
    return _.isEmpty(this.details) ? this.msg : `${this.msg}: ${this.details}`;
  }
  set message(val) {
    this.msg = val;
  }
}


module.exports = {DetailedError};
