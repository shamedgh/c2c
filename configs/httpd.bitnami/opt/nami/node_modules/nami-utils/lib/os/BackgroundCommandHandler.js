'use strict';

const _ = require('../lodash-extra.js');
const deasync = require('deasync');
const fs = require('fs-extra');

class BackgroundCommandHandler {
  constructor(spawnHandler, options) {
    options = _.opts(options, {
      onExit: _.noop, onStdout: _.noop, onStderr: _.noop, onData: _.noop,
      stdoutFile: null, stderrFile: null, stdoutFileMode: 'a+', stderrFileMode: 'a+',
      maxLength: 10000000, autodetachAfter: null
    });

    this.onExit = options.onExit;
    this.onData = options.onData;
    this.maxLength = options.maxLength;
    this._hardLimit = this.maxLength * 2;
    this.running = true;
    this.exitCode = null;
    this.killSignal = null;
    this.attached = false;

    this._handler = spawnHandler;
    this.pid = this._handler.pid;
    this._eventCallbacks = [];

    if (options.stdoutFile) {
      const stdoutFh = fs.createWriteStream(options.stdoutFile, {flags: options.stdoutFileMode});
      this._handler.stdout.pipe(stdoutFh);
    }
    if (options.stderrFile) {
      const stderrFh = fs.createWriteStream(options.stderrFile, {flags: options.stderrFileMode});
      this._handler.stderr.pipe(stderrFh);
    }

    this._handler.stdout.unref();
    this._handler.stderr.unref();

    this.attach();
    this._handler.unref();

    this._streams = {
      stdout: {
        pos: 0,
        size: 0,
        buffers: [],
        callback: options.onStdout,
        data: ''
      },
      stderr: {
        pos: 0,
        size: 0,
        buffers: [],
        callback: options.onStderr,
        data: ''
      }
    };
    if (options.autodetachAfter) {
      setTimeout(() => this.detach(), options.autodetachAfter * 1000).unref();
    }
  }
  _registerToEvent(emitter, event, cb) {
    emitter.on(event, cb);
    this._eventCallbacks.push({emitter: emitter, event: event, callback: cb});
  }

  get stdout() {
    return this._read('stdout', {position: 0}).toString();
  }
  get stderr() {
    return this._read('stderr', {position: 0}).toString();
  }
  get code() {
    return this.exitCode;
  }

  attach() {
    if (this.attached) return;

    this._registerToEvent(this._handler.stdout, 'data', buff => this._write('stdout', buff));
    this._registerToEvent(this._handler.stderr, 'data', buff => this._write('stderr', buff));
    this._registerToEvent(this._handler, 'close', (code, killSignal) => this._terminatedProcess(code, killSignal));
    this.attached = true;
  }

  detach() {
    if (!this.attached) return;

    _.each(this._eventCallbacks, () => {
      const registration = this._eventCallbacks.shift();
      registration.emitter.removeListener(registration.event, registration.callback);
    });
    this.attached = false;
  }
  _terminatedProcess(code, killSignal) {
    this.running = false;
    this.terminated = killSignal !== null;
    this.killSignal = killSignal;
    this.exitCode = code;
    this.onExit(_.pick(this, ['terminated', 'killSignal', 'exitCode']));
    this.detach();
  }
  _write(channel, buff) {
    const stream = this._streams[channel];
    // Depending on if the handler was an exec or a spawn, we get a buffer or a string
    buff = Buffer.isBuffer(buff) ? buff : new Buffer(buff);
    if (buff.length > 0) {
      const size = buff.length;
      stream.size += size;
      stream.buffers.push(buff);
      stream.callback(buff);
      this.onData(buff, channel);
      this.cleanUpIfNeeded(stream);
    }
  }

  cleanUpIfNeeded(stream) {
    if (stream.size >= this._hardLimit) {
      while (stream.size > this.maxLength) {
        const b = stream.buffers.shift();
        stream.size -= b.length;
        stream.pos = Math.max(stream.pos - b.length, 0);
      }
    }
  }

  _read(channel, options) {
    options = _.defaults(options || {}, {position: null, size: Infinity});
    const stream = this._streams[channel];
    const offset = options.position !== null ? options.position : stream.pos;
    const fullBuffer = Buffer.concat(stream.buffers);
    const availableSize = fullBuffer.length - offset;
    const size = Math.min(availableSize, options.size);
    stream.pos += size;
    return fullBuffer.slice(offset, offset + size);
  }

  wait(options) {
    options = _.opts(options, {timeout: 30, detach: false, throwOnTimeout: false});
    let time = 0;
    const timeout = options.timeout * 1000;
    const increment = 500;
    while (this.running === true) {
      if (time > timeout) {
        if (options.throwOnTimeout) {
          throw new Error(`Exceeded timeout of ${options.timeout} seconds waiting for the command to exit.`);
        } else {
          break;
        }
      }
      deasync.sleep(increment);
      time += increment;
    }
    if (options.detach) this.detach();
    return _.extend(this.read(), {handler: this});
  }
  read(options) {
    return {
      stdout: this._read('stdout', options).toString(),
      stderr: this._read('stderr', options).toString(),
      code: this.exitCode,
      pid: this.pid,
      terminated: this.terminated,
      running: this.running
    };
  }
  kill(signal) {
    return this._handler.kill(signal);
  }
}

module.exports = BackgroundCommandHandler;
