'use strict';
const crypto = require('crypto');
const _ = require('lodash');

function generateRandomData(options) {
  options = _.defaults(options || {}, {maxBytes: 2000 * 1024, minBytes: 5 * 1024});
  const minBytes = options.minBytes;
  const maxBytes = options.maxBytes;
  const size = _.random(minBytes, maxBytes);
  // Ensure we really can trust the data
  if (size < minBytes || size > maxBytes) {
    throw new Error(`Size of random data to calculate is not in the speficied range`);
  }
  const data = crypto.pseudoRandomBytes(size).toString('binary');
  if (data.length !== size) {
    throw new Error(`Invalid size of random data generated`);
  }
  return data;
}

module.exports = {generateRandomData};
