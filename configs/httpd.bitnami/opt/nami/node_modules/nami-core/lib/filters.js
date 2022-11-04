'use strict';

const _ = require('nami-utils/lodash-extra.js');
const crypto = require('crypto');

class Filter {
  constructor() {
    this.applied = false;
    this.reason = null;
    this.type = this.constructor.name;
  }
  unfilter(value) {
    this.applied = false;
    return value;
  }
  filter(opt, value) {
    this.applied = false;
    return value;
  }
}

class CryptFilter extends Filter {
  constructor(options) {
    super(options);
    options = _.opts(options, {password: null});
    let _password = options.password;
    Object.defineProperty(this, 'password', {
      enumerable: false,
      set: function(val) {
        _password = val;
      },
      get: function() {
        return _password;
      }
    });
  }

  filter(value) {
    this.applied = false;
    this.reason = null;
    if (!this.password) return value;
    try {
      const res = this.encrypt(JSON.stringify(value));
      this.applied = true;
      return res;
    } catch (e) {
      return value;
    }
  }

  unfilter(value) {
    this.applied = false;
    this.reason = null;
    if (!this.password) return value;
    try {
      const res = JSON.parse(this.decrypt(value));
      this.applied = true;
      return res;
    } catch (e) {
      this.reason = 'Cannot decrypt. Invalid Password?';
      return '';
    }
  }

  encrypt(text) {
    const cipher = crypto.createCipher('aes-256-gcm', this.password);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return new Buffer(JSON.stringify({
      content: encrypted,
      tag: tag.toString('Base64')
    })).toString('Base64');
  }
  decrypt(data) {
    const encrypted = JSON.parse(new Buffer(data, 'Base64').toString());
    const decipher = crypto.createDecipher('aes-256-gcm', this.password);
    decipher.setAuthTag(new Buffer(encrypted.tag, 'Base64'));
    let decrypted = decipher.update(encrypted.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

exports.Filter = Filter;
exports.CryptFilter = CryptFilter;
