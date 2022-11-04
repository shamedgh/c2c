'use strict';
const Joi = require('joi');

class BaseSchema {
  constructor() {
    this._joiSchema = this._getSchemaDefinition();
  }

  // Properties can be either a value (a boolean, string, number...) or an object describing it
  // And of course we cannot know the name beforehand
  _propertiesSchema() {
    return Joi.object().unknown().pattern(
      /.*/,
      Joi.alternatives().try(
        // We are not enforcing the different kind of settings yet
        Joi.object({}).unknown(),
        Joi.boolean(),
        Joi.string(),
        Joi.number()
      )
    ).description(
      'Key-value properties available in installation hooks. Values can be an object, boolean, string or number'
    );
  }
  _exportsSchema() {
    return Joi.object().unknown().pattern(
      /.*/, Joi.object()
    ).description('Helpers exported by this component');
  }
  _ownerSchema() {
    return Joi.object().keys({
      username: Joi.string().description('UNIX user'),
      group: Joi.string().description('UNIX group')
    });
  }
  _authorSchema() {
    return Joi.alternatives(
      Joi.object().keys({
        name: Joi.string().default('Your Name/Company'),
        url: Joi.string().uri({
          scheme: [
            'git', 'http', 'https', /git\+https?/
          ]
        })
      }).description('Component author metadata')
    );
  }
  _getSchemaDefinition() {
    return Joi.object().keys({
      id: Joi.string().required().description('Unique ID that will be used to refer to your component'),
      name: Joi.string().default(Joi.ref('id')).description('Name of your component'),
      extends: Joi.alternatives(Joi.array().min(1), Joi.string()).description('Type of component'),
      expects: Joi.alternatives(Joi.array(), Joi.object()).description('Expected modules to be installed'),
      licenses: Joi.array(),
      version: Joi.string().required().default('1.0.0'),
      revision: Joi.alternatives().try(Joi.string(), Joi.number()).default(0),
      author: this._authorSchema(),
      owner: this._ownerSchema(),
      properties: this._propertiesSchema(),
      exports: this._exportsSchema()
    });
  }
  validate(obj) {
    return Joi.validate(obj, this._joiSchema);
  }
}

module.exports = BaseSchema;
