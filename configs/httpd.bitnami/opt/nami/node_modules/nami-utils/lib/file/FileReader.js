'use strict';
const fs = require('fs-extra');
const _ = require('../lodash-extra.js');
const fileSize = require('./size.js');
const fileExists = require('./exists.js');

class FileReader {
  constructor(file, options) {
    options = _.opts(options, {seekEnd: false});
    this.file = file;
    this.offset = 0;
    this._fd = null;
    if (options.seekEnd) {
      this.seek(0, 'end');
    }
  }

  _ensureOpened() {
    if (!this._fd) {
      this._fd = fs.openSync(this.file, 'r');
    }
  }
  seek(offset, origin) {
    origin = origin || 'start';
    let newPosition = null;
    let currentSize = null;
    switch (origin) {
      case 'current':
        newPosition = this.offset + offset;
        break;
      case 'start':
        newPosition = offset;
        break;
      case 'end':
        currentSize = fileSize(this.file);
        newPosition = (currentSize !== -1 ? currentSize : 0) + offset;
        break;
      default:
        throw new Error(`Unknown origin ${origin}`);
    }
    this.offset = Math.max(newPosition, 0);
  }

  read(options) {
    options = _.opts(options, {reset: false, size: -1, tail: -1, ignoreNonExistent: true});
    if (options.ignoreNonExistent && !fileExists(this.file)) return '';
    this._ensureOpened();
    if (options.reset) this.offset = 0;
    const fullSize = fileSize(this.file);
    const availableToRead = fullSize - this.offset;
    const bytesToRead = options.size !== -1 ? Math.min(availableToRead, options.size) : availableToRead;
    if (bytesToRead === 0) return '';
    const buffer = new Buffer(bytesToRead);
    const readBytes = fs.readSync(this._fd, buffer, 0, bytesToRead, this.offset);
    this.offset += readBytes;
    const data = buffer.toString();
    if (options.tail === -1) {
      return data;
    } else {
      return _.takeRight(data.split('\n'), 10).join('\n');
    }
  }
}

module.exports = FileReader;
