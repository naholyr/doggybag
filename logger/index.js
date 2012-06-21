/**
 * Generic logger configured depending on env.
 */

'use strict';

var winston = require('winston');

var loggers = module.exports = {};

loggers.cli = winston.cli();

loggers.add = function add(names, config) {
  // Default config = embedded configuration handler using "logging" category
  if (!config) {
    config = require('../config').logging;
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
    // In that case, option could be a single object only for this logger
    if (typeof config.get !== 'function' && !config[names]) {
      var loggerConfig = config;
      config = {};
      config[names] = loggerConfig;
    }
    // Force array
    names = [names];
  }
  // Reserved name
  if (~names.indexOf('add')) {
    throw new Error("'add' can't be used as a logger name, you could also divide by zero if you want to break the universe");
  }
  // Initialize loggers
  var initializedLoggers = [];
  names.map(String).forEach(function (name) {
    loggers[name] = winston.loggers.add(name, getConfig(name));
    initializedLoggers.push(loggers[name]);
  });
  // Return initialized loggers, keeping homogeneity with parameters format
  if (initializedLoggers.length === 1) {
    return initializedLoggers[0];
  } else {
    return initializedLoggers;
  }
};
