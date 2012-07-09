"use strict";

/**
 * If used, ensures the app is really working in HTTPS
 * In reality, or behind a proxy
 *
 * We could use `request.protocol` but we don't want to alter security
 *
 * @return {Function}
 */
function replaceProtocol (req){
  return req.url.replace(/^http:/i, 'https:');
}

module.exports = function(){

  function ensureHttpsMiddleware(req, res, next){
    next();

    if (req.protocol === 'http' && req.connection.encrypted === false){
      res.redirect(replaceProtocol(req));
    }
  }

  return ensureHttpsMiddleware;
};

module.exports.replaceProtocol = replaceProtocol;