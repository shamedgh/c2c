'use strict';

const _ = require('../lodash-extra.js');
const childProcess = require('child_process');
const runningAsRoot = require('./running-as-root.js');
const getUid = require('./user-management').getUid;
const getGid = require('./user-management').getGid;

const BackgroundCommandHandler = require('./BackgroundCommandHandler.js');

/**
 * Execute a command with arguments in array format
 * @function $os~spawnAsync
 * @private
 * @description Executes a command string in background, returning a handler to it, or optionally waiting for it to
 * finish by polling its state
 * @param {string} command - String containing the command and arguments to execute
 * @param {Object} [options]
 * @param {string} [options.runAs=null] - User used to run the program as. Only when running as admin.
 * @param {string} [options.stdoutFile=null] - File used to store program stdout when running in background of
 * when detaching streams
 * @param {string} [options.stdoutFileMode=a+] - Flags used to open the stdoutFile
 * @param {string} [options.stderrFile=null] - File used to store program stderr when running in background of
 * when detaching streams
 * @param {string} [options.stderrFileMode=a+] - Flags used to open the stderrFile
 * @param {string} [options.cwd] - Working directory
 * @param {string|number} [options.uid=null] - Id or name of the user identity of the process
 * @param {string|number} [options.gid=null] - Id or name of the group identity of the process
 * @param {Object} [options.env={}] - Object containing extra environment variables to be made accesible to the
 * running process
 * @param {function} [options.onData=_.noop] - Callback to execute when receiving either stdout or stderr data
 * from the process
 * @param {function} [options.onStdout=_.noop] - Callback to execute when receiving stdout data from the process
 * @param {function} [options.onStderr=_.noop] - Callback to execute when receiving stderr data from the process
 * @param {function} [options.onExit=_.noop] - Callback to execute when the process finishes its execution
 * @param {number} [options.timeout=30] - Timeout in seconds to wait when enabling 'options.wait'
 * @param {boolean} [options.wait=false] - Whether to wait or not for the command to finish
 *
 * @example
 * // returns "Hello World"
 * const handler = spawn('echo', ['Hello World']);
 * handler.wait().stdout
 * // => 'Hello World\n'
 *
 * @example <caption>Find files in background</caption>
 * const handler = spawn('find', ['/tmp', '-name', '*.txt']);
 * handler.stdout
 * // => '/tmp/a.txt\n'
 * handler.stdout
 * // => '/tmp/a.txt\n/tmp/b.txt\n'
 * // handler.running
 * // => false
 */
function spawn(program) {
  let options = null;
  let args = null;
  if (arguments.length > 1 && _.isArray(arguments[1])) {
    options = arguments[2];
    args = arguments[1];
  } else {
    args = [];
    options = arguments[1];
  }
  options = _.opts(options, {
    onExit: _.noop, onStdout: _.noop, onStderr: _.noop, onData: _.noop, wait: false,
    timeout: 30, throwOnTimeout: false, uid: null, gid: null, runAs: null,
    stdoutFile: null, stderrFile: null, stdoutFileMode: 'a+', stderrFileMode: 'a+', env: {}
  });

  const spawnOpts = {detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: _.opts(options.env, process.env)};

  const cwd = process.cwd();

  /* eslint-disable no-use-before-define */
  if (runningAsRoot()) {
    const uid = options.uid || options.runAs;
    const gid = options.gid;
    if (uid) {
      spawnOpts.uid = getUid(uid);
    }
    if (gid) {
      spawnOpts.gid = getGid(gid);
    }
  }
  /* eslint-enable no-use-before-define */

  if (options.cwd) {
    try {
      process.chdir(options.cwd);
      spawnOpts.cwd = options.cwd;
    } catch (e) {
      // Do nothing
    }
  }

  let child = null;
  try {
    child = childProcess.spawn(program, args, spawnOpts);
  } finally {
    process.chdir(cwd);
  }
  const handler = new BackgroundCommandHandler(child, _.extend(options, {stdoutFile: options.stdoutFile}));

  if (options.wait) {
    return handler.wait({timeout: options.timeout, throwOnTimeout: options.throwOnTimeout, detach: true});
  } else {
    return handler;
  }
}

module.exports = spawn;
