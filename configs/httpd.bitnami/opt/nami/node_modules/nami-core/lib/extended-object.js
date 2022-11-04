'use strict';
const _ = require('nami-utils/lodash-extra.js');

/**
 * Constructs an instance of a ExtendedObject
 * @class
 * @private
**/
class ExtendedObject {
  /**
   * Called after any handlebar replacement has been performed
   * @callback ExtendedObject~getterCb
   * @function
   * @param value - The current value after performing handlerbar replacements
   * @returns - The final value returned by the property
   */
  /**
   * Called before the value is stored
   * @callback ExtendedObject~setterCb
   * @function
   * @param newValue - The new value to set
   * @param currentValue - The currenly stored value
   * @returns - The final value to store
   */

  defineProperty(name, options) {
    options = _.opts(options, {enumerable: null, initialValue: null, getter: null, setter: null, writable: true});
    let _value = options.initialValue;
    if (options.enumerable === null) options.enumerable = _.startsWith(name, '_') ? false : true;

    let getter = options.getter || _.identity;
    let setter = null;
    if (options.writable) {
      setter = options.setter || _.identity;
    } else {
      setter = function() { throw new Error(`'${name}' is read-only`); };
    }

    // Binding to this, allows setters and getters to have access to other
    // properties so composite properties can be created (fullVersion = version + revision)
    setter = setter.bind(this);
    getter = getter.bind(this);

    Object.defineProperty(this, name, {
      enumerable: options.enumerable,
      get: function() {
        return getter(_value);
      },
      set: function(newValue) {
        _value = setter(newValue, _value);
      }
    });
  }
  hideAttributes(list) {
    _.each(list, attr => Object.defineProperty(this, attr, {enumerable: false, writable: true}));
  }
  hideInternalAttributes(list) {
    const keys = _(this).keys()
      .filter(k => k.indexOf('_') === 0)
      .concat(list || [])
      .unique().value();
    this.hideAttributes(keys);
  }
}
module.exports = ExtendedObject;
