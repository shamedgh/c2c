'use strict';

const path = require('path');
const _ = require('../lodash-extra.js');

/**
 * Get a path from a group of elements
 * @function $file~join
 * @param {string[]|...string} components - Components of the path
 * @returns {string} - The path
 * @example
 * // Get a path from an array
 * $file.join(['/foo', 'bar', 'sample'])
 * // => '/foo/bar/sample'
 * @example
 * // Join the application installation directory with the 'conf' folder
 * $file.join($app.installdir, 'conf')
 * // => '/opt/bitnami/mysql/conf'
 */
function join() {
  const components = _.isArray(arguments[0]) ? arguments[0] : _.toArray(arguments);
  return path.join.apply(null, components).replace(/(.+)\/+$/, '$1');
}

module.exports = join;
