'use strict';

const _ = require('../lodash-extra.js');

function validatePortFormat(port) {
  const normalizedPort = parseInt(port, 10);
  if (!_.isFinite(normalizedPort)) {
    throw new Error(`${port} is not a valid number`);
  } else if (normalizedPort < 0 || normalizedPort > 65535) {
    throw new Error(`${normalizedPort} is not within the valid range (0-65535)`);
  }
}

module.exports = {validatePortFormat};
