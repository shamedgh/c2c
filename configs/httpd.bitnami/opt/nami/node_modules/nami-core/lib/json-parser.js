'use strict';

const jsonlint = require('jsonlint');
const nfile = require('nami-utils/file');

class JsonParser {
  static isJSON(file) {
    const data = nfile.read(file);
    try {
      JSON.parse(data);
    } catch (e) {
      return false;
    }
    return true;
  }
  static parse(file) {
    try {
      return jsonlint.parse(nfile.read(file));
    } catch (e) {
      throw new Error(`Error loading ${file}: ${e.message}`);
    }
  }
}

module.exports = JsonParser;
