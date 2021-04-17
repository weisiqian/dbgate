const os = require('os');
const path = require('path');
const fs = require('fs');
const cleanDirectory = require('./cleanDirectory');
const platformInfo = require('./platformInfo');

const createDirectories = {};
const ensureDirectory = (dir, clean) => {
  if (!createDirectories[dir]) {
    if (clean && fs.existsSync(dir)) {
      console.log(`Cleaning directory ${dir}`);
      cleanDirectory(dir);
    }
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory ${dir}`);
      fs.mkdirSync(dir);
    }
    createDirectories[dir] = true;
  }
};

function datadir() {
  const dir = path.join(os.homedir(), 'dbgate-data');
  ensureDirectory(dir);

  return dir;
}

const dirFunc = (dirname, clean = false) => () => {
  const dir = path.join(datadir(), dirname);
  ensureDirectory(dir, clean);

  return dir;
};

const jsldir = dirFunc('jsl', true);
const rundir = dirFunc('run', true);
const uploadsdir = dirFunc('uploads', true);
const pluginsdir = dirFunc('plugins');
const archivedir = dirFunc('archive');
const filesdir = dirFunc('files');

function packagedPluginsDir() {
  if (platformInfo.isDevMode) {
    return path.resolve(__dirname, '../../../../plugins');
  }
  if (platformInfo.isDocker) {
    return '/home/dbgate-docker/plugins';
  }
  if (platformInfo.isNpmDist) {
    // node_modules
    return global['dbgateApiPackagedPluginsPath'];
  }
  if (platformInfo.isElectronBundle) {
    return path.resolve(__dirname, '../../plugins');
  }
  return null;
}

const packagedPluginList =
  packagedPluginsDir() != null ? fs.readdirSync(packagedPluginsDir()).filter(x => x.startsWith('dbgate-plugin-')) : [];

function getPluginBackendPath(packageName) {
  if (packagedPluginList.includes(packageName)) {
    if (platformInfo.isDevMode) {
      return path.join(packagedPluginsDir(), packageName, 'src', 'backend', 'index.js');
    }
    return path.join(packagedPluginsDir(), packageName, 'dist', 'backend.js');
  }

  return path.join(pluginsdir(), packageName, 'dist', 'backend.js');
}

module.exports = {
  datadir,
  jsldir,
  rundir,
  uploadsdir,
  archivedir,
  ensureDirectory,
  pluginsdir,
  filesdir,
  packagedPluginsDir,
  packagedPluginList,
  getPluginBackendPath,
};
