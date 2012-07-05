"use strict";

/**
 * Provides useful stuff when a proxy is in front of the node app
 *
 * Express 3.x will make this obsolete
 *
 * * @param options
 * @return {Function}
 */

module.exports = function(options){

  return function proxyMiddleware(req, res, next){
    var hostValue = req.headers['x-forwarded-host'];

    // Altering host
    if (hostValue !== undefined){
      req.headers.host = hostValue.split(',').map(function(el){
        return el.toString().trim();
      }).shift();
    }

    next();
  };
};