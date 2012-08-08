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

  return function localeMiddleware(req, res, next){
    // Already set? Skip
    if (req.locale){
      return next();
    }

    // No header? Use the fallback
    if (!req.headers['Accept-Language']){
      req.locale = options.fallbackLocale;
      return next();
    }

    // Otherwise set the default and autodetect
    req.locale = options.fallbackLocale;

    req.headers['Accept-Language'].split(',').some(function(locale){
      locale = value.split(';')[0].trim();

      if (~options.acceptedLocales.inArray(locale) || ~options.acceptedLocales.inArray(locale.split(/[\-_]/)[0])){
        req.locale = locale;

        return true;
      }
    });

    next();
  };
};