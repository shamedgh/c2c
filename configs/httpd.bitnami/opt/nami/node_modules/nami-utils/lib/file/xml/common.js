'use strict';

const DOMParser = require('xmldom').DOMParser;
const xpath = require('xpath');
const _ = require('../../lodash-extra.js');
const exists = require('../exists.js');
const isFile = require('../is-file.js');
const read = require('../read.js');

function loadXmlFile(file, options) {
  if (!exists(file)) {
    throw new Error(`File ${file} does not exist`);
  } else if (!isFile(file)) {
    throw new Error(`File ${file} is not a file`);
  }

  const doc = new DOMParser().parseFromString(read(file, {encoding: options.encoding}));
  if (_.isUndefined(doc)) {
    throw new Error(`File ${file} is not a valid XML file`);
  }
  return doc;
}

function getXmlNode(doc, nodePath) {
  let node;
  try {
    node = xpath.select1(nodePath, doc);
  } catch (e) {
    throw new Error(`The provided XML path ${nodePath} is not valid`);
  }

  if (_.isUndefined(node)) {
    throw new Error(`Path ${nodePath} not found in XML file`);
  }
  return node;
}

module.exports = {loadXmlFile, getXmlNode};
