'use strict';

const spawn = require('./spawn.js');

/**
 * Execute a command string
 * @function $os~exec
 * @description Executes a command string in background, returning a handler to it, or optionally waiting for it
 * to finish by polling its state
 * @param {string} command - String containing the command and arguments to execute
 * @param {Object} [options]
 * @param {string} [options.runAs=null] - User used to run the program as. Only when running as admin.
 * @param {string} [options.stdoutFile=null] - File used to store program stdout when running in background of when
 * detaching streams
 * @param {string} [options.stdoutFileMode=a+] - Flags used to open the stdoutFile
 * @param {string} [options.stderrFile=null] - File used to store program stderr when running in background of when
 * detaching streams
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
 * $os.exec('echo "Hello World"', {wait: true}).stdout
 * // => 'Hello World\n'
 */
function exec(command, options) {
  const args = ['-c', `exec ${command}`];
  return spawn('/bin/sh', args, options);
}

module.exports = exec;
