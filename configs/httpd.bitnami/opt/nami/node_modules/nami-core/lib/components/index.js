'use strict';

const _ = require('lodash');
const Component = require('./component.js');
const Service = require('./service.js');
const DatabaseService = require('./database_service.js');
const schemas = require('./schemas');
const supportedTypes = {
  Component: Component,
  DatabaseService,
  Service: Service
};

// Here we should do some validation, for now we will just instantiate
// and fail if we cannot find it
function sanitizeComponentType(type) {
  if (!type) {
    return 'Component';
  } else {
    return _.isArray(type) ? type[0] : type;
  }
}

function getComponentClass(type) {
  return supportedTypes[type];
}

function getComponent(spec, pkgData, options) {
  const type = sanitizeComponentType(spec.extends);
  const id = spec.id;
  options = _.defaults(options || {}, {softSchemaValidation: false, logger: null});
  const Schema = schemas[type] || schemas.Component;
  const schema = new Schema();

  const result = schema.validate(spec);
  if (result.error) {
    if (options.softSchemaValidation) {
      if (options.logger) {
        options.logger.warn(`Package ${id} failed schema validation`);
        options.logger.trace(`Package ${id} failed schema validation: ${result.error.message}`);
      }
    } else {
      throw new Error(`Error loading metadata: ${result.error.message}`);
    }
  }
  const sanitizedSpec = result.value;
  const Class = getComponentClass(type);
  const obj = new Class(sanitizedSpec, pkgData);
  return obj;
}
exports.getComponent = getComponent;

