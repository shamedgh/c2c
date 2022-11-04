'use strict';

const nfile = require('nami-utils/file');
const _ = require('nami-utils/lodash-extra.js');
const Mocha = require('mocha');
const chai = require('chai');
const chaiFs = require('chai-fs');
const chaiSubset = require('chai-subset');

chai.use(chaiFs);
chai.use(chaiSubset);

const expect = chai.expect;

class TestRunner {
  constructor(options) {
    options = _.opts(options, {context: {}, callback: null});
    this.callback = options.callback || function() {};
    const extraContext = options.context;
    this._mocha = new Mocha();

    this._mocha.suite.on('pre-require', function(context) {
      // Extend the context glbal vars
      _.extend(context, {chai: chai, expect: expect});
      _.extend(context, extraContext);

      // Extend 'it' to support a case ID
      context.testCase = function(id, msg, testFn) {
        return context.it(`[${id}] ${msg}`, testFn);
      };
    });
  }
  configureReporter(options) {
    options = _.opts(options, {reporter: 'spec', fileReporter: 'xunit', reportFile: null});
    if (_.isEmpty(options.reportFile)) {
      this._mocha.reporter(options.reporter);
    } else {
      // phabricator#D5901#inline-25032 ... Once mocha officially supports multiple reporters,
      // you should remove the dependency with mocha-multi
      // https://github.com/mochajs/mocha/pull/1772
      const reporterOptions = {};
      reporterOptions[options.reporter] = {stdout: '-'};
      reporterOptions[options.fileReporter] = {stdout: options.reportFile};
      this._mocha.reporter('mocha-multi', reporterOptions);
    }
  }
  addFile(f) {
    this._mocha.addFile(f);
  }
  addDirectory(dir, options) {
    options = _.opts(options, {include: ['*'], exclude: [], grep: null});
    if (options.grep !== null) {
      this._mocha.grep(options.grep);
    }
    _.each(nfile.glob(`${dir}/*.js`), f => {
      if (nfile.matches(f, options.include, options.exclude)) this.addFile(f);
    });
  }
  run(fn) {
    return this._mocha.run(fn || this.callback);
  }
}

module.exports = TestRunner;
