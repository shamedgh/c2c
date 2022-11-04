'use strict';

const _ = require('../../lodash-extra.js');
const loadXmlFile = require('./common.js').loadXmlFile;
const getXmlNode = require('./common.js').getXmlNode;

/**
 * Get value from XML file
 *
 * @function $file~xml/get
 * @param {string} file - XML File to read the value from
 * @param {string} element - XPath expression to the element from which to read the attribute (null if text node)
 * @param {string} attribute - Attribute to get the value from (if empty, will return the text of the node element)
 * @param {Object} [options]
 * @param {string} [options.encoding=utf-8] - Encoding used to read the file
 * @param {string} [options.default=''] - Default value if key not found
 * @throws Will throw an error if the path is not a file
 * @throws Will throw an error if the XPath is not valid
 * @throws Will throw an error if the XPath is not found
 * @example
 * // Get 'charset' atribute of node //html/head/meta
 * $file.ini.get('index.html', '//html/head/meta', 'charset');
 * // => 'UTF-8'
 */
function xmlFileGet(file, element, attributeName, options) {
  options = _.sanitize(options, {encoding: 'utf-8', retryOnENOENT: true, default: null});

  const doc = loadXmlFile(file, options);
  const node = getXmlNode(doc, element);

  let value;
  if (_.isEmpty(attributeName)) {
    value = _.map(node.childNodes, 'nodeValue');
  } else {
    value = node.getAttribute(attributeName);
    // Always return an array
    value = [value];
  }
  return _.isUndefined(value) ? options.default : value;
}

module.exports = xmlFileGet;
