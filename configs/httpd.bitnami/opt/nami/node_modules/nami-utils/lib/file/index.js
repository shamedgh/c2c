'use strict';

/**
 * @namespace $file
 */
const delegate = require('../delegation.js');

const fnWrapping = require('../function-wrapping.js');
const _ = require('../lodash-extra.js');

module.exports = {
  link: require('./link.js'),
  substitute: require('./substitute.js'),
  relativize: require('./strip-path-prefix.js'),
  sanitize: require('./sanitize.js'),
  listDir: require('./list-dir-contents.js'),
  glob: require('./glob.js'),
  delete: require('./delete.js'),
  prepend: require('./prepend.js'),
  append: require('./append.js'),
  puts: require('./puts.js'),
  stripPath: require('./strip-path-elements.js'),
  walkDir: require('./walk-dir.js'),
  exists: require('./exists.js'),
  size: require('./size.js'),
  matches: require('./matches.js'),
  read: require('./read.js'),
  dirname: require('./dirname.js'),
  basename: require('./basename.js'),
  write: require('./write.js'),
  touch: require('./touch.js'),
  split: require('./split.js'),
  join: require('./join.js'),
  mkdir: require('./mkdir.js'),
  normalize: require('./normalize.js'),
  isLink: require('./is-link.js'),
  isDirectory: require('./is-directory.js'),
  isFile: require('./is-file.js'),
  isFileOrLink: require('./is-file-or-link.js'),
  isBinary: require('./is-binary.js'),
  contains: require('./contains.js'),
  deleteIfEmpty: require('./delete-if-empty.js'),
  isEmptyDir: require('./is-empty-dir.js'),
  copy: require('./copy.js'),
  rename: require('./rename.js'),
  move: require('./rename.js'),
  backup: require('./backup.js'),
  chmod: require('./chmod.js'),
  chown: require('./chown.js'),
  setAttrs: require('./set-attrs.js'),
  getAttrs: require('./get-attrs.js'),
  mtime: require('./mtime.js'),
  permissions: require('./permissions.js'),
  getOwnerAndGroup: require('./get-owner-and-group.js'),
  eachLine: require('./each-line.js'),
  FileReader: require('./FileReader.js'),
  ini: require('./ini/index.js'),
  xml: require('./xml/index.js'),
  yaml: require('./yaml/index.js')
};
_.extend(module.exports, require('./access/index.js'));

module.exports.contextify = function(options) {
  options = _.opts(options, {wrapperList: [], wrapper: null, logger: null});
  options.wrapperList = _.isEmpty(options.wrapperList) ? [options.wrapper] : options.wrapperList;

  const obj = {};

  const wrapperHandler = new fnWrapping.WrapperHandler(obj).addWrappers(options.wrapperList);
  const normalizeFile = function(file) { return wrapperHandler.process(file, 'FileWrapper'); };

  const nonWrapableKeys = ['link', 'relativize', 'sanitize', 'stripPath', 'split', 'join'];
  const specialWrappableKeys = ['rename', 'move', 'ini', 'yaml', 'glob', 'xml'];
  const wrappableKeys = _.keys(_.omit(module.exports, nonWrapableKeys));

  // We will treat the specialWrappableKeys individually
  wrapperHandler.exportWrappable(_.pick(module.exports, _.xor(wrappableKeys, specialWrappableKeys)));

  obj.contextified = wrappableKeys;

  delegate(obj, nonWrapableKeys, module.exports, {readOnly: true});

  // Special cases
  // ini.get and ini.set are in a namespace
  wrapperHandler.exportWrappable(module.exports.ini, {prefix: 'ini'});
  // xml.get and xml.set are in a namespace
  wrapperHandler.exportWrappable(module.exports.xml, {prefix: 'xml'});
  // yaml.get and yaml.set are in a namespace
  wrapperHandler.exportWrappable(module.exports.yaml, {prefix: 'yaml'});

  // rename and its alias 'move' require normalizing both source and destination
  const _renameFile = module.exports.rename;
  function rename(source, destination) {
    return _renameFile(normalizeFile(source), normalizeFile(destination));
  }
  obj.rename = rename;
  obj.move = rename;

  // glob supports setting a cwd, which won't work if the file is automatically
  // expanded
  const _glob = module.exports.glob;
  function glob(filePath, opts) {
    opts = opts || {};
    if (!opts.cwd) filePath = normalizeFile(filePath);
    return _glob(filePath, opts);
  }
  obj.glob = glob;

  return obj;
};
