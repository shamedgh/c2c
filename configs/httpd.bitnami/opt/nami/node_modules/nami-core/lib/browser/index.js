'use strict';

const _ = require('nami-utils/lodash-extra.js');
let ZombieBrowser = null;
const deasync = require('deasync');
const urlModule = require('url');
const parseUrl = urlModule.parse;
const formatUrl = urlModule.format;
const ExtendedObject = require('../extended-object.js');
const fixup = require('./fixups.js');
function createZombie(options) {
  options = _.opts(options, {waitDuration: '30s', site: null, fixups: []});
  if (ZombieBrowser === null) {
    ZombieBrowser = require('zombie');
  }

  const zombie = new ZombieBrowser();

  const fixups = _.toArrayIfNeeded(options.fixups);

  // living_forms fixup should be secure enough to always add it for now
  if (!_.includes(fixups, 'living_forms')) {
    fixups.push('living_forms');
  }

  zombie.on('loaded', function(document) {
    fixup(document, options.fixups);
  });

  zombie.waitDuration = options.waitDuration;
  zombie.site = options.site;
  return zombie;
}

class BrowserStep extends ExtendedObject {
  constructor(type, info, options) {
    options = _.opts(options, {wait: null});
    super();
    this.type = type;
    this.data = info;
    this.wait = options.wait;
    this._promise = null;
  }
  dump() {
    return {type: this.type, data: this.data};
  }
  exec(browser, previousPromise) {
    // Depending on the type, data will contain a different spec (a button, a pair of key-value...)
    const data = this.data;
    const type = this.type;
    let key = null;
    let value = null;
    let cb = null;
    switch (type) {
      case 'dump':
      case 'check':
      case 'uncheck':
      case 'visit':
        cb = () => browser[type](data);
        break;
      case 'fill':
        cb = () => browser.fill(data.key, data.value);
        break;
      case 'then': {
        const then = data;
        cb = () => then(browser.document);
        break;
      }
      case 'press':
        cb = () => {
          return browser.pressButton(data, null).catch(function(e) {
            // It is not a real error, it probably comes from the web page
            if (!(e instanceof Error)) return;
            throw e;
          });
        };
        break;
      case 'wait': {
        let selector = null;
        /* eslint-disable max-len */
        const timeSpec = /^\d+(\.*\d+)?\s*(minutes|minute|mins|min|m|seconds|secs|sec|s|milliseconds|millisecond|msecs|msec|ms)?\s*$/;
        /* eslint-enable max-len */
        if (_.isFunction(data)) {
          selector = data;
        } if (_.isNumber(data) || (_.isString(data) && data.match(timeSpec))) {
          selector = {duration: data};
        } else if (_.isString(data)) {
          selector = {function: () => !!browser.window.document.querySelector(data), duration: '60s'};
        } else {
          selector = data;
        }
        cb = () => browser.wait(selector, _.noop);
        break;
      }
      case 'click':
        // data is a link
        cb = () => browser.clickLink(data);
        break;
      case 'select':
        key = data.key;
        value = data.value;
        cb = () => browser.select(key, value);
        break;
      case 'choose': {
        const inputSelector = data.input;
        const optionSelector = data.option;
        let choosePath = null;
        if (inputSelector) {
          choosePath = `input[type=radio][name='${escape(inputSelector)}'][value='${escape(optionSelector)}']`;
        } else {
          choosePath = optionSelector;
        }
        cb = () => browser.choose(choosePath);
        break;
      }
      default:
        throw new Error(`Unknown operation type '${type}'`);
    }
    this._promise = this._promisify(previousPromise, browser, cb);
    return this._promise;
  }

  _promisify(previousPromise, browser, cb) {
    const wait = this.wait;
    let promise = null;
    if (wait !== null) {
      promise = previousPromise.then(function() {
        const globalMainDuration = browser.waitDuration;
        browser.waitDuration = wait;
        try {
          return cb();
        } finally {
          browser.waitDuration = globalMainDuration;
        }
      });
    } else {
      promise = previousPromise.then(cb);
    }
    return promise.catch(function(e) {
      // It is not a real error, it probably comes from the web page
      if (!(e instanceof Error)) return;
      throw e;
    });
  }
}

class Browser extends ExtendedObject {
  constructor(options) {
    // Legacy behavior, passing url to the constructor
    if (_.isString(options)) {
      options = {url: options};
    }

    options = _.opts(options, {
      url: null, site: null, waitDuration: '30s',
      autoExec: false, xmlHttpRequestTimeout: 120000,
      // see fixups.js for a list of available hacks
      // living_forms is always applied for now
      fixups: ['living_forms']
    });

    super();

    this.defineProperty('_pastSteps', {initialValue: []});
    this.defineProperty('_zombieBrowser');
    this.defineProperty('_steps');

    // We save the initial options so we can recreate a fresh copy from
    // scratch using the reset method
    this.defineProperty('_initOpts', {initialValue: options});

    this.autoExec = options.autoExec;
    this.xmlHttpRequestTimeout = options.xmlHttpRequestTimeout;

    this._steps = [];

    this._zombieBrowser = this._createZombieBrowser();

    // Expose internal Zombie properties
    _.each([
      'assert', 'window', 'history', 'status', 'success', 'statusCode', 'document'
    ], (prop) => {
      this.defineProperty(prop, {
        getter: () => this._zombieBrowser[prop],
        writable: false
      });
    });

    _.each([
      'location', 'url', 'userAgent', 'runScripts', 'language', 'site', 'waitDuration'
    ], (prop) => {
      this.defineProperty(prop, {
        getter: () => this._zombieBrowser[prop],
        setter: (val) => this._zombieBrowser[prop] = val,
        writable: true
      });
    });
  }
  _addStep(type, what, options) {
    options = _.opts(options, {autoExec: this.autoExec, wait: null});
    const autoExec = options.autoExec;
    this._steps.push(this._getNewStep(type, what, options));
    return autoExec ? this.exec() : this;
  }
  _cleanupUrl(url) {
    const defaultPorts = {'http:': 80, 'https:': 443, 'ftp:': 21};
    const parsedUrl = _.opts(parseUrl(url), this._site, {overwriteFalsy: true});

    // Force formatUrl to recalculate it
    parsedUrl.host = null;
    // Remove the port if it is the default for the protocol
    if (defaultPorts[parsedUrl.protocol] === Number(parsedUrl.port)) {
      parsedUrl.port = null;
    }
    return formatUrl(parsedUrl);
  }

  get steps() {
    return this._steps.map(s => s.dump());
  }

  _getNewStep(type, what, options) {
    return new BrowserStep(type, what, options);
  }

  /**
   * Fill form fields
   * @desc Fill up a form
   * @param {string|object} fields - Either a hash of key-value to fill in or a key and value as two separate arguments
   * @example
   * // Fill a form providing all its fields at once:
   * browser.fill({username: 'user', password: 'bitnami', email: 'user@example.com'});
   * @example
   * // Fill in a form in multiple steps
   * browser.fill('username', 'user').fill('password', 'bitnami')
   * .fill('email', 'user@example.com');
   */
  fill(opts) {
    if (_.isReallyObject(opts)) {
      _.each(opts, (value, key) => {
        this._addStep('fill', {key: key, value: value});
      });
    } else if (arguments.length === 2 && _.isString(arguments[0])) {
      this._addStep('fill', {key: arguments[0], value: arguments[1]});
    }
    return this;
  }

  /**
   * Clear browser scheduled steps
   * @desc Before calling 'exec', you can clean any added steps using clear.
   * The current browser state (its cookies, history, visited page...) will
   * be preserved
   * @example
   * // Abort previous scheduled steps
   * browser.visit('http://example.com');
   * // If we no longer want to visit it, we can start over
   * browser.clear();
   * browser.visit('http://example.org/docs');
   */
  clear() {
    this._steps = [];
  }

  _createZombieBrowser() {
    const _this = this;
    const zombie = createZombie({
      waitDuration: this._initOpts.waitDuration,
      fixups: this._initOpts.fixups,
      site: this._initOpts.site
    });
    // Rogue XMLHttpRequest timeout after a hardcoded 2m timeout, which is
    // not possible to configure from outside, we have to patch the internal
    // function to setup a lower timeout before returning the xhr object
    zombie.on('opened', function(window) {
      const oldReq = window.XMLHttpRequest;
      window.XMLHttpRequest = function() {
        const xhr = oldReq.apply(window);
        xhr.timeout = _this.xmlHttpRequestTimeout;
        return xhr;
      };
    });
    return zombie;
  }

  /**
   * Reset the browser
   * @desc Completely reset the browser, not only the scheduled steps.
   * It is equivalent to create a new browser object
   * @example
   * // Do some operations:
   * browser.visit('http://example.com').fill({...}).exec();
   * // Start from scratch
   * browser.reset();
   */
  reset() {
    if (this._zombieBrowser) this._zombieBrowser.destroy();
    this.xmlHttpRequestTimeout = this._initOpts.xmlHttpRequestTimeout;

    this._zombieBrowser = this._createZombieBrowser();
    this.clear();
  }

  /**
   * Close
   * @desc Close all opened tabs
   * @example
   * // Close a browser after finishing with it
   * browser.visit('http://example.com').fill({...}).exec({autoClose: false});
   * const html = browser.html;
   * browser.close();
   */
  close() {
    this._zombieBrowser.tabs.closeAll();
  }
  /**
   * CSS Query the current HTML page
   * @desc Evaluates a CSS selecter against the document and returns an element
   * @param {string} query
   * @example
   * // Get the first link href
   * browser.query('a').href
   * // => 'http://example.com'
   */
  query() {
    return this._zombieBrowser.query.apply(this._zombieBrowser, arguments);
  }

  /**
   * CSS Query the current HTML page
   * @desc Evaluates a CSS selecter against the document and returns a array of elements
   * @param {string} query
   * @example
   * // Get all the links
   * browser.queryAll('a')
   * // => 'http://example.com'
   */
  queryAll() {
    return this._zombieBrowser.queryAll.apply(this._zombieBrowser, arguments);
  }

  /**
   * XPath Query the current HTML page
   * @desc Evaluates the a XPath expression against the document and return the XPath result
   */
  xpath() {
    return this._zombieBrowser.xpath.apply(this._zombieBrowser, arguments);
  }

  /**
   * Evaluate JavaScript
   * @desc Evaluates JavaScript in the context of the current window
   * @param {string} code
   * @param {string} [filename]
   */
  evaluate() {
    return this._zombieBrowser.evaluate.apply(this._zombieBrowser, arguments);
  }

  /**
   * Get the latest HTML
   * @desc Get the last loaded HTML document or null if none is opened
   */
  get html() {
    if (this._zombieBrowser.window) {
      return this._zombieBrowser.html();
    } else {
      return null;
    }
  }
  /**
   * Get the latest HTML Text
   * @desc Get the last loaded HTML document or null if none is opened
   */
  get text() {
    if (this._zombieBrowser.window) {
      return this._zombieBrowser.text();
    } else {
      return null;
    }
  }
  /**
   * Execute the scheduled browser steps
   * @param {Object} [options]
   * @param {boolean} [options.abortOnError=true] - Abort in case of error. If disabled,
   * it will return a hash with the exitCode and the errors
   * @param {boolean} [options.clear=true] - Pop scheduled steps while they are executed.
   * Disabling it allows executing the same browser steps multiple times
   * @param {boolean} [options.autoClose=false] - If enabled, the current browser window will be
   * automatically closed. If you disabled it, you will probably need to manually close
   * it at the end so it stops listening to the last visited page events
   * @returns {object} - Object containing the result of the execution:
   * {exitCode: exitCode, errors: errors, errorPage: errorPage, html: html};
   * @throws Will throw an error if any of the steps fail and abortOnError=true
   */
  exec(options) {
    options = _.defaults(options || {}, {abortOnError: true, clear: true, autoClose: false});
    let done = false;
    let exitCode = null;
    let errors = [];
    let errorPage = null;

    const zombieBrowser = this._zombieBrowser;
    // This is used to avoid race conditions in callbacks
    const isDone = () => done || !zombieBrowser.tabs;

    function recordError(err) {
      // Zombie throws errors if they JS files in the page fail
      // Luckily for us, they are strings so we can try to ignore them
      if (!(err instanceof Error)) return;
      if (isDone()) return;
      exitCode = 1;
      errors = (zombieBrowser.errors || []).concat(err);
      errorPage = zombieBrowser.html();
      done = true;
    }

    let promise = null;
    try {
      if (!zombieBrowser.window) {
        zombieBrowser.tabs.open();
      }

      // We need a promise to start with
      promise = zombieBrowser.wait(1);
      _.each(this._steps, s => {
        this._pastSteps.push(s);
        promise = s.exec(zombieBrowser, promise);
      });

      if (options.clear) this.clear();

      promise = promise.then(function() {
        exitCode = 0;
        done = true;
      });

      promise.error(recordError).catch(recordError);

      // Wait for the final callbacks to finish
      deasync.loopWhile(function() {
        return done !== true;
      });

      if (exitCode !== 0 && options.abortOnError) {
        const msg = _.map(errors, e => e.message).join('\n').trim() || errorPage;
        throw new Error(msg);
      } else {
        return {exitCode: exitCode, errors: errors, errorPage: errorPage, html: this.html};
      }
    } finally {
      if (options.autoClose) this.close();
    }
  }

  get stepsHistory() {
    return this._pastSteps.map(s => s.dump());
  }

  _getOnlySelected(data) {
    const res = {};
    _.each(data, (list, key) => {
      let value = null;
      _.each(list, e => {
        if (e.checked) {
          value = e.id;
          return false;
        }
      });
      res[key] = value || list[0].id;
    });
    return res;
  }
  _parseSelect(item) {
    const res = [];
    const selectOpts = item.options;
    for (let j = 0; j < selectOpts.length; j++) {
      const o = selectOpts.item(j);
      const d = {id: o.value};
      if (o.value === item.value) {
        d.checked = true;
      }
      res.push(d);
    }
    return res;
  }
  _getSelector(itemData, options) {
    options = _.opts(options, {preferId: true});
    const fields = ['id', 'name', 'label'];
    if (!options.preferId) fields.reverse();
    let selector = null;
    _.each(fields, f => {
      if (itemData[f]) {
        selector = itemData[f];
        if (f === 'id') selector = `#${selector}`;
        return false;
      }
    });
    return selector;
  }
  describeForm() {
    const defaultOpts = {onlySelected: true, preferId: true};
    let form = null;
    let options = null;

    if (arguments.length > 0 && _.isString(arguments[0])) {
      form = arguments[0];
      options = _.opts(arguments[1], defaultOpts);
    } else {
      form = 'form';
      options = _.opts(arguments[0], defaultOpts);
    }

    const formNode = this._zombieBrowser.query(form);
    const result = formNode.querySelectorAll('input, select');
    const inputs = [];
    const fill = {};
    const checkboxes = {};
    const radiobuttons = {};
    const select = {};
    const labels = {};
    let label = null;
    for (label of this._zombieBrowser.queryAll('label')) {
      const forAttr = label.getAttribute('for');
      if (forAttr) labels[forAttr] = label.textContent.trim();
    }

    let submit = null;
    for (let i = 0; i < result.length; i++) {
      const item = result.item(i);
      const inputData = _.pick(item, ['id', 'type', 'value', 'name']);
      inputData.label = labels[item.id] || null;
      inputData._item = item;
      inputs.push(inputData);
      if (item.type === 'hidden') continue;
      const id = this._getSelector(inputData, options);

      if (item.tagName.toUpperCase() === 'SELECT') {
        select[id] = this._parseSelect(item);
      } else {
        switch (item.type) {
          case 'submit': {
            const selectors = [item.value, item.name];
            if (options.preferId) selectors.reverse();
            submit = _(selectors).compact().first();
            break;
          }
          case 'radio':
            radiobuttons[item.name] = radiobuttons[item.name] || [];
            radiobuttons[item.name].push({id: inputData.label || item.value, checked: item.checked});
            break;
          case 'checkbox':
            checkboxes[id] = {id: item.value || inputData.label, checked: item.checked};
            break;
          default:
            fill[id] = item.value;
        }
      }
    }
    const selectData = options.onlySelected ? this._getOnlySelected(select) : select;
    const chooseData = options.onlySelected ? this._getOnlySelected(radiobuttons) : radiobuttons;
    return {fill: fill, check: checkboxes, select: selectData, choose: chooseData, press: submit};
  }

  /**
   * Get cookies
   * @desc Get the currently stored cookies in the browser
   * @param {Object} [options]
   * @param {options.allProperties=false] - Control whether to return only the cookie value of a hash with all
   * its properties:
   * name   - The cookie name
   * domain - The cookie domain (defaults to hostname of currently open page)
   * path   - The cookie path (defaults to "/")
   * value  - The cookie value
   * @example
   * // Get all cookie values:
   * browser.getCookies()
   * // => {a: 'b', _session: 'nami_session_1345'}
   * @example
   * // Get all cookies information
   * browser.getCookies({allProperties: true})
   * // => { site_language:
   *  { name: 'site_language',
   *  value: 'en',
   *  domain: 'example.org',
   *  path: '/',
   *  httpOnly: true,
   *  expires: Wed Aug 24 2016 11:31:47 GMT+0200 (CEST) } }
   */
  getCookies(options) {
    options = _.opts(options, {allProperties: false});
    const cookies = {};
    _.each(this._zombieBrowser.cookies, c => {
      cookies[c.key] = this.getCookie(c.key, options);
    });
    return cookies;
  }

  /**
   * Get cookie
   * @desc Get the currently stored cookies in the browser
   * @param {Object} [options]
   * @param {options.allProperties=false] - Control whether to return only the cookie value of a hash with all
   * its properties:
   * name   - The cookie name
   * domain - The cookie domain (defaults to hostname of currently open page)
   * path   - The cookie path (defaults to "/")
   * value  - The cookie value
   * @example
   * // Get a cookie value:
   * browser.getCookie('_session')
   * // => 'nami_session_1345'
   * @example
   * // Get all cookie information
   * browser.getCookie('site_language', {allProperties: true})
   * // => { name: 'site_language',
   *  value: 'en',
   *  domain: 'example.org',
   *  path: '/',
   *  httpOnly: true,
   *  expires: Wed Aug 24 2016 11:31:47 GMT+0200 (CEST) }
   */
  getCookie(id, options) {
    options = _.opts(options, {allProperties: false});
    return this._zombieBrowser.getCookie(id, options.allProperties);
  }

  /**
   * Set a cookie
   * @param {string} id - Id of the cookie to set
   * @param {object|string} cookieData - Cookie value or hash containing any of the
   * supported cookie attributes: name, value, domain, path, expires...
   * @example
   * // Set language cookie value
   * browser.setCookie('site_language', 'en');
   * @example
   * // Set language cookie with an expiration date:
   * browser.setCookie('site_language', {value: 'en', expires: expirationDate});
   */
  setCookie() {
    if (_.isString(arguments[0])) {
      const cookieData = {};
      cookieData.name = arguments[0];
      if (_.isReallyObject(arguments[1])) {
        _.extend(cookieData, arguments[1]);
      } else {
        cookieData.value = arguments[1];
      }
      return this._zombieBrowser.setCookie(cookieData);
    } else {
      _.each(arguments[0], (v, k) => this.setCookie(k, v));
    }
  }
  /**
   * Delete cookie
   * @param {string} id - Id of the cookie to delete
   * @example
   * // Delete cookie
   * browser.deleteCookie('site_language');
   */
  deleteCookie(id) { this._zombieBrowser.deleteCookie(id); }

  /**
   * Delete all cookies
   * @example
   * // Delete all cookies
   * browser.deleteCookies();
   */
  deleteCookies() { this._zombieBrowser.deleteCookies(); }

  /**
   * Dump internal browser information
   * @example
   * // Dump information
   * browser.dump();
   * // => Zombie: 4.2.1
   * // URL:    https://example.org
   * // History:
   * // ...
   * // Cookies:
   * // ...
   * // Storage:
   * // Document:
   * // ...
   */
  dump() {
    return this._zombieBrowser.dump();
  }

  /**
   * Schedule a callback to be executed
   * @param {function} callback - Callback to execute. It will be passed the current Document object
   * @example
   * // Get the html title after visiting a page
   * browser.visit('http//example.org').then( (document) => console.log(document.title) );
   * // => 'Example'
   */
  then(cb) {
    if (!_.isFunction(cb)) throw new Error('You must provide a function');
    return this._addStep('then', cb);
  }

  /**
   * Visit an url
   * @param {string} url - Url to visit
   * @param {number|string|function} [wait] - How long to wait, selector to wait for or function to expect to be true
   * @example
   * browser.visit('http//example.org').exec();
   */
  visit(url, options) {
    options = _.opts(options, {wait: null});
    return this._addStep('visit', this._cleanupUrl(url), options);
  }

  /**
   * Press a button
   * @param {string} selector - Button to press
   * @param {number|string|function} [wait] - How long to wait, selector to wait for or function to expect to be true
   * @example
   * // Submit form
   * browser.press('Submit');
   */
  press(what, options) {
    options = _.opts(options, {wait: null});
    return this._addStep('press', what, options);
  }

  /**
   * Click a link
   * @example
   * // Click Home link
   * browser.click('Home');
   */
  click(what) {
    return this._addStep('click', what);
  }

  /**
   * Check checkbox
   * @example
   * browser.check('Accept License');
   */
  check(what) {
    return this._addStep('check', what);
  }

  /**
   * Uncheck checkbox
   * @example
   * browser.uncheck('Send Feedback');
   */
  uncheck(what) {
    return this._addStep('uncheck', what);
  }

  /**
   * Wait for the browser to finish loading resources or until a certain condition is met
   * @param {number|string|function} what - How long to wait, selector to wait for or function to expect to be true
   * @example
   * // Wait for a link to appear
   * browser.wait('a[href="/help"]');
   * @example
   * // Wait 5 seconds
   * browser.wait('5s');
   * @example
   * // Wait for a function to return true
   * browser.wait(() => !!browser.query('#root'));
   */
  wait(what) {
    return this._addStep('wait', what);
  }

  /**
   * Choose a radio button option
   * @param {string} selector - CSS selector, field value or or text fo the field label
   * @example
   * browser.choose('Full Installation');
   */
  choose() {
    let data = {};
    if (arguments.length === 2) {
      data = {input: arguments[0], option: arguments[1]};
    } else {
      data = {input: null, option: arguments[0]};
    }
    return this._addStep('choose', data);
  }

  /**
   * Select and dropdown option
   * @param {string} selector - CSS selector, field value or or text fo the field label
   * @param {string} value - Value or option to select
   * @example
   * browser.select('Hobby', 'Reading');
   */
  select(selector, value) {
    return this._addStep('select', {key: selector, value: value});
  }
}


module.exports = Browser;
