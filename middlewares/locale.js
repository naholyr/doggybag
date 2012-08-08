"use strict";

/**
 * Provides a locale to the app based on the request user
 *
 * @param options
 * @return {Function}
 */

module.exports = function(options){
  //(B)ackward compatibility
  if (Array.isArray(options)){
    options = { acceptedLocales: options };
  }

  options.acceptedLocales = options.acceptedLocales || [];
  options.fallbackLocale = options.fallbackLocale || 'en';

  options.acceptedLocales = options.acceptedLocales.map(function(locale){
    return locale.toLowerCase();
  });

  return function localeMiddleware(req, res, next){
    // Already set? Skip
    if (req.locale){
      return next();
    }

    // No header? Use the fallback
    if (!req.header('Accept-Language')){
      req.locale = options.fallbackLocale;
      return next();
    }

    // Otherwise set the default and autodetect
    req.locale = options.fallbackLocale;
    req.header('Accept-Language').split(',').some(function(locale){
      locale = locale.split(';')[0].trim().toLowerCase();

      // Basic match
      if (~options.acceptedLocales.indexOf(locale)){
        req.locale = locale;

        return true;
      }

      // Trying to detect if the provided long locale matches an accepted short one
      locale = locale.split(/[\-_]/)[0];

      if (~options.acceptedLocales.indexOf(locale)){
        req.locale = locale;

        return true;
      }
    });

    next();
  };
};