'use strict';
const Joi = require('joi');
const ComponentSchema = require('./component.js');

class ServiceSchema extends ComponentSchema {
  _getSchemaDefinition() {
    const schema = super._getSchemaDefinition();
    return schema.keys({
      service: this._serviceSchema()
    });
  }
  _serviceCommandSchema() {
    return Joi.object().keys({
      detachStreams: Joi.boolean(),
      username: Joi.string().description('UNIX user the service will run under'),
      group: Joi.string().description('UNIX group the service will run under'),
      timeout: Joi.number().default(30)
        .description('Max time to wait for the service to successfully perform the specified command'),
      command: Joi.string(),
      workingDirectory: Joi.string(),
      env: Joi.object().unknown()
        .description('Service command environment variables, extending the service level environment'),
      wait: Joi.number().default(0).description('Time to wait after executing the command'),
      runInBackground: Joi.boolean(),
      stderrFile: Joi.string(),
      stdoutFile: Joi.string()
    });
  }
  _serviceSchema() {
    return Joi.object().required().keys({
      username: Joi.string().description('UNIX user the service will run under').example('daemon'),
      group: Joi.string().description('UNIX group the service will run under').example('daemon'),
      workingDirectory: Joi.string(),
      wait: Joi.number().default(0).description('Time to wait after executing the command'),
      timeout: Joi.number().default(30)
        .description('Max time to wait for the service to successfully perform the specified command'),
      pidFile: Joi.string().required(),
      logFile: Joi.string().required(),
      // TODO, this is still not used in the code, enable it when is done
      // env: Joi.object().unknown(),
      // We won't make this one required for now
      socketFile: Joi.string().default(''),
      // We won't make this one required for now
      confFile: Joi.string().default(''),
      env: Joi.object().unknown().description('Service related environment variables'),
      // Lets consider this unknown for now
      ports: Joi.alternatives().try(Joi.object().unknown(), Joi.array()),
      start: this._serviceCommandSchema(),
      stop: this._serviceCommandSchema(),
      restart: this._serviceCommandSchema(),
      status: this._serviceCommandSchema()
    });
  }
}

module.exports = ServiceSchema;
