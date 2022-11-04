'use strict';

const fs = require('fs-extra');
const child = require('child_process');
const _ = require('../lodash-extra.js');

const dummyLogger = require('../common.js').dummyLogger;
const createTempFile = require('./temporary-files.js').createTempFile;
const runningAsRoot = require('./running-as-root.js');
const signals = require('./constants.js').signals;

function _argsArrayToString(arr) {
  return arr.map((arg) => {
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }).join(' ');
}

/**
 * Run Program
 * @function $os~runProgram
 * @param {string} program - Program to execute
 * @param {string|string[]} arguments - Arguments. It can be either a string or an arry containing them.
 * @param {Object} [options]
 * @param {string} [options.logCommand=true] - Log command execution
 * @param {boolean} [options.runInBackground=false] - Run the command in the background
 * @param {boolean} [options.retrieveStdStreams=false] - Returns a hash describing the process stdout, stderr and
 * exit code.
 * @param {boolean} [options.ignoreStdStreams=false] - Completely ignore standard streams
 * @param {boolean} [options.detachStdStreams=false] - Save standard streams to temporary files while executing
 * the program (solves some processes hanging because of unclosed streams)
 * @param {string} [options.runAs=null] - User used to run the program as. Only when running as admin.
 * @param {string} [options.stdoutFile=null] - File used to store program stdout when running in background or
 * when detaching streams
 * @param {string} [options.stdoutFileMode=a+] - Flags used to open the stdoutFile
 * @param {string} [options.stderrFile=null] - File used to store program stderr when running in background or
 * when detaching streams
 * @param {string} [options.stderrFileMode=a+] - Flags used to open the stderrFile
 * @param {string} [options.cwd] - Working directory
 * @param {Object} [options.env={}] - Object containing extra environment variables to be made accesible to the running
 * process
 * @param {string} [options.input=null] - Value passed as stdin to the spawned process
 * @param {Object} [options.logger=null] - Optional logger to use when enabling logCommand. If not provided,
 * the global package logger will be used
 *
 * @example
 * // returns "Hello World"
 * runProgram('echo', 'Hello World')
 * @example <caption>Pass arguments as array</caption>
 * // returns mysql databases
 * runProgram('mysql', ['-uroot', '-pbitnami', '-e', 'show databases'], {runAs: 'mysql'});
 * @example <caption>Pass arguments as string</caption>
 * // returns mysql databases
 * runProgram('mysql', '-uroot -pbitnami -e "show databases"'], {runAs: 'mysql'});
 */
function runProgram(program, args, opts) {
  if (arguments.length === 2 && _.isReallyObject(args)) {
    opts = arguments[1];
    args = [];
  }
  opts = _.opts(opts, {
    runInBackground: false, logCommand: true, logger: null,
    detachStdStreams: false, retrieveStdStreams: false, ignoreStdStreams: false,
    runAs: null, uid: null, gid: null,
    stdoutFile: null, stdoutFileMode: 'a+', stderrFile: null, stderrFileMode: 'a+'
  });

  const cmdLogger = opts.logger || dummyLogger;
  args = args || [];
  const uid = opts.uid || opts.runAs;
  const cwd = process.cwd();
  const spawnOpts = {};
  let stdoutFile = null;
  let stderrFile = null;
  const stdFilesData = {
    stderr: {file: opts.stderrFile, cleanUp: !!opts.stderrFile},
    stdout: {file: opts.stdoutFile, cleanUp: !!opts.stdoutFile}
  };
  let r = null;
  let stdResult = {};
  let detachStdStreams;

  const stdoutFileMode = opts.stdoutFile ? (opts.stdoutFileMode || 'a+') : 'w+';
  const stderrFileMode = opts.stderrFile ? (opts.stderrFileMode || 'a+') : 'w+';

  let stdio = null;

  spawnOpts.env = _.opts(opts.env, process.env);
  ['encoding', 'detached', 'input'].forEach(function(k) {
    if (k in opts) {
      spawnOpts[k] = opts[k];
    }
  });
  if (opts.ignoreStdStreams) {
    detachStdStreams = false;
  } else if (opts.stdoutFile || opts.stderrFile) {
    detachStdStreams = true;
  } else {
    detachStdStreams = opts.detachStdStreams;
  }

  if (opts.runInBackground) {
    if (opts.stdoutFile !== null || opts.stderrFile !== null) {
      const stdout = opts.stdoutFile ? fs.openSync(opts.stdoutFile, stdoutFileMode) : 'ignore';
      const stderr = opts.stderrFile ? fs.openSync(opts.stderrFile, stderrFileMode) : 'ignore';
      spawnOpts.stdio = ['ignore', stdout, stderr];
    } else {
      spawnOpts.stdio = 'ignore';
    }
    spawnOpts.detached = true;
  } else if (opts.ignoreStdStreams) {
    spawnOpts.stdio = 'ignore';
  } else if (detachStdStreams) {
    stdoutFile = opts.stdoutFile || createTempFile();
    stderrFile = opts.stderrFile || createTempFile();
    stdio = ['ignore', fs.openSync(stdoutFile, stdoutFileMode), fs.openSync(stderrFile, stderrFileMode)];
    spawnOpts.stdio = stdio;
  }

  /* eslint-disable no-use-before-define */
  if (runningAsRoot()) {
    // Because of the dependency loop, we need to do this here
    const getUid = require('./user-management').getUid;
    const getGid = require('./user-management').getGid;
    if (uid) {
      spawnOpts.uid = getUid(uid);
    }
    if (opts.gid) {
      spawnOpts.gid = getGid(opts.gid);
    }
  }
  /* eslint-enable no-use-before-define */

  if (opts.cwd) {
    try {
      process.chdir(opts.cwd);
      spawnOpts.cwd = opts.cwd;
    } catch (e) {
      // Do nothing
    }
  }
  if (opts.logCommand) cmdLogger.trace(`[runProgram] Executing: ${program} ${args}`);
  try {
    if (Array.isArray(args)) {
      if (opts.runInBackground && _.last(args).toString().trim() !== '&') {
        let strArgs = _argsArrayToString(_.union([program], args));
        strArgs += ' &';
        const callArgs = ['-c', strArgs];
        if (opts.logCommand) {
          cmdLogger.trace3(`[runProgram] Executing internal command: '/bin/sh' ${JSON.stringify(callArgs)}`);
        }
        r = child.spawnSync('/bin/sh', callArgs, spawnOpts);
      } else {
        if (opts.logCommand) {
          cmdLogger.trace3(`[runProgram] Executing internal command: ${program} ${JSON.stringify(args)}`);
        }
        r = child.spawnSync(program, args, spawnOpts);
      }
    } else {
      if ((program !== null) && (program !== undefined)) {
        args = `${program} ${args}`;
      }
      if (opts.runInBackground && !args.match(/\s+&$/)) args += ' &';
      const callArgs = ['-c', args];
      if (opts.logCommand) {
        cmdLogger.trace3(`[runProgram] Executing internal command: '/bin/sh' ${JSON.stringify(callArgs)}`);
      }
      r = child.spawnSync('/bin/sh', callArgs, spawnOpts);
    }
  } finally {
    if ('cwd' in opts) {
      process.chdir(cwd);
    }
  }
  if (r.error) {
    stdResult = {code: 1, stdout: '', stderr: r.error, child: r};
  } else {
    stdResult = {code: r.status, stderr: '', stdout: '', child: r};
    if (detachStdStreams) {
      _.each({stderr: stderrFile, stdout: stdoutFile}, (file, key) => {
        try {
          stdResult[key] = fs.readFileSync(file, 'utf-8');
        } catch (e) {
          stdResult[key] = '';
        }
        if (stdFilesData[key].cleanup) {
          try {
            fs.unlinkSync(file);
          } catch (e) { /* not empty */ }
        }
      });
    } else {
      if (opts.ignoreStdStreams || opts.runInBackground) {
        stdResult.stderr = (r.status === 0) ? '' : 'Error executing program';
        stdResult.stdout = '';
      } else {
        stdResult.stderr = r.stderr.toString();
        stdResult.stdout = r.stdout.toString();
      }
    }
  }
  // spawn does not return an exit code if its process is killed.
  // Early versions of node simply set that to 0, while newer use null. We want to support both.
  // The below code mimics bash behavior
  if (r.signal != null && _.has(signals, r.signal) && (stdResult.code === 0 || stdResult.code === null)) {
    stdResult.code = 128 + signals[r.signal];
    if (stdResult.stderr === '') {
      stdResult.stderr = 'Terminated\n';
    }
  }

  if (opts.logCommand) {
    cmdLogger.trace2(`[runProgram] RESULT: ${JSON.stringify(_.pick(stdResult, 'code', 'stderr', 'stdout'))}`);
  }
  if (opts.retrieveStdStreams) {
    // We skip child for now. We should make it configureable
    return _.pick(stdResult, ['code', 'stdout', 'stderr']);
  } else {
    if (stdResult.code !== 0) {
      let result = stdResult.stderr || '';
      if (result.toString().trim().length === 0) {
        result = `Program exited with exit code ${stdResult.code}`;
      }
      throw (new Error(result));
    } else {
      return stdResult.stdout;
    }
  }
}

module.exports = runProgram;
