'use strict';

const _ = require('lodash');
const delegate = require('./delegation.js');
const stackTrace = require('stack-trace');

const lodash = _.runInContext();

function tryKey(obj /* , key */) {
  if (lodash.isObject(obj) && lodash.has(obj, '_wrapped')) {
    obj = obj.value();
  }

  lodash.each(lodash.toArray(arguments).slice(1), (key) => {
    if (lodash.isUndefined(obj) || lodash.isNaN(obj) || lodash.isNull(obj)) {
      // let value undefined
      return;
    } else if (lodash.has(obj, key)) {
      obj = obj[key];
    } else {
      obj = undefined;
    }
  });
  const newObj = lodash(obj);
  Object.defineProperty(newObj, 'try', {value: tryKey.bind(lodash, newObj)});
  return newObj;
}

function tryOnce() {
  return tryKey.apply(this, arguments).identity();
}
function toArrayIfNeeded(value) {
  if (lodash.isArray(value)) {
    return value;
  } else if (lodash.isUndefined(value)) {
    return [];
  } else {
    return [value];
  }
}

function isNotEmpty(value) {
  return !lodash.isEmpty(value);
}

function tryFuncs(fnArr, args) {
  let res = null;
  lodash.each(fnArr, (func) => {
    res = lodash.attempt(func, args);
    if (!lodash.isError(res)) {
      // Abort loop
      return false;
    }
  });
  if (lodash.isError(res)) {
    throw res;
  } else {
    return res;
  }
}
function toListFunction(fn, options) {
  options = lodash.defaults(options || {}, {this: null, flatten: false, accumulator: null});
  return () => {
    let result;

    const args = lodash.toArray(arguments);
    if (args.length === 0) {
      result = [fn.apply(options.this, args)];
    } else {
      let firstElem = args[0];
      const rest = args.slice(1);
      if (!lodash.isArray(firstElem)) {
        firstElem = [firstElem];
      }
      result = [];
      lodash.each(firstElem, (e) => {
        const newArgs = rest.slice();
        newArgs.unshift(e);
        result.push(fn.apply(options.this, newArgs));
      });
    }
    if (lodash.isFunction(options.accumulator)) {
      return options.accumulator.call(options.this, result);
    } else {
      return result.length === 1 && options.flatten ? result[0] : result;
    }
  };
}
function keys(obj) {
  return Object.keys(obj);
}
function assign() {
  return Object.assign.apply(null, Array.from(arguments));
}
function isBoolean(value) {
  return typeof value === 'boolean' || value instanceof Boolean;
}

function first(arr) {
  return arr[0];
}

function last(arr) {
  return arr[arr.length - 1];
}
function isArray(arr) {
  return Array.isArray(arr);
}

function isNull(value) {
  return value === null;
}

function isUndefined(value) {
  return value === undefined;
}

function isNumber(value) {
  return typeof value === 'number' || value instanceof Number;
}

function isNaN(value) {
  // An `NaN` primitive is the only value that is not equal to itself.
  return isNumber(value) && value !== +value;
}

function isInteger(value) {
  return Number.isInteger(value);
}

function isFinite(value) {
  return Number.isFinite(value);
}

function _prototypeStringMatches(value, str) {
  return Object.prototype.toString.call(value) === str;
}

function isRegExp(value) {
  return (value instanceof RegExp) ||
    _prototypeStringMatches(value, '[object RegExp]');
}
function identity(value) {
  return value;
}

function isFunction(value) {
  return value instanceof Function ||
    _prototypeStringMatches(value, '[object Function]');
}

function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

function isSymbol(value) {
  return typeof value === 'symbol';
}
function isObject(value) {
  const type = typeof value;
  return !!value && (type === 'object' || type === 'function');
}

function isPlainObject(value) {
  return isObject(value) &&
    !isArray(value) &&
    !isNumber(value) &&
    !isString(value) &&
    !isFunction(value) &&
    !isRegExp(value);
}

function pickOptions(currentOpts, defaults, options) {
  let objKeys = [];
  if (!isPlainObject(options)) {
    options = {};
  }

  options = lodash.defaults(options, {
    keys: [], onlyDefaultKeys: false, mode: 'defaults', overwriteFalsy: false, deep: false
  });

  if (!isPlainObject(currentOpts)) {
    currentOpts = {};
  } else {
    currentOpts = lodash.clone(currentOpts);
  }
  if (!isPlainObject(defaults)) {
    defaults = {};
  }
  if (options.mode === 'overwrite') {
    currentOpts = lodash.extend(currentOpts, defaults);
  } else {
    if (options.deep) {
      currentOpts = lodash.defaultsDeep(currentOpts, defaults);
    } else {
      currentOpts = lodash.defaults(currentOpts, defaults);
    }
    if (options.overwriteFalsy) {
      lodash.each(defaults, (defaultValue, key) => {
        if (lodash.isEmpty(currentOpts[key])) currentOpts[key] = defaultValue;
      });
    }
  }

  if (options.onlyDefaultKeys) {
    objKeys = lodash.keys(defaults);
  } else if (!lodash.isEmpty(options.keys)) {
    objKeys = options.keys;
  }
  if (!lodash.isEmpty(objKeys)) {
    currentOpts = lodash.pick(currentOpts, objKeys);
  }
  return currentOpts;
}

function sanitizeOptions(currentOpts, availableOptions, options) {
  const availableOptsKeys = lodash.keys(availableOptions);
  options = lodash.defaults(options || {}, {abortOnUnknown: true, callerLevel: 1, logger: null, sanitizeUnknown: true});
  const allOptions = pickOptions(currentOpts, availableOptions, options);
  const sanitizedOptions = options.sanitizeUnknown ? lodash.pick(allOptions, availableOptsKeys) : allOptions;
  if (options.abortOnUnknown || options.logger) {
    const extra = lodash.omit(allOptions, availableOptsKeys);
    if (!lodash.isEmpty(extra)) {
      const tmpError = new Error('');
      const caller = stackTrace.parse(tmpError)[options.callerLevel];
      // caller.functionName also returns any parent namespace
      const functionName = caller.functionName.replace(/(.*\.)/, '');
      const msg = `Unknown arguments provided to function ${functionName}: ${lodash.keys(extra).join(', ')}`;
      if (options.abortOnUnknown) {
        throw new Error(msg);
      } else if (options.logger) {
        options.logger.trace8(msg);
      }
    }
  }
  return sanitizedOptions;
}

// lodash considers {message: 'foo', name: 'bar'} as an error,
// while in our opinion, it should not
function isError(value) {
  return value instanceof Error;
}

function startsWith(value, prefix, position) {
  value = isString(value) ? value : '';
  return value.startsWith(prefix, position);
}
function endsWith(value, prefix, position) {
  value = isString(value) ? value : '';
  return value.endsWith(prefix, position);
}


function values(obj) {
  if (isNull(obj) || isUndefined(obj)) {
    return [];
  }
  return Object.keys(obj).map(function(key) {
    return obj[key];
  });
}
function pick(obj, predicate) {
  if (isFunction(predicate)) {
    return lodash.pickBy(obj, predicate);
  } else {
    return lodash.pick.apply(this, arguments);
  }
}

function take(array, n) {
  if (!(array && array.length)) {
    return [];
  }
  n = Number.isInteger(n) && n >= 0 ? n : 1;
  return array.slice(0, n);
}

function takeRight(array, n) {
  if (!(array && array.length)) {
    return [];
  }
  n = Number.isInteger(n) && n >= 0 ? n : 1;
  const sliceIdx = array.length - n;
  return array.slice(sliceIdx > 0 ? sliceIdx : 0);
}
function toArray(value) {
  if (isNull(value) || isUndefined(value)) {
    return [];
  } else if (isObject(value)) {
    return values(value);
  } else {
    return Array.from(value);
  }
}

function noop() {}

function uniqBy(array, fn) {
  if (!(array && array.length)) {
    return [];
  }
  fn = fn || identity;
  const seen = {};
  return array.filter(function(item) {
    const k = fn(item);
    return seen.hasOwnProperty(k) ? false : (seen[k] = true);
  });
}

function uniq(array) {
  return uniqBy(array, identity);
}
function once(fn) {
  return (function() {
    let result = null;
    let done = false;
    return function() {
      if (done) { return result; }
      result = fn.apply(this, arguments);
      done = true;
      return result;
    };
  }());
}
function union() {
  const list = [];
  Array.from(arguments).forEach(e => {
    if (isArray(e)) { list.push(...e); }
  });
  return uniq(list);
}

function xor() {
  const visited = {};
  const allElements = [];
  Array.from(arguments).forEach(arr => {
    if (isArray(arr)) {
      const elements = uniq(arr);
      allElements.push(...elements);
      elements.forEach(e => {
        if (visited[e]) {
          visited[e]++;
        } else {
          visited[e] = 1;
        }
      });
    }
  });
  return allElements.filter(e => visited[e] === 1);
}

function includes(collection, value, fromIdx) {
  let arrCollection = null;
  if (isArray(collection) || isString(collection)) {
    arrCollection = collection;
  } else if (isPlainObject(collection)) {
    arrCollection = values(collection);
  } else {
    arrCollection = [];
  }

  fromIdx = fromIdx || 0;
  if (fromIdx < 0) {
    fromIdx = collection.length + fromIdx;
  }
  return arrCollection.slice(fromIdx).indexOf(value) >= 0;
}

function contains() {
  return lodash.includes.apply(lodash, arguments);
}
function pluck(collection, iteratee) {
  return lodash.map(collection, iteratee);
}

function difference(array1, array2) {
  return array1.filter(e => array2.indexOf(e) < 0);
}
function where(collection, predicate) {
  return lodash.filter(collection, predicate);
}
function omit(obj, props) {
  const result = {};
  difference(keys(obj), toArrayIfNeeded(props)).forEach(key => result[key] = obj[key]);
  return result;
}

function padRight() {
  return lodash.padEnd.apply(lodash, arguments);
}

function padLeft() {
  return lodash.padStart.apply(lodash, arguments);
}

function trimRight(string, chars) {
  return lodash.trimEnd(string, chars);
}
function trimLeft(string, chars) {
  return lodash.trimStart(string, chars);
}

function capitalize(string) {
  return string && (string.charAt(0).toUpperCase() + string.toLowerCase().slice(1));
}
function compact(arr) {
  return toArray(arr).filter(e => !!e);
}
function any() {
  const args = lodash.toArray(arguments);
  if (args.length === 3 && isString(args[1])) {
    return lodash.some.apply(lodash, [args[0], [args[1], args[2]]]);
  } else {
    return lodash.some.apply(lodash, arguments);
  }
}

const extra = {
  isReallyObject: isPlainObject,
  sanitize: sanitizeOptions, try: tryKey, tryOnce, options: pickOptions,
  isNotEmpty: isNotEmpty, opts: pickOptions,
  toListFunction, toArrayIfNeeded, tryFuncs: tryFuncs
};

const polyfill = {
  head: first, extend: assign,
  trimLeft,
  trimRight,
  padLeft,
  padRight,
  isSymbol,
  any,
  where,
  unique: uniq,
  pluck,
  contains
};

const reimplemented = {
  keys,
  compact,
  assign,
  first,
  last,
  capitalize,
  difference,
  once,
  includes,
  omit,
  union,
  toArray,
  values,
  uniq,
  uniqBy,
  isArray,
  isBoolean,
  isNumber,
  isInteger,
  isRegExp,
  isString,
  isError,
  isFunction,
  isNaN,
  isFinite,
  isNull,
  isUndefined,
  isObject,
  isPlainObject,
  noop,
  xor,
  takeRight,
  take,
  identity,
  startsWith,
  endsWith,
  pick
};
function wrapLodash(loObj) {
  loObj = loObj || {};
  _.mixin(loObj, polyfill);
  // We cannot mixin everything or non-overwritten methods will use our implementation,
  // which may not work (for example, chaining is broken if we do it)
  // Extending will only superficially attach them
  _.extend(loObj, reimplemented, extra, ...toArray(arguments).slice(1));
  return loObj;
}

function safeLodash() {
  const ld = wrapLodash({});
  delegate(ld, [
    'flatten',
    'inRange',
    'isEqual',
    'trimEnd',
    'trimStart',
    'isEmpty',
    'has',
    'clone',
    'defaults',
    'each', 'forEach',
    'eachRight',
    'every',
    'filter',
    'find',
    'flow',
    'map',
    'mapValues',
    'merge',
    'some',
    'padStart',
    'padEnd',
    'sortBy',
  ], lodash);
  return ld;
}

const namiLodash = wrapLodash(
  _.runInContext(),
  {safe: safeLodash}
);

module.exports = namiLodash;
