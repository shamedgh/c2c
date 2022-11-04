'use strict';

const _ = require('./lodash-extra.js');
const os = require('os');

const platformInfo = _.once(function() {
  const arch = os.arch();
  const suffix = arch.match(/x64/) ? 'x64' : 'x86';

  let platform = 'unknown';
  const platformInfoData = {os: {}};
  platformInfoData.os.platform = os.platform();
  platformInfoData.os.arch = arch;
  platformInfoData.cpus = os.cpus();

  switch (platformInfoData.os.platform) {
    case 'linux':
      platform = `linux-${suffix}`;
      break;
    case 'darwin':
      platform = `osx-${suffix}`;
      break;
    case 'win32':
    case 'win64':
      platform = `windows-${suffix}`;
      break;
    default:
      platform = platformInfoData.os.platform;
  }
  platformInfoData.platform = platform;
  return platformInfoData;
});

const platform = platformInfo().platform;
const isWindows = /^windows/.test(platform);
const isUnix = !isWindows;

// TODO: improve this
const tmpDir = (isUnix ? '/tmp/' : null) || process.env.TMPDIR
        || process.env.TMP
        || process.env.TEMP
        || (isWindows ? 'c:\\windows\\temp\\' : '/tmp/');

module.exports = {
  system: platformInfo(),
  paths: {tmpDir: tmpDir}
};
