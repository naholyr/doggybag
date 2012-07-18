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
  return 'https://' + req.headers.host + req.url;
}

module.exports = function(options){
  options = options || {};
  options.envs = options.envs || [];

  function ensureHttpsMiddleware(req, res, next){
    // Skip if it's not in the proper environment
    if (options.envs.length && ~options.envs.indexOf(req.app.settings.env) === 0){
      return next();
    }

    if (req.protocol !== 'https' && req.headers['x-forwarded-proto'] !== 'https'){
      return res.redirect(replaceProtocol(req));
    }

    next();
  }

  return ensureHttpsMiddleware;
};

module.exports.replaceProtocol = replaceProtocol;