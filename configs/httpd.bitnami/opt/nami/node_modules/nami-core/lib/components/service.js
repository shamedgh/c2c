'use strict';
const path = require('path');

const Component = require('./component');
const DetailedError = require('../errors.js').DetailedError;
const nu = require('nami-utils');
const nfile = require('nami-utils/file');
const nos = require('nami-utils/os');
const _ = require('nami-utils/lodash-extra');
const $net = require('nami-utils/net');

// Take a look at bluepill. Lot of things in common
// https://github.com/bluepill-rb/bluepill

// http://refspecs.linuxbase.org/LSB_3.1.0/LSB-Core-generic/LSB-Core-generic/iniscrptact.html
// If the status action is requested, the init script will return the following exit status codes.
//
// 0 program is running or service is OK
// 1 program is dead and /var/run pid file exists
// 2 program is dead and /var/lock lock file exists
// 3 program is not running
// 4 program or service status is unknown

/**
 * Constructs an instance of a Service
 * @class
 * @augments Component
 * @param {object} spec - Spec definition of the component. It corresponds to the loaded JSON
 * file of the serialized package.
 * @param {object} [options]
**/
class Service extends Component {
  constructor(spec, opts) {
    super(spec, opts);
    this.service = _.opts(spec.service, {
      runInBackground: true, detachStreams: false,
      stdoutFile: null, stderrFile: null,
      username: this.owner.username,
      group: this.owner.group,
      wait: 0, timeout: 30,
      workingDirectory: null, env: {}
    });
    const serviceCmdOpts = _.opts(this.service, {command: null, jsCommand: null});
    _.each(['start', 'stop', 'restart', 'status'], cmd => {
      // We use {deep: true} so the environment is extended
      this.service[cmd] = _.opts(this.service[cmd], serviceCmdOpts, {deep: true});
    });
  }
  _execServiceCommand(command, options) {
    options = _.defaults(options || {waitFor: null, runInForeground: false});
    let result = {};

    const cmdOpts = this.subst(this.service[command]);
    const wait = this.subst(cmdOpts.wait);
    const timeout = this.subst(cmdOpts.timeout);
    if (this.installedAsRoot && !nos.runningAsRoot()) {
      throw new Error(`You have to be root to call ${command}`);
    }

    const resolvedEnv = {};
    if (!_.isEmpty(cmdOpts.env)) {
      _.each(cmdOpts.env, (value, key) => {
        resolvedEnv[this.subst(key)] = this.subst(value);
      });
    }

    const fileReaders = {};

    if (this.logFile) {
      fileReaders.log = new nfile.FileReader(this.logFile, {seekEnd: true});
    }

    if (cmdOpts.jsCommand) {
      if (!_.has(this.exports, cmdOpts.jsCommand)) {
        throw new Error(`Cannot find jsCommand '${cmdOpts.jsCommand}' for '${command}'`);
      }
      result = this.exports[cmdOpts.jsCommand].apply(this, [cmdOpts]) || {};
      // The returned result must be an object with format:
      // {code: 1, stdout: 'starting...', stderr: 'Port is taken'}
      if (!_.has(result, 'code')) {
        this.warn(`Provided jsCommand '${cmdOpts.jsCommand}' for ${command} did not returned a proper format`);
      }
    } else if (!_.isEmpty(cmdOpts.command)) {
      _.each({
        stderr: cmdOpts.stderrFile,
        stdout: cmdOpts.stdoutFile
      }, (f, key) => {
        fileReaders[key] = new nfile.FileReader(
          this.subst(f) || nos.createTempFile(),
          {seekEnd: true}
        );
      });

      const username = this.subst(cmdOpts.username);
      const group = this.subst(cmdOpts.group);
      const cwd = this.subst(cmdOpts.workingDirectory) || this.installdir;
      _.each(fileReaders, reader => {
        const dirname = path.dirname(reader.file);
        if (!this._nfile.exists(dirname)) {
          nfile.mkdir(dirname, {username: username, group: group});
        }
      });
      if (options.runInForeground) {
        const cmdResult = this._nos.runProgram(
          null,
          this.subst(cmdOpts.command, {}, {recursive: true}),
          {
            retrieveStdStreams: true, detached: false,
            runInBackground: false,
            detachStdStreams: cmdOpts.detachStreams,
            stdoutFile: fileReaders.stdout.file,
            stderrFile: fileReaders.stderr.file,
            env: resolvedEnv, uid: username, gid: group, cwd: cwd
          }
        );
        result.code = cmdResult.code;
        result.stderr = cmdResult.stderr;
        result.stdout = cmdResult.stdout;
      } else {
        const cmdResult = this._nos.runProgram(
          null,
          this.subst(cmdOpts.command, {}, {recursive: true}),
          {
            retrieveStdStreams: true, detached: true,
            runInBackground: cmdOpts.runInBackground,
            detachStdStreams: cmdOpts.detachStreams,
            stdoutFile: fileReaders.stdout.file,
            stderrFile: fileReaders.stderr.file,
            env: resolvedEnv, uid: username, gid: group, cwd: cwd
          }
        );
        result.code = cmdResult.code;
        result.stderr = cmdResult.stderr;
        result.stdout = cmdResult.stdout;
      }
      // TODO: For now, this is sync. If we move to call the command
      // asynchronously, we should read the streams after the wait
    } else {
      throw new Error(`Don't know how to ${command} ${this.id}`);
    }

    if (options.waitFor) {
      // It makes no sense to wait if the call failed
      if (result.code !== 0) {
        throw new Error(`Unknown error calling ${command} ${this.id}: ${result.stderr}`);
      }

      if (!this.waitFor(options.waitFor, {timeout: timeout, wait: wait})) {
        // Try to get extra data from the log
        if (fileReaders.log) {
          const lastLogEntries = fileReaders.log.read({tail: 10});
          if (!_.isEmpty(lastLogEntries)) this.trace(`Last log entries:\n${lastLogEntries}`);
        }
        if (!options.runInForeground) {
          if (fileReaders.stderr) {
            result.stderr += fileReaders.stderr.read();
          }
          if (fileReaders.stdout) {
            result.stdout += fileReaders.stdout.read();
          }
        }
        throw new DetailedError(`Unable to ${command} ${this.id}`, result.stderr);
      }
    }

    this.trace(`code: ${result.code}`);
    this.trace(`stdout:\n${result.stdout}`);
    this.trace(`stderr:\n${result.stderr}`);

    return result;
  }
  _stopUsingPidFile(options) {
    options = _.opts(options, {timeout: this.timeout || 30, wait: 0});
    if (!this.pidFile) throw new Error('The service did not provide a PID file');

    const pid = this.getPid();
    if (pid) {
      // TODO, should we do this first? this.nos.kill(pid, 'SIGQUIT');
      nos.kill(pid, 'SIGTERM');
    }
    if (!this.waitFor('stopped', _.pick(options, ['timeout', 'wait']))) {
      nos.kill(pid, 'SIGKILL');
      if (!this.waitFor('stopped', {timeout: 2})) {
        throw new Error(`Unable to stop ${this.id}`);
      }
    }
    // If we stopped it, we clean the pid
    nfile.delete(this.pidFile);
  }
  _builtinExports() {
    const foregroundOpts = {options: {foreground: {defaultValue: false, type: 'boolean'}}};
    return _.opts({
      start: foregroundOpts,
      restart: foregroundOpts,
      stop: {},
      log: {},
      status: {}
    }, super._builtinExports());
  }
  _preInstallChecks() {
    if (!_.isEmpty(this.service.ports)) {
      _.each(this.service.ports, portSpec => {
        const port = this.subst(portSpec);
        if ($net.isPortInUse(port)) {
          throw new Error(`Port ${port} is in use. Please stop the service using it`);
        } else if (!$net.canBindToPort(port)) {
          throw new Error(`Cannot bind to port ${port}. Do you have enough privileges?`);
        }
      });
    }
  }
  _preUninstallation() {
    super._preUninstallation();
    try {
      this.stop();
    } catch (e) {
      this.trace(e.message);
    }
  }

  initialize(options) {
    super.initialize(options);
    this._defineDynamicPathProperties(
      _.pick(this.service, ['logFile', 'socketFile', 'confFile', 'pidFile'])
    );
    // This allows overwitting built-in commands as $app.service.start
    _.each(['start', 'stop', 'restart', 'status'], key => {
      if (_.isFunction(this.service[key])) {
        nu.delegate(this, key, this.service);
      }
    });
  }

  /**
   * Get latest log entries
   * @description Process latest log entries
   * @param {object} [options]
   * @param {number} [options.follow=false] - Wait for file changes to display instead of finish after the first read
   * @param {function} [options.callback=console.log] - Function used to process the read entries
   * @returns {string|object} - The read data or the 'tail' object if 'follow' is enabled. The tail object allows
   * finishing the tail at any point using tail.unwatch()
   */
  log(options) {
    if (_.isEmpty(this.logFile)) return null;
    options = _.opts(options, {follow: false, callback: console.log});
    return nu.util.tail(this.logFile, _.pick(options, ['follow', 'callback']));
  }

  /**
   * Wait for status
   * @description Waits the specified time for the service to be in a certain state
   * @param {string} status - Status to wait for
   * @param {object} [options]
   * @param {number} [options.timeout=30] - Max time to wait to the status
   * @param {number} [options.wait=0] - Extra time to wait after the status is reached
   * @returns true if the service entered the state or false if it timed out
   */
  waitFor(status, options) {
    options = _.defaults(options || {}, {timeout: 30, wait: 0});
    // 2 seconds
    const step = 2;
    for (let i = 0; i <= options.timeout; i = i + step) {
      const isRunning = this.isRunning();
      if ((status === 'running' && isRunning) || (status === 'stopped' && !isRunning)) {
        // If we succeeded waiting, we wait the fixed extra delay. This allows
        // for example, to give a service to fully initialize after the pid file is
        // written
        nu.util.sleep(options.wait);
        return true;
      }
      nu.util.sleep(step);
    }
    return false;
  }
  _formatStatusObject(statusName) {
    let isRunning = null;
    let code = null;
    let statusOutput = null;
    switch (statusName) {
      case 'running':
        isRunning = true;
        code = 0;
        statusOutput = `${this.id} is running`;
        break;
      case 'stopped':
        isRunning = false;
        code = 1;
        statusOutput = `${this.id} not running`;
        break;
      default:
        isRunning = null;
        statusName = 'unknown';
        statusOutput = `${this.id} is in an unknown state`;
        code = -1;
    }
    return {
      isRunning: isRunning, code: code,
      statusName: statusName, statusOutput: statusOutput
    };
  }

  /**
   * Get the service status
   * @returns The status object
   * @example
   * // Status of a running service
   * $app.status()
   * // => {
   * //      isRunning: true, statusName: 'running',
   * //      statusOutput: 'Foo is running', code: 0
   * //     }
   * @example
   * // Status of a stopped service
   * $app.status()
   * // => {
   * //      isRunning: false, statusName: 'stopped',
   * //      statusOutput: 'Foo not running', code: 1
   * //     }
   * @example
   * // Status of a service in unknown state
   * $app.status()
   * // => {
   * //      isRunning: null, statusName: 'unknown',
   * //      statusOutput: 'Foo is in an unknown state', code: -1
   * //     }
   */
  status() {
    let statusName = 'unknown';
    if (this._definesServiceCommand(this.service.status)) {
      const result = this._execServiceCommand('status', {runInForeground: true});
      statusName = result.code === 0 ? 'running' : 'stopped';
    } else if (this.pidFile !== null) {
      statusName = this.getPid() !== null ? 'running' : 'stopped';
    }
    return this._formatStatusObject(statusName);
  }
  _start() {
    const username = this.subst(this.service.start.username || this.service.username);
    const group = this.subst(this.service.start.group || this.service.group);

    if (!_.isEmpty(this.logFile) && !nfile.exists(path.dirname(this.logFile))) {
      nfile.mkdir(nfile.dirname(this.logFile), {username: username, group: group});
    }
    if (!_.isEmpty(this.pidFile) && !nfile.exists(path.dirname(this.pidFile))) {
      nfile.mkdir(nfile.dirname(this.pidFile), {username: username, group: group});
    }
    try {
      this._execServiceCommand('start', {waitFor: 'running'});
    } catch (e) {
      if (_.isEmpty(e.details)) {
        if (!_.isEmpty(this.pidFile)) {
          if (!this._nfile.exists(this.pidFile)) {
            e.details = `Cannot find pid file '${this.pidFile}'.`;
          } else if (this.getPid() === null) {
            e.details = `Pid file '${this.pidFile}' was found but either no proper PID` +
              ' was found or no process is running there.';
          }
        }
      }
      throw e;
    }
    return this._formatStatusObject('running');
  }

  /**
   * Start the service
   * @returns The new status
   */
  start(options) {
    options = _.opts(options, {foreground: false});
    const currentStatus = this.status();
    let result = null;
    if (currentStatus.isRunning) {
      result = _.extend(currentStatus, {msg: `${this.id} is already running`});
    } else {
      result = _.extend(this._start(), {msg: `${this.id} started`});
    }
    if (options.foreground) {
      this.log({follow: true});
    }
    return result;
  }

  _stop() {
    if (this._definesServiceCommand(this.service.stop)) {
      this._execServiceCommand('stop', {waitFor: 'stopped'});
    } else if (this.pidFile) {
      const wait = this.subst(this.service.stop.wait);
      const timeout = this.subst(this.service.stop.timeout);
      this._stopUsingPidFile({wait: wait, timeout: timeout});
    } else {
      throw new Error(`Don't know how to stop service ${this.id}`);
    }
    return this._formatStatusObject('stopped');
  }

  /**
   * Stop the service
   * @returns The new status
   */
  stop() {
    const currentStatus = this.status();
    if (!currentStatus.isRunning) {
      return _.extend(currentStatus, {msg: `${this.id} is already stopped`});
    } else {
      return _.extend(this._stop(), {msg: `${this.id} stopped`});
    }
  }
  _definesServiceCommand(data) {
    return !_.isEmpty(data.command) || !_.isEmpty(data.jsCommand);
  }
  _restart() {
    if (this._definesServiceCommand(this.service.restart)) {
      this._execServiceCommand('restart', {waitFor: 'running'});
    } else {
      this._stop();
      this._start();
    }
    return _.extend(this._formatStatusObject('running'), {msg: `${this.id} restarted`});
  }

  /**
   * Restart the service
   * @returns The new status
   */
  restart(options) {
    options = _.opts(options, {foreground: false});
    const currentStatus = this.status();
    let result = null;
    if (currentStatus.isRunning) {
      result = this._restart();
    } else {
      result = this.start();
    }
    if (options.foreground) {
      this.log({follow: true});
    }
    return result;
  }

  /**
   * Get service PID
   * @returns The service PID or null if no pid file was configured or
   * it does not exists
   */
  getPid() {
    if (_.isEmpty(this.pidFile) || !nfile.isFile(this.pidFile)) {
      return null;
    }
    const pidFileContent = nfile.read(this.pidFile).trim();
    // Some pid files (postgres) include extra info after the pid so we just try to get the first non-empty line
    const pid = parseInt(_.first(pidFileContent.split('\n')).trim(), 10);
    return nos.pidFind(pid) ? pid : null;
  }
  /**
   * Service is running
   * @returns true if the service is running, false otherwise
   */
  isRunning() {
    return this.status().isRunning;
  }
}

module.exports = Service;
