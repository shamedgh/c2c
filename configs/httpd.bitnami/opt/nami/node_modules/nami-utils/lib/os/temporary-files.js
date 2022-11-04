'use strict';

const fs = require('fs-extra');
const path = require('path');
const _ = require('../lodash-extra.js');
const constants = require('../constants.js');
const tmpDir = constants.paths.tmpDir;

const filesToCleanUp = [];
let cleanUpSetup = false;

function cleanUp() {
  _.each(filesToCleanUp, (f) => {
    try {
      fs.removeSync(f);
    } catch (e) {
      // Emppty
    }
  });
}
if (!cleanUpSetup) {
  process.on('exit', cleanUp);
  cleanUpSetup = true;
}

/**
 * Get temporary file path (it is not actually created)
 * @function $os~getTempFile
 * @private
 * @param {string} name - File name
 * @returns {string} - File path under the system temporary directory
 * @example
 * // Get tempory file path named 'foo'
 * $os.getTempFile('foo');
 * => '/tmp/foo'
 */
function getTempFile(name) {
  return path.join(tmpDir, name);
}

function _getUniqueName() {
  let f = null;
  do {
    f = getTempFile(`${Date.now()}${Math.random()}`);
  } while (fs.existsSync(f));
  return f;
}

function _createTemporaryPath(creatorFn, deleteOnExit) {
  const tempPath = _getUniqueName();
  creatorFn(tempPath);
  if (deleteOnExit) filesToCleanUp.push(tempPath);
  return tempPath;
}

/**
 * Create temporary file
 * @function $os~createTempFile
 * @param {Object} [options]
 * @param {boolean} [options.cleanup=true] - Mark the file to be cleaned up on exit
 * @returns {string} - Temporary file created
 * @example
 * // Create a temporary file that will be deleted at exit
 * $os.createTempFile();
 * // => '/tmp/1453824062535.702'
 * @example
 * // Create a temporary file but do not automatically clean it up at exit
 * $os.createTempFile({cleanup: false});
 * // => '/tmp/1453461306625.4946'
 */
function createTempFile(options) {
  options = _.opts(options, {cleanup: true});
  return _createTemporaryPath((f) => fs.writeFileSync(f, ''), options.cleanup);
}

/**
 * Create temporary directory
 * @function $os~createTempDir
 * @param {Object} [options]
 * @param {boolean} [options.cleanup=true] - Mark the directory to be cleaned up on exit
 * @returns {string} - Temporary directory created
 * @example
 * // Create a temporary directory that will be deleted at exit
 * $os.createTempDir();
 * // => '/tmp/1453474785995.4712'
 * @example
 * // Create a temporary directory but do not automatically clean it up at exit
 * $os.createTempDir({cleanup: false});
 * // => '/tmp/1453824141131.3015'
 */
function createTempDir(options) {
  options = _.opts(options, {cleanup: true});
  return _createTemporaryPath(fs.mkdirSync, options.cleanup);
}

module.exports = {createTempFile, createTempDir, getTempFile};

