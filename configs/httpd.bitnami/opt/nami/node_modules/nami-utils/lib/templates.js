'use strict';
/** @namespace $hb */

const hb = require('handlebars');
const fnWrapping = require('./function-wrapping.js');
const _ = require('./lodash-extra.js');
const read = require('./file/read.js');
const write = require('./file/write.js');

function Templates(globalOpts) {
  if (!(this instanceof Templates)) {
    return new Templates(globalOpts);
  }
  const obj = function(options) { return new Templates(options); };

  globalOpts = _.opts(globalOpts, {
    hu: null, wrapperList: null, settings: {},
    silentSanitizations: true, sanitizeUnknown: true,
    logger: null, helpers: {}
  });
  const globalSettings = globalOpts.settings;
  const globalHelpers = _.extend({}, hb.helpers, globalOpts.helpers);
  const wrapperHandler = new fnWrapping.WrapperHandler(obj).addWrappers(globalOpts.wrapperList);

  const normalizeFile = function(file) { return wrapperHandler.process(file, 'FileNormalizerWrapper'); };
  const normalizeTemplate = function(file) { return wrapperHandler.process(file, 'PathSearcherWrapper'); };

  /**
   * Render text replacing handlebar references
   * @function $hb~renderText
   * @param {string} template - Template text
   * @param {Object} [data] - Object containing substitutions to perform on the template. By default, it will
   * render the text using $app properties.
   * @param {Object} [options] - Handlebars options
   * @param {string} [options.noEscape=true] - Set to false to HTML escape any content
   * @param {string} [options.compact=false] - Set to true to enable recursive field lookup
   * @returns {string} - The rendered text
   * @example
   * // Returns rendered text
   * $hb.renderText(`
   * [mysqld]
   * port={{port}}
   * basedir={{basedir}}
   * `, {port: 3306, basedir: '/opt/bitnami/mysql'});
   * // => [mysqld]
   *       basedir=/opt/bitnami/mysql
   *       port=3306
   */
  function renderTemplateText(template, data, options) {
    data = _.opts(data, {});
    options = _.opts(options, {noEscape: true, compact: false});
    // TODO: We should support recursively resolving, as in IB
    return hb.compile(template, options)(_.defaults(data, globalSettings), {helpers: globalHelpers});
  }

  /**
   * Render template file
   * @function $hb~render
   * @param {string} template - Template file
   * @param {Object} [data] - Object containing substitutions to perform on the template
   * @param {Object} [options] - Handlebars options
   * @param {string} [options.noEscape=true] - Set to false to HTML escape any content
   * @param {string} [options.compact=false] - Set to true to enable recursive field lookup
   * @returns {string} - The rendered text
   */
  function renderTemplate(templateFile, data, options) {
    return renderTemplateText(read(normalizeTemplate(templateFile)), data, options);
  }
  function renderTemplateTextToFile(template, destFile, data, options) {
    const text = renderTemplateText(template, data, options);
    write(destFile, text, _.pick(options, ['encoding']));
  }

  /**
   * Render template to file
   * @function $hb~renderToFile
   * @param {string} template - Template file
   * @param {string} destination - Destination file
   * @param {Object} [data] - Object containing substitutions to perform on the template. By default, it will
   * render the text using $app properties
   * @example
   * // Writes a rendered file 'my.cnf'
   * $hb.renderToFile('my.cnf.tpl', 'conf/my.cnf');
   */
  function renderTemplateToFile(templateFile, destFile, data, options) {
    renderTemplateTextToFile(read(templateFile), normalizeFile(destFile), data, options);
  }

  wrapperHandler.export({
    renderText: renderTemplateText
  });
  wrapperHandler.exportWrappable({
    render: renderTemplate,
    renderToFile: renderTemplateToFile
  });
  return obj;
}

module.exports = new Templates();
