'use strict';
const Joi = require('joi');
const BaseSchema = require('./base.js');

class ComponentSchema extends BaseSchema {
  _getSchemaDefinition() {
    const schema = super._getSchemaDefinition();
    return schema.keys({
      installation: this._installationSchema()
    });
  }
  _fileDefinition() {
    return Joi.object().keys({
      allowEmptyList: Joi.boolean().default(false),
      include: Joi.array().items(Joi.string()).default(['*']),
      exclude: Joi.array().items(Joi.string()).default([]),
      // TODO: Define the origin...
      origin: Joi.array().items(Joi.any()).default([]),
      manifest: Joi.array().items(Joi.any())
    });
  }
  _packableElementSchema() {
    return Joi.object().keys({
      name: Joi.string().required(),
      destination: Joi.string(),
      permissions: Joi.alternatives().try(Joi.string(), Joi.number()),
      owner: Joi.string(),
      group: Joi.string(),
      strip: Joi.number().default(0),
      selected: Joi.boolean().default(true),
      shouldBePacked: Joi.boolean().default(true),
      // Just for now
      tagOperations: Joi.object().unknown()
    });
  }
  _folderSchema() {
    return this._packableElementSchema().keys({
      files: Joi.array().items(
        this._fileDefinition()
      ),
      tags: Joi.array().items(Joi.string())
    });
  }
  _componentSchema() {
    return this._packableElementSchema().keys({
      folders: Joi.array().items(
        this._folderSchema()
      )
    });
  }
  _packagingSchema() {
    return Joi.object().keys({
      components: Joi.array().items(
        this._componentSchema()
      )
    });
  }
  _installationSchema() {
    return Joi.object().description('Installation Options').keys({
      prefix: Joi.string().allow('').description('Installation prefix'),
      strip: Joi.number().default(0),
      packaging: this._packagingSchema()
    });
  }
}

module.exports = ComponentSchema;
