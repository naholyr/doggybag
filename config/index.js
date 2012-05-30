/**
 * Main configuration file;
 * Used to load the settings matching an application/env pair.
 */

'use strict';

// Dependencies
var nconf = require('nconf');
var path = require('path');

// Always grab env and CLI variables
nconf.env().argv();

// Exposed API
var config = module.exports = {};

// Expose nconf module
config.nconf = nconf;

// Expose stores shortcuts
config.stores = nconf.stores;

// Initialize a new provider from files, or
config.add = function add (name, options) {

  // Support call "add(options)" without name
  if (typeof name === 'object' && !options) {
    options = name;
    name = null;
  }
  // Default = empty options
  options = options || {};
  // Default name is type if defined, or "config"
  if (!name) {
    name = options.type || 'default';
  }

  // Files can be defined as option "files" or "file"…
  var dir = options.dir || path.join(process.cwd(), 'config');
  var files = options.files || options.file;
  if (typeof files === 'string') {
    files = [ files ];
  } else if (!options.type) {
    // … or depend on context: env, suffix, and config directory
    var env = (options.env || process.env.NODE_ENV).toLowerCase();
    var suffix = options.suffix || env;
    files = [ name + ".json", name + "." + suffix + ".json" ];
  }

  // Add config provider depending on configuration
  if (files) {

    // Load from file(s)

    // Absolutize paths and keep existing ones only
    files = files.map(function (file) { return path.resolve(dir, file) });
    files = files.filter(path.existsSync);
    if (files.length > 1) {
      // Multiple files: merge (last one has priority)
      nconf.add(name, { "type": "memory", "loadFrom": files });
    } else if (files.length > 0) {
      // Single file
      nconf.add(name, { "type": "file", "file": files[0] });
    } else {
      // Nothing to load !
      throw new Error('No file found !')
    }

  } else {

    // options are standard nconf options, just use them
    nconf.add(name, options);

  }

  // Expose for easy access: require('doggybag/config').myApp
  if (!options.noShortcut) {
    config[name] = nconf.stores[name];
  }

  // Return initialized provider
  return nconf.stores[name];
};
