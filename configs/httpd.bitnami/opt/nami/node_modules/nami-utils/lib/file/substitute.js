'use strict';

const _ = require('../lodash-extra.js');
const XRegExp = require('xregexp');
const isFile = require('./is-file.js');
const isLink = require('./is-link.js');
const isDirectory = require('./is-directory.js');
const isBinary = require('./is-binary.js');
const size = require('./size.js');
const read = require('./read.js');
const write = require('./write.js');
const listDirContents = require('./list-dir-contents.js');
const globFile = require('./glob.js');
const _escapeRegExp = require('./common.js').escapeRegExp;

function _substituteInText(text, substitutions, options) {
  options = _.opts(options, {onSuccess: null});
  let matched = false;
  let newText = text;
  _.each(substitutions, function(substitution) {
    if (substitution.matches(text)) {
      matched = true;
      const oldText = newText;
      newText = substitution.replace(newText);
      if (_.isFunction(options.onSuccess)) {
        options.onSuccess(oldText, newText);
      }
    }
  });
  if (!matched) {
    return null;
  } else {
    return newText;
  }
}

function _massFileSubstitute(files, substitutions, options) {
  files = _.uniq(files);
  _.each(files, function(file) {
    if (options.ignoreBigFiles && size(file) > options.bigFileThreshold) return;
    if (options.skipBinaries && isBinary(file)) return;
    const text = read(file, _.pick(options, 'encoding'));
    const nexText = _substituteInText(text, substitutions, options);
    if (nexText !== null) {
      write(file, nexText, _.pick(options, ['encoding', 'retryOnENOENT']));
    } else if (options.abortOnUnmatch) {
      throw new Error(`File ${file} did not match any of the provided substitutions`);
    }
  });
}

class Substitution {
  constructor(pattern, replacement, options) {
    options = _.opts(options, {type: 'auto', ignoreCase: false, multiline: true, dotall: true, global: true});
    if (_.some([pattern, replacement], _.isUndefined)) {
      throw new Error('Invalid substitute function call: "pattern" and "value" should be provided.');
    }
    this.replacement = replacement;
    this.pattern = null;
    const type = options.type;
    let regExpFlags = '';
    // XRegExp uses this naming and usage
    /* eslint-disable new-cap */
    if (_.isRegExp(pattern)) {
      const source = pattern.source;
      regExpFlags += pattern.toString().replace(/.*\/(.*)/g, '$1');
      if (options.global && regExpFlags.indexOf('g') === -1) regExpFlags += 'g';
      if (options.dotall) regExpFlags += 's';
      this.pattern = XRegExp(source, regExpFlags);
    } else {
      if (options.ignoreCase) regExpFlags += 'i';
      if (options.multiline) regExpFlags += 'm';
      if (options.global) regExpFlags += 'g';
      if (type === 'regexp') {
        if (options.dotall) regExpFlags += 's';
        this.pattern = XRegExp(pattern, regExpFlags);
      } else {
        this.pattern = XRegExp(_escapeRegExp(pattern), regExpFlags);
      }
    }
    /* eslint-enable new-cap */
  }
  matches(text) {
    return text.match(this.pattern);
  }
  replace(text) {
    return text.replace(this.pattern, this.replacement);
  }
}

/**
 * Subtstitute paremeters in files
 * @function $file~substitute
 * @param {string|string[]} files
 * @param {Object} substitutions - key (pattern)/value (substitution) pairs to use as substitutions
 * @param {Object} [options]
 * @param {boolean} [options.recursive=false] - List directory contents in files recursively
 * @param {boolean} [options.abortOnUnmatch=false] - If enabled, an error will be thrown if any of the files in the
 * list does not match any of the provided patterns or no file is resolved for substitution
 * @param {boolean} [options.followSymLinks=false] - Follow symbolic links pointing to files
 * @param {string} [options.cwd=null] - Working directory where to invoke the function
 * @param {string[]} [options.exclude=[]] - List of patterns to exclude from the list of files to substitute
 * @param {string} [options.type=auto] - Type of matching to use: 'regexp', 'glob' or 'auto'. Using auto will consider
 * glob matching when the pattern is a string and regexp matching is the pattern is a RegExp object
 * @param {boolean} [options.global=true] - If enabled, replaces all occurrences of the pattern.
 * @param {boolean} [options.ignoreCase=false] - Case insensitive matching
 * @param {boolean} [options.multiline=true] - In regexp type, multiline matching
 * @param {boolean} [options.dotall=false] - In regexp type, make dot match new lines
 * @param {boolean} [options.ignoreBigFiles=true] - Ignore files bigger than the 'bigFileThreshold'. Usefull to avoid
 * trying to load huge files into memory for replacement
 * @param {number} [options.bigFileThreshold=50000000] - Files with size over this value are considered big.
 * @param {boolean} [options.skipBinaries=true] - Do not perform substitutions on binary files.
 * @example
 * // Substitute a single string
 * $file.substitute('my.txt', 'This is a text', 'This is a substituted text');
 * @example
 * // Substitute a single regexp and throw an error if it is not present
 * $file.substitute('conf/myapache.conf', /VirtualHost\s*_default_:80/, `VirtualHost _default_:${$app.httpPort}`,
 *   {abortOnUnmatch: true});
 * @example
 * // Substitute several regular expresions just once
 * $file.substitute('conf/myapache.conf', [{
 *   pattern: /VirtualHost\s*_default_:80/, value: `VirtualHost _default_:${$app.httpPort}`
 * }, {
 *   pattern: /DocumentRoot.+/, value:`Documentroot "${$app.installdir}/htdocs"`
 * }], {abortOnUnmatch: true, type: 'regexp', global: false});
 */
function substitute(files) {
  const defaultOptions = {
    recursive: false, abortOnUnmatch: false, followSymLinks: false, cwd: null,
    exclude: [], ignore: [], type: 'auto', global: true,
    ignoreCase: false, multiline: true, dotall: false,
    ignoreBigFiles: true, bigFileThreshold: 50000000, skipBinaries: true
  };
  const substitutions = [];
  let options = null;
  if (arguments.length >= 3 && _.isString(arguments[1]) || _.isRegExp(arguments[1])) {
    // substitute signature = substitute(files, key, value, options)
    const key = arguments[1];
    const replacement = arguments[2];
    options = _.sanitize(arguments[3], defaultOptions);
    substitutions.push(new Substitution(key, replacement, options));
  } else if (_.isReallyObject(arguments[1])) {
    // substitute signature = substitute(files, {key: value}, options)
    options = _.sanitize(arguments[2], defaultOptions);
    _.each(arguments[1], function(replacement, pattern) {
      substitutions.push(new Substitution(pattern, replacement, options));
    });
  } else if (_.isArray(arguments[1])) {
    // substitute signature = substitute(files, [{pattern: key, value: value}], options)
    // Makes convenient adding patterns as regexp literals (you cannot directly use a pattern as an object key)
    options = _.sanitize(arguments[2], defaultOptions);
    _.each(arguments[1], function(definition) {
      const pattern = definition.pattern;
      const replacement = definition.value;
      const replacementOpts = _.opts(definition, options);
      substitutions.push(new Substitution(pattern, replacement, replacementOpts));
    });
  } else {
    throw new Error('Invalid substitute function call');
  }
  let filesToReplace = [];
  // options.ignore is deprecated in favor of options.exclude
  if (!_.isEmpty(options.ignore) && _.isEmpty(options.exclude)) options.exclude = options.ignore;
  const globOptions = {cwd: options.cwd, exclude: options.exclude, absolutize: true};
  _.each(globFile(files, globOptions), function(file) {
    if (!options.followSymLinks && isLink(file)) {
      return;
    }
    if (isFile(file, {acceptLinks: true})) {
      filesToReplace.push(file);
    } else if (isDirectory(file, {acceptLinks: false}) && options.recursive) {
      filesToReplace = filesToReplace.concat(listDirContents(file,
        {onlyFiles: true, exclude: options.exclude, followSymLinks: false, listSymLinks: options.followSymLinks}));
    } else {
      // ignore it
    }
  });
  if (filesToReplace.length > 0) {
    _massFileSubstitute(filesToReplace, substitutions, options);
  } else if (options.abortOnUnmatch) {
    throw new Error('Files to substitute resolved to an empty list');
  }
}


module.exports = substitute;
