/**
 * Generic logger configured depending on env.
 */

'use strict';

var winston = require('winston');

var loggers = module.exports = {};

loggers.cli = winston.cli();

loggers.add = function add(names, config) {
  // Default config = embedded configuration handler using "logging" category
  if (!config || typeof config === 'string') {
    config = require('../config').stores[config || 'logging'];
    if (!config) {
      throw new Error('Configuration not found (' + config + ')');
    }
  }
  // Retrieve a config part: supports hash or nconf-styled ".get"
  var getConfig = function (name) {
    if (typeof config.get === 'function') {
      return config.get(name);
    } else {
      return config[name];
    }
  };
  // default names
  if (!names) {
    names = "default";
  }
  // names can be a single name
  if (!Array.isArray(names)) {
    // In that case, and only if we work with a hash config, it can be a single hash for this single logger
    if (typeof config.get !== 'function') {
      var loggerConfig = config;
      config = {};
      config[names] = loggerConfig;
    }
    // Force array
    names = [names];
  }
  // require at least a name
  if (!names.length) {
    throw new Error('Empty list of loggers');
  }
  // reserved name
  if (~names.indexOf('add')) {
    throw new Error("'add' can't be used as a logger name, you could also divide by zero if you want to break the universe");
  }
  // Initialize loggers
  var initializedLoggers = [];
  names.map(String).forEach(function (name) {
    var options = getConfig(name);
    if (!options) {
      throw new Error('Logger "' + name + '" has no defined configuration!');
    }
    loggers[name] = winston.loggers.add(name, options);
    initializedLoggers.push(loggers[name]);
  });
  // Return initialized loggers, keeping homogeneity with parameters format
  if (initializedLoggers.length === 1) {
    return initializedLoggers[0];
  } else {
    return initializedLoggers;
  }
};
