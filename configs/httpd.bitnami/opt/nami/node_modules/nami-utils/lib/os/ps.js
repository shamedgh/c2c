'use strict';

const xregexp = require('xregexp');
const fs = require('fs-extra');
const _ = require('../lodash-extra.js');
const runProgram = require('./run-program.js');
const isPlatform = require('./is-platform.js');
const read = require('../file/read.js');
const findUser = require('./user-management/find-user.js');


function _getProcesses() {
  return _.filter(_.map(fs.readdirSync('/proc'), (i) => parseInt(i, 10)), (i) => !_.isNaN(i));
}

function _getProcessInfo(process) {
  if (_.isNumber(process)) {
    try {
      const comm = read(`/proc/${process}/comm`).trim();
      const cmdline = read(`/proc/${process}/cmdline`).replace(/\0/g, ' ').trim();

      const status = read(`/proc/${process}/status`);
      const pattern = xregexp('\\nPid:\\s+(?<pid>[0-9]+)\\nPPid:\\s+(?<ppid>[0-9]+)\\n.*' +
                              '\\nUid:\\s+(?<uid>[0-9]+)\\s+[0-9]+\\s+[0-9]+\\s+[0-9]+\\n', 'gs');
      const parsed = xregexp.exec(status, pattern);
      let userName = null;
      // In some scenarios (docker), mapping the uid to a name may fail, just fallback to use the uid
      // instead of simply failing
      try {
        userName = findUser(parsed.uid).name;
      } catch (e) {
        userName = parsed.uid;
      }
      return {
        user: userName, cmd: comm, full_cmd: cmdline,
        pid: parseInt(parsed.pid, 10), ppid: parseInt(parsed.ppid, 10)
      };
    } catch (e) {
      // because it is not an atomic operation, process may disappear in the middle
      return null;
    }
  } else {
    return null;
  }
}

function _procfsPs() {
  return _.filter(_.map(_getProcesses(), _getProcessInfo), (i) => !_.isNull(i));
}

/* ISTANBUL_IGNORE_IF_NOT_OSX */
function _ps(args, lineProcessor) {
  const output = runProgram('ps', args).trim();
  const result = [];
  _.each(output.split('\n'), line => {
    const process = lineProcessor(line);
    if (!process) return;
    // Normalize pid and ppid to be numbers
    _.each(['pid', 'ppid'], numericField => process[numericField] = parseInt(process[numericField], 10));
    result.push(process);
  });
  return result;
}

/* ISTANBUL_IGNORE_IF_NOT_OSX */
function _osxPs() {
  const fieldsInfo = _.map({user: 'user', pid: 'pid', ppid: 'ppid', cmd: 'comm', full_cmd: 'command'}, (value, key) => {
    return {name: key, specifier: value};
  });

  // Parsing OS X version of ps seems very complicated, you cannot specify a separator
  // but specifying a header is possible. So we will specify a well known header pattern and
  // read each column size to be able to parse the rest
  const spacerLength = 100;
  const spacer = '_'.repeat(spacerLength);
  const specifiersArg = _.map(fieldsInfo, e => `${e.specifier}=${spacer}`).join(',');

  let firstLine = true;
  const sizes = [];
  return _ps(['wwaxo', specifiersArg], line => {
    // Use the first line (the header) to calculate all columns length
    if (firstLine) {
      const re = new RegExp(`(${spacer} *)`, 'g');
      let match = null;
      /* eslint-disable no-cond-assign */
      while ((match = re.exec(line)) !== null) {
        const field = match[1];
        sizes.push(field.length);
      }
      /* eslint-enable no-cond-assign */
      if (sizes.length !== fieldsInfo.length) throw new Error('Cannot parse ps output');
      firstLine = false;
      return null;
    }

    const process = {};
    let startIdx = 0;
    // Split the line using the column sizes
    _.each(sizes, (size, index) => {
      const value = line.slice(startIdx, startIdx + size).trim();
      startIdx += size;
      const key = fieldsInfo[index].name;
      process[key] = value;
    });
    return process;
  });
}

/**
 * Find running porcesses
 * @function $os~ps
 * @param {number|object|function} [filterer] - Without arguments, ps returns all the running processes.
 * The filterer allows selecting a subset.
 * @returns {array|oject} - The list of matching processes, or the requested process object if filterer was a number
 * @example
 * // Find all processes
 * $os.ps();
 * // => [{ user: 'root', pid: 1, ppid: 0, cmd: 'supervisord', full_cmd: '/usr/bin/python /usr/bin/supervisord' },
 *        { user: 'root', pid: 17291, ppid: 1, cmd: 'sshd', full_cmd: '/usr/sbin/sshd -D' },
 *        { user: 'root', pid: 17293, ppid: 1, cmd: 'cron', full_cmd: '/usr/sbin/cron -f -L 15' }]
 *
 * // Find specific pid
 * $ps.ps(17291);
 * // => { user: 'root', pid: 17291, ppid: 1, cmd: 'sshd', full_cmd: '/usr/sbin/sshd -D' }
 *
 * // Find by parent pid:
 * $os.ps({ppid: 1});
 * // => [{ user: 'root', pid: 17291, ppid: 1, cmd: 'sshd', full_cmd: '/usr/sbin/sshd -D' },
 *        { user: 'root', pid: 17293, ppid: 1, cmd: 'cron', full_cmd: '/usr/sbin/cron -f -L 15' }]
 *
 * // Filter using a function
 * $os.ps(process => process.full_cmd.match(/ssh/) && process.user === 'root')
 * // => [{ user: 'root', pid: 17291, ppid: 1, cmd: 'sshd', full_cmd: '/usr/sbin/sshd -D' }]
 */
function ps(filterer) {
  let processes = null;

  if (isPlatform('osx')) {
    processes = _osxPs();
  } else {
    processes = _procfsPs();
  }

  if (!filterer) {
    return processes;
  } else if (_.isFunction(filterer) || _.isReallyObject(filterer)) {
    return _.filter(processes, filterer);
  } else if (_.isNumber(filterer) || _.isString(filterer) && _.isFinite(parseInt(filterer, 10))) {
    return _.find(processes, {pid: parseInt(filterer, 10)}) || null;
  } else {
    throw new Error('Don\'t know how to handle filterer');
  }
}


module.exports = ps;
