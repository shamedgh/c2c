'use strict';
const _ = require('lodash');
const printf = require('printf');
const pluralize = require('pluralize');
const fs = require('fs');

function pickWithDefaults(opts, defaults, aliases) {
  const provided = _.pick(opts || {}, _.keys(defaults));
  _.each(aliases, function(original, alias) {
    if (_.has(opts, alias) && !_.has(opts, original)) provided[original] = opts[alias];
  });
  return _.defaults(provided, defaults);
}

class ParserError extends Error {
  constructor(msg, options) {
    options = _.defaults(options || {}, {showHelp: true});
    super(msg);
    this.showHelp = options.showHelp;
  }
}

class ParserExit extends ParserError {
  constructor(msg, options) {
    options = _.defaults(options || {}, {exitCode: 0});
    super(msg, options);
    this.exitCode = options.exitCode;
  }
}
class ShowHelpException extends ParserExit {
}
class ParserExitOnCallback extends ParserExit {
  constructor(msg, options) {
    options = _.defaults(options || {}, {showHelp: false});
    super(msg, options);
  }
}

class Option {
  _createAliasedAttribute(name, alias, defaultValue) {
    let _data = defaultValue;
    _.each([name, alias], k => {
      Object.defineProperty(this, k, {
        get: () => _data,
        set: val => _data = val
      });
    });
  }
  constructor(opts) {
    opts = opts || {};

    const supportedOptions = {
      name: null,
      alias: null,
      cliName: null,
      type: 'string',
      defaultValue: null,
      required: false,
      value: null,
      allowedValues: null,
      hiddenValidValues: null,
      secret: false,
      description: '',
      detailedDescription: '',
      multivalued: false,
      callback: null,
      exitAfterCallBack: false,
      allowNegated: null,
      envvar: null,
      canBeEmpty: true
    };
    const aliases = {validValues: 'allowedValues', default: 'defaultValue'};
    this.provided = false;
    _.each(aliases, (original, alias) => this._createAliasedAttribute(original, alias, supportedOptions[original]));

    _.extend(this, pickWithDefaults(opts, supportedOptions, aliases));

    if (!this.name) {
      throw new ParserError('You did not provide a name for the option');
    }
    if (this.type === 'choice') {
      if (this.validValues === null) {
        this.validValues = [];
      }
    }

    if (this.defaultValue === null) {
      this.defaultValue = this._getInitialDefaultValue();
    }

    if (this.value === null) {
      this.value = this.defaultValue;
    }
    if (this.allowNegated === null) {
      this.allowNegated = (this.type === 'boolean');
    }
    if (this.envvar !== null && _.has(process.env, this.envvar)) {
      this.setValue(process.env[this.envvar], {silentValidation: true});
    }
  }
  _getInitialDefaultValue() {
    let value = '';
    switch (this.type) {
      case 'boolean':
        value = false;
        break;
      case 'choice':
        value = this.validValues[0];
        break;
      default:
        value = '';
        break;
    }
    return value;
  }
  isEmpty() {
    const value = this.getValue();
    if (this.type === 'boolean') {
      if (value === false) {
        return true;
      } else {
        return false;
      }
    } else {
      return _.isEmpty(value);
    }
  }
  /* eslint-disable no-unused-vars */
  getHelpText(options) {
    options = _.defaults(options || {}, {compact: false});
    let text = '';
    let valuesText = '';
    const optName = this.getCliName();
    if (this.type !== 'boolean') {
      valuesText = ` <${optName}>`;
    }
    text = printf('%-*s %s\n', `--${optName}${valuesText}`, 60, this.detailedDescription || this.description);

    if (this.type !== 'boolean') {
      text += printf('%-*s Default: %s\n', '', 60, `${this.defaultValue}`);
    }
    if (this.type === 'choice') {
      text += printf('%-*s Allowed: %s\n', '', 60, `${this.validValues.join(', ')}`);
    }
    text += '\n';
    return text;
  }
  /* eslint-enable no-unused-vars */
  getCliName() {
    return this.cliName || this.name;
  }
  getValue() {
    let value = this.value;
    if (!this.provided && (value === null || value === '') && this.defaultValue !== null) {
      value = this.defaultValue;
    }
    return value;
  }
  allAllowedValues() {
    return this.validValues.concat(this.hiddenValidValues || []);
  }
  validateValue(val) {
    const cliName = this.getCliName();
    switch (this.type) {
      case 'choice':
        if (_.size(this.allAllowedValues()) === 0) {
          throw new Error(`Choice '${cliName}' does not allow any valid value`);
        } else if (!_.includes(this.allAllowedValues(), val)) {
          throw new Error(`'${val}' is not a valid value for '${cliName}'. Allowed: ${this.validValues.join(', ')}`);
        }
        break;
      default:
        break;
    }
    if (!this.canBeEmpty && _.isEmpty(val)) {
      throw new Error(`'${cliName}' cannot be empty`);
    }
  }
  setValue(val, options) {
    options = _.defaults(options || {}, {silentValidation: false});
    try {
      this.validateValue(val);
    } catch (e) {
      if (options.silentValidation) {
        return;
      } else {
        throw e;
      }
    }
    this.provided = true;
    this.value = val;
    if (this.callback) {
      this.callback(this);
      if (this.exitAfterCallBack) {
        throw new ParserExitOnCallback();
      }
    }
  }
}

class OptionsContainer {
  constructor(options) {
    options = _.defaults(options || {}, {printer: {info: console.log, error: console.error}});
    if (_.isFunction(options.printer)) {
      this._printer = {info: options.printer, error: options.printer};
    } else {
      this._printer = options.printer;
    }
    this._options = {};
    this._aliases = {};
    this._cliNames = {};
    // These are the populated values after parsing
    this.selectedFlags = null;
    this.extraFlags = null;
  }
  reset() {
    this.selectedFlags = null;
    this.extraFlags = null;
  }
  printError(e) {
    const msg = (e instanceof Error) ? e.message : e;
    this._printer.error(msg);
  }
  print(msg) {
    this._printer.info(msg);
  }
  parseFlags(argv, opts) {
    opts = _.defaults(opts || {}, {abortOnUnknown: false, abortIfRequiredAndNotProvided: true});
    const result = {};
    let i = 0;

    result.extraArgs = null;
    result.flags = [];

    while (i < argv.length) {
      const match = argv[i].match(/^--([^=]*)(=(.*))?/);
      if (!match) break;

      const name = match[1];
      let value = null;
      // This tell us to stop looking for more '--'
      if (name === '') {
        i += 1;
        break;
      }
      if (match[2]) {
        value = match[3];
      }
      const optionInfo = this._getOptionInfo(name);
      const option = optionInfo.option;
      if (option) {
        if (option.type === 'boolean') {
          if (value === null) {
            value = true;
          } else {
            if (_.includes(['0', 'false', 'no'], String(value).toLowerCase())) {
              value = false;
            } else {
              value = !!value;
            }
          }
          if (optionInfo.negated) {
            value = !value;
          }
        } else {
          if (value === null) {
            i += 1;
            if (i >= argv.length) {
              throw new ParserError(`Option '${name}' requires a value`);
            } else {
              value = argv[i];
            }
          }
        }
        option.setValue(value);
      } else {
        if (opts.abortOnUnknown) {
          throw new ParserError(this._unknownFlagsMessage([`--${name}`]));
        } else {
          break;
        }
      }
      i += 1;
    }
    if (opts.abortIfRequiredAndNotProvided) {
      const requiredNotProvided = this.getRequiredAndNotProvidedOptions();
      if (_.keys(requiredNotProvided).length !== 0) {
        this.throwRequiredOptionsError(_.map(requiredNotProvided, 'name'));
      }
    }
    result.extraArgs = argv.slice(i) || [];
    return result;
  }
  _unknownFlagsMessage(flags) {
    return `Unknown ${pluralize('flag', flags.length)}: ${flags.join(' ')}`;
  }
  dump() {
    return {flags: this._options};
  }
  throwRequiredOptionsError(optionList) {
    throw new ParserError(`The following options are required: ${optionList.join(',')}`, {showHelp: false});
  }
  _formatText(text) {
    return text;
  }
  getPublicOptions() {
    return _.filter(this._options, {secret: false});
  }
  _normalizeOptDefinition(info) {
    let option = {};
    if (_.isString(info)) {
      option.value = info;
    } else if (_.isBoolean(info)) {
      option.value = info;
      option.type = 'boolean';
    } else {
      option = _.cloneDeep(info);
    }
    return option;
  }
  addOptions(options) {
    const that = this;
    // 'options' may be an array of well formated options:
    // [{name: 'a', defaultValue: true, type: 'boolean'}, {name: 'b', ...}]
    //
    // A hash with name as id:
    // {a: {defaultValue: true,  type: 'boolean'}, b: {...}}
    //
    // A hash with plain values, letting the system deduce the type:
    // { a: true, b: 'sample' }
    _.each(options, (data, name) => {
      const opt = this._normalizeOptDefinition(data);
      if (!opt.name) opt.name = name;

      that.addOption(opt);
    });
  }
  addOption(opts) {
    const opt = new Option(opts);
    this._options[opt.name] = opt;
    if (!!opt.alias) {
      this._aliases[opt.alias] = opt;
    }
    if (!!opt.cliName) {
      this._cliNames[opt.cliName] = opt;
    }

    return opt;
  }
  getProvidedOptions() {
    return this.getFilteredOptions(function(opt) {
      return opt.provided === true;
    });
  }
  getRequiredOptions() {
    return this.getFilteredOptions(function(opt) {
      return opt.required === true;
    });
  }
  getRequiredAndNotProvidedOptions() {
    return this.getFilteredOptions(function(opt) {
      return opt.required === true && opt.provided === false && opt.isEmpty();
    });
  }

  getFilteredOptions(fn) {
    const res = [];
    _.each(this._options, function(opt) {
      if (fn(opt)) {
        res.push(opt);
      }
    });
    return res;
  }
  getFlattenOptions(options) {
    // By default, a built-in help option is added to all parsers. We filter it here.
    options = _.defaults(options || {}, {camelize: false, includeHelp: false, includeOptionFile: false});
    const toExclude = [];
    if (!options.includeHelp) toExclude.push('help');
    if (!options.includeOptionFile && this.optionFileIsEnabled()) toExclude.push('option-file');
    const res = {};
    _.each(this._options, function(opt, key) {
      if (_.includes(toExclude, key)) return;
      const resKey = options.camelize ? _.camelCase(key) : key;
      res[resKey] = opt.getValue();
    });
    return res;
  }
  getOptionValue(name) {
    const opt = this.getOption(name);
    if (opt === null) {
      throw new Error(`Cannot find option ${name}`);
    } else {
      return opt.getValue();
    }
  }
  _getJsonData(jsonFile) {
    let stats = null;
    try {
      stats = fs.statSync(jsonFile);
    } catch (e) {
      throw new Error(`File ${jsonFile} does not exists`);
    }
    if (!stats.isFile(jsonFile)) {
      throw new Error(`'${jsonFile}' is not a file`);
    }
    try {
      const text = fs.readFileSync(jsonFile);
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Error loading JSON file ${e.message}`);
    }
  }
  parseJSON(jsonFile, options) {
    this.parseData(this._getJsonData(jsonFile), options);
  }
  parseData(data, options) {
    options = _.defaults(options || {}, {force: true});
    const that = this;
    _.each(data, function(val, k) {
      const option = that.getOption(k);
      if (!option) {
        throw new ParserError(`Unknown option '${k}'`);
      }
      if (option.provided && !options.force) return;
      option.setValue(val);
    });
  }
  getOption(name) {
    if (_.has(this._options, name)) {
      return this._options[name];
    } else if (_.has(this._aliases, name)) {
      return this._aliases[name];
    } else if (_.has(this._cliNames, name)) {
      return this._cliNames[name];
    } else {
      return null;
    }
  }
  _getOptionInfo(name) {
    let option = this.getOption(name);
    if (option) {
      return {option: option};
    } else {
      const match = name.match(/^no-(.+)$/);
      if (match) {
        option = this.getOption(match[1]);
        if (option && option.type === 'boolean' && option.allowNegated) {
          return {option: option, negated: true};
        }
      }
    }
    return {option: null};
  }
  isFlag(str) {
    return !!str.match(/^--([^=]*)/);
  }
}

class CommandsContainer extends OptionsContainer {
  constructor(options) {
    super(options);
    this._commands = {};
    // These are the populated values after parsing
    this.selectedCommand = null;
  }
  optionFileIsEnabled() {
    return !!this.getOption('option-file');
  }
  enableOptionFile(options) {
    if (this.optionFileIsEnabled()) throw new Error(`--option-file is already enabled`);
    options = _.defaults(options || {}, {description: 'JSON file containing command line options'});
    const optionFileOpts = _.omit(options, 'name');
    const _this = this;
    optionFileOpts.callback = function() {
      _this.parseJSON(this.value);
    };
    optionFileOpts.name = 'option-file';
    this.addOption(optionFileOpts);
  }
  reset() {
    super.reset();
    this.selectedCommand = null;
  }
  addCommand(cmdDefinition, options) {
    options = options || [];

    /* eslint-disable no-use-before-define */
    const cmd = new Command(cmdDefinition);
    /* eslint-enable no-use-before-define */

    this._commands[cmd.name] = cmd;
    cmd.addOptions(options);
    return cmd;
  }
  getPublicCommands() {
    return _.filter(this._commands, {secret: false});
  }
  /* eslint-disable no-unused-vars */
  showHelp(options) {
    options = _.defaults(options || {}, {});
    this.print(this.getHelpText());
  }
  /* eslint-enable no-unused-vars */
  getCommand(name) {
    if (_.has(this._commands, name)) {
      return this._commands[name];
    } else {
      return null;
    }
  }
  parseCommands(argv, options) {
    options = _.defaults(options || {}, {abortOnUnknown: false, silent: false});
    if (argv.length === 0) {
      return null;
    } else if (this.isFlag(argv[0])) {
      if (!options.silent && options.abortOnUnknown) {
        throw new ShowHelpException(this._unknownFlagsMessage(argv), {exitCode: 1});
      }
      return null;
    }
    const cmd = this.getCommand(argv[0]);
    if (cmd) {
      cmd.parse(argv.slice(1));
      this.selectedCommand = cmd;
      if (this.selectedCommand.callback !== null) {
        this.selectedCommand.callback({container: this});
        if (this.selectedCommand.exitAfterCallBack) {
          throw new ParserExitOnCallback();
        }
      }
      return null;
    } else {
      throw new ParserError(`Unknown command '${argv[0]}'`);
    }
  }
  getHelpText(options) {
    options = _.defaults(options || {}, {compact: false, commandName: this.name});
    let headText = `\nUsage: ${options.commandName}`;
    let text = '';
    const cmds = this.getPublicCommands();
    const opts = this.getPublicOptions();
    if (!_.isEmpty(opts)) {
      headText += ' <options>';
      text += `where <options> include:\n\n`;
      _.each(this.getPublicOptions(), function(opt) {
        text += opt.getHelpText();
      });
    }
    if (!_.isEmpty(cmds)) {
      headText += ' <command>';
      text += `\nAnd <command> is one of: ${this._formatText(_.map(cmds, 'name').join(', '))}`;
      text += `\n\nTo get more information about a command, you can execute:

   ${options.commandName} <command> --help\n`;
    }
    return `${headText}\n\n ${text}`;
  }
}

class Command extends CommandsContainer {
  constructor(opts) {
    opts = opts || {};
    super(opts);
    const supportedOptions = {
      name: null,
      alias: null,
      secret: false,
      description: '',
      minArgs: 0,
      maxArgs: 0,
      namedArgs: [],
      callback: null,
      exitAfterCallBack: false,
      enableHelpMenu: true
    };
    _.extend(this, pickWithDefaults(opts, supportedOptions));
    if (!this.name) {
      throw new ParserError('You did not provide a name for the command');
    }
    // these are the extra unrecognized argumets
    this.extraArgs = [];
    this.arguments = {};
    this.providedArguments = [];
    if (this.enableHelpMenu) {
      this.addOption({
        name: 'help',
        type: 'boolean',
        description: 'Display this help menu',
        allowNegated: false,
        callback: function() {
          throw new ShowHelpException();
        }
      });
    }
  }

  dump() {
    const that = this;
    const result = super.dump();
    _.each(['minArgs', 'maxArgs', 'extraArgs'], function(k) {
      result[k] = that[k];
    });
    return result;
  }
  parse(argv, options) {
    options = _.defaults(options || {}, {abortOnUnknown: true, abortIfRequiredAndNotProvided: true});
    try {
      const rest = this.parseFlags(argv, options).extraArgs;
      const cmdArgs = [];
      let i = 0;
      while (i < rest.length && (this.maxArgs === -1 || i < this.maxArgs)) {
        if (this.isFlag(rest[i]) && i >= this.minArgs) {
          // It is already valid, so we finish here
          break;
        }
        cmdArgs.push(rest[i]);
        if (this.namedArgs.length > i) {
          const namedArg = this.namedArgs[i];
          this.arguments[namedArg] = rest[i];
        }
        this.providedArguments.push(rest[i]);
        i += 1;
      }
      if (cmdArgs.length < this.minArgs) {
        throw new ParserError(
          `Command '${this.name}' expects at least ${this.minArgs} argument but you provided ${cmdArgs.length}`
        );
      }

      if (_.isEmpty(this._commands)) {
        this.extraArgs = rest.slice(i);
      } else {
        this.parseCommands(rest.slice(i));
      }
    } catch (e) {
      if (e instanceof ShowHelpException) {
        this.showHelp({code: 1, error: e.message});
        e.showHelp = false;
      }
      throw e;
    }
  }
  getHelpText(options) {
    options = _.defaults(options || {}, {compact: false, commandName: this.name});
    let headText = '';
    if (this.description !== '') {
      headText += `\n${this.description}\n`;
    }
    headText += `\nUsage: ${options.commandName}`;
    let text = '';
    const cmds = this.getPublicCommands();
    const opts = this.getPublicOptions();
    if (!_.isEmpty(opts)) {
      headText += ' <options>';
      text += `where <options> include: \n\n`;
      _.each(this.getPublicOptions(), function(opt) {
        text += opt.getHelpText();
      });
    }
    if (this.minArgs !== 0 || this.maxArgs !== 0 || this.namedArgs.length > 0) {
      if (this.namedArgs.length > 0) {
        headText += ` ${this.namedArgs.map(function(e) { return `<${e}>`; }).join(' ')}`;
      }
    }
    if (!_.isEmpty(cmds)) {
      headText += ' <command>';
      text += `\nAnd <command> is one of: ${this._formatText(_.map(cmds, 'name').join(', '))}`;
      text += `\n\nTo get more information about a command, you can execute:

   ${options.commandName} help <command>\n`;
    }
    return `${headText}\n\n ${text}`;
  }

  throwRequiredOptionsError(optionList) {
    throw new ParserError(`The following command options are required: ${optionList.join(',')}`);
  }
}

class Parser extends CommandsContainer {
  constructor(options) {
    options = _.defaults(
      options || {},
      {
        toolName: process.argv[1] || process.argv[0],
        enableBuiltInHelp: true,
        throwOnExit: false,
        allowProcessExit: true
      }
    );
    super(options);
    this.throwOnExit = options.throwOnExit;
    this.allowProcessExit = options.allowProcessExit;
    this.toolName = options.toolName;
    this.unknownFlags = [];
    if (options.enableBuiltInHelp) {
      this.addOption({
        name: 'help', type: 'boolean', allowNegated: false, callback: function() {
          throw new ShowHelpException();
        }
      });
      // const that = this;
      // this.addCommand({name: 'help', minArgs: 1, maxArgs: 1, namedArgs: ['command'], callback: function() {
      //   var command = this.command;
      //   that.showCommandHelp(command);
      // }});
    }
  }
  reset() {
    super.reset();
    this.unknownFlags = [];
  }
  showCommandHelp(name) {
    const cmd = this.getCommand(name);
    if (cmd === null) {
      throw new ParserError(`Unknow command ${name}`);
    }
    if (cmd.enableHelpMenu) {
      throw new ShowHelpException();
    }
  }
  getHelpText(options) {
    options = _.defaults(options || {}, {compact: false, commandName: this.toolName});
    return super.getHelpText(options);
  }
  parse(argv, options) {
    options = _.defaults(
      options || {},
      {
        silent: false,
        abortOnError: true,
        abortOnUnknown: true,
        throwOnExit: this.throwOnExit,
        allowProcessExit: this.allowProcessExit,
        onlyFlags: false,
        reset: true,
        abortIfRequiredAndNotProvided: true
      }
    );
    // Clean the state between different parse calls
    if (options.reset) this.reset();

    try {
      this._argv = argv;
      const rest = this.parseFlags(
        argv, _.pick(options, ['abortOnUnknown', 'abortIfRequiredAndNotProvided'])
      );
      if (!options.onlyFlags) {
        this.parseCommands(rest.extraArgs, options);
      }
    } catch (e) {
      if (options.silent) {
        return;
      }
      if (e instanceof ShowHelpException) {
        if (e.showHelp) {
          this.showHelp({code: e.exitCode, error: e.message, throw: options.throwOnExit});
          e.showHelp = false;
        }
      }
      if (e instanceof ParserExit) {
        if (options.throwOnExit) {
          throw e;
        } else if (options.allowProcessExit) {
          // Returning makes possible to mock process.exit while testing
          // (replacing it with a function that just captures the exit code, for example)
          // while still aborting the execution of the function. The return won't ever
          // execute in regular circumstances.
          process.exit(e.exitCode);
          return;
        } else {
          return;
        }
      } else if (e instanceof ParserError && e.showHelp) {
        this.showHelp();
        e.showHelp = false;
        if (options.allowProcessExit) {
          this.printError(e);
          // Returning makes possible to mock process.exit while testing
          // (replacing it with a function that just captures the exit code, for example)
          // while still aborting the execution of the function. The return won't ever
          // execute in regular circumstances.
          process.exit(e.exitCode);
          return;
        }
      }
      if (options.abortOnError) {
        throw e;
      }
    }
  }
  dump() {
    const dumpInfo = super.dump();
    dumpInfo.commands = {};
    _.each(this._commands, function(command) {
      dumpInfo.commands[command.name] = command.dump();
    });
    return dumpInfo;
  }
}

exports.Parser = Parser;
exports.Option = Option;
exports.Command = Command;
exports.ParserError = ParserError;
exports.ParserExit = ParserExit;
