'use strict';

const XMLSerializer = require('xmldom').XMLSerializer;
const _ = require('../../lodash-extra.js');
const write = require('../write.js');
const loadXmlFile = require('./common.js').loadXmlFile;
const getXmlNode = require('./common.js').getXmlNode;

/**
 * Set value in XML file
 *
 * @function $file~xml/set
 * @param {string} file - XML File to write the value to
 * @param {string} element - XPath expression to the node element to be modified
 * @param {string} attribute - Attribute to be set (null will delete the node in the provided path
 * and create a text node in its place)
 * @param {string} value - New value for the node or attribute (null will delete it). Providing a function this
 * will be passed the node and document objects
 * @param {Object} [options]
 * @param {string} [options.encoding=utf-8] - Encoding used to read the file
 * @param {boolean} [options.retryOnENOENT=true] - Retry if writing files because of the parent directory
 * does not exists
 * @throws Will throw an error if the path is not a file
 * @throws Will throw an error if the XPath is not valid
 * @throws Will throw an error if the XPath is not found
 * @example
 * // Set a single attribute 'charset' in the node '//html/head/meta' section to 'UTF-8'
 * $file.xml.set('index.html', '//html/head/meta, 'charset', 'UTF-8');
 * @example
 * // Delete a single attribute 'charset' in the node '//html/head/meta' section
 * $file.xml.set('index.html', '//html/head/meta, 'charset', null);
 */
/**
 * Set value in XML file
 *
 * @function $file~xml/set²
 * @param {string} file - XML File to write the value to
 * @param {string} element - XPath expression to the node element to be modified
 * @param {Object} attributeMapping - attribute-value map to set in the file
 * @param {Object} [options]
 * @param {string} [options.encoding=utf-8] - Encoding used to read the file
 * @param {boolean} [options.retryOnENOENT=true] - Retry if writing files because of the parent directory
 * does not exists
 * @throws Will throw an error if the path is not a file
 * @throws Will throw an error if the XPath is not valid
 * @throws Will throw an error if the XPath is not found
 * @example
 * // Set several attributes in a XML node
 * $file.xml.set('index.html', '//html/head/meta, {name: 'myname', version: '1.0'});
 * @example
 * // Create text nodes
 * $file.xml.set('index.html', '//html/head/title, 'My Page');
 * @example
 * // Use functions to operate with the XML node objects
 * $file.xml.set('index.html', '//html/head/title, 'My Page');
 */
function _xmlFileSet(file, element, attributeMapping, options) {
  const doc = loadXmlFile(file, options);
  const node = getXmlNode(doc, element);
  const result = [];

  if (_.isReallyObject(attributeMapping)) {
    _.each(attributeMapping, (value, attributeName) => {
      if (_.isFunction(value)) {
        result.push(value(node.getAttributeNode(attributeName)));
      } else {
        if (_.isNull(value)) {
          node.removeAttribute(attributeName);
        } else {
          node.setAttribute(attributeName, value);
        }
      }
    });
  } else {
    // still being able to provide the node to pass the node to a given function
    if (_.isFunction(attributeMapping)) {
      result.push(attributeMapping(node, doc));
    } else {
      if (node.hasChildNodes()) {
        let i = 0;
        const nNodes = node.childNodes.length;
        while (i < nNodes) {
          node.removeChild(i);
          i++;
        }
      }
      // if attribute and value == null, delete the node
      if (_.isNull(attributeMapping)) {
        node.parentNode.removeChild(node);
      } else {
        node.appendChild(doc.createTextNode(attributeMapping));
      }
    }
  }
  write(file, new XMLSerializer().serializeToString(doc), options);
  if (!_.isEmpty(result)) {
    return (result.length > 1) ? result : result[0];
  }
}

function xmlFileSet(file, element) {
  const args = Array.from(arguments).slice(2);
  const defaultOptions = {encoding: 'utf-8', retryOnENOENT: true};
  let attributeMapping = {};
  let options = null;
  if (args.length >= 2
      && (_.isString(args[0])
          && (_.isString(args[1]) || _.isFunction(args[1]) || _.isNull(args[1])))) {
    // xml.set signature = xml.set(file, element, attribute, value, options)
    attributeMapping[args[0]] = args[1];
    options = _.sanitize(args[2], defaultOptions);
  } else if (_.isReallyObject(args[0]) || _.isFunction(args[0]) || _.isString(args[0]) || _.isNull(args[0])) {
    // xml.set signature = xml.set(files, element, {attribute: value}, options)
    // xml.set signature = xml.set(files, element, text_node_value, options)
    // xml.set signature = xml.set(files, element, function, options)
    attributeMapping = args[0];
    options = _.sanitize(args[1], defaultOptions);
  } else {
    throw new Error('Invalid xml.set function call');
  }
  return _xmlFileSet(file, element, attributeMapping, options);
}

module.exports = xmlFileSet;
