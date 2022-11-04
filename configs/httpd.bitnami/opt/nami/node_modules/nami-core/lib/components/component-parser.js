'use strict';

const _ = require('nami-utils/lodash-extra.js');
const Parser = require('cmd-parser').Parser;

class ComponentParser extends Parser {
  constructor(obj, options) {
    options = _.defaults(options || {}, {addCommands: true});
    super({throwOnExit: true, allowProcessExit: false});

    const _this = this;

    this.enableOptionFile({cliName: 'inputs-file', description: 'JSON file containing a map of command line flags'});

    this.metadataObject = obj;
    const isInstalled = obj.lifecycle === 'installed';
    this.toolName = options.toolName || this.metadataObject.id;
    _.each(obj.getOptions(), function(opts, key) {
      const snakeCasedKey = _.snakeCase(key);
      const globalName = `component.${obj.id}.${snakeCasedKey}`;
      if (opts.required && isInstalled) {
        opts.required = false;
      }
      const optionOpts = _.defaults({alias: globalName, envvar: globalName.toUpperCase().replace(/[.-]/g, '_')}, opts);
      optionOpts.callback = function(option) {
        obj[key] = option.value;
      };
      _this.addOption(optionOpts);
    });
    if (options.addCommands) {
      this.addCommands();
    }
  }
  _getJsonData(jsonFile) {
    const data = super._getJsonData(jsonFile);
    return _.mapValues(data, value => this.metadataObject.subst(value));
  }
  addCommands() {
    const obj = this.metadataObject;
    _.each(obj.getExports(), (data, cmd) => {
      data = data || {};
      const cmdDefinition = _.opts(data, {name: cmd});
      if (data.arguments) {
        cmdDefinition.namedArgs = data.arguments;
        cmdDefinition.minArgs = data.arguments.length;
        cmdDefinition.maxArgs = data.arguments.length;
      }
      this.addCommand(cmdDefinition, data.options);
    });
  }
}

module.exports = ComponentParser;
