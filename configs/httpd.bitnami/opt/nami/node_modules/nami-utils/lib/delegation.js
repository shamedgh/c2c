'use strict';
const _ = require('lodash');

function _delegateProperties(delegator, properties, target, options) {
  options = _.defaults(options || {}, {outputFilter: null, enumerable: null, readOnly: false});
  const outputFilter = _.isFunction(options.outputFilter) ? options.outputFilter : _.identity;
  _.each(properties, function(value, key) {
    let getter = null;
    let setter = null;
    const enumerable = options.enumerable || target.propertyIsEnumerable(value);
    if (options.readOnly) {
      setter = function() { throw new Error(`'${key}' is read-only`); };
    } else {
      setter = function(newVal) { target[value] = newVal; };
    }
    if (_.isFunction(target[value])) {
      getter = () => _.flow(target[value], outputFilter).bind(target);
    } else {
      getter = function() { return outputFilter(target[value]); };
    }
    Object.defineProperty(delegator, key, {enumerable: enumerable, set: setter, get: getter});
  });
}
function delegate(delegator, toDelegate, target, options) {
  // TODO: We should also support inputFilter
  options = _.defaults(options || {}, {outputFilter: null, enumerable: null, readOnly: false});
  target = target || delegator;

  let propertiesMap = {};
  if (_.isString(toDelegate)) {
    propertiesMap[toDelegate] = toDelegate;
  } else if (_.isArray(toDelegate)) {
    _.each(toDelegate, function(key) {
      propertiesMap[key] = key;
    });
  } else if (_.isObject(toDelegate)) {
    propertiesMap = toDelegate;
  } else {
    throw new Error(`Invalid delegation definition ${toDelegate}`);
  }
  _delegateProperties(delegator, propertiesMap, target, options);
}

module.exports = delegate;
