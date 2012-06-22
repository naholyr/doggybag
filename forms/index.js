"use strict";

/**
 * Extend module "forms"
 *
 * @type {*}
 */

var forms = module.exports = require('forms');

var extensions = require('./extensions');

Object.keys(extensions).forEach(function (category) {
  Object.keys(extensions[category]).forEach(function (extName) {
    forms[category][extName] = extensions[category][extName];
  });
});

/**
 * Monkey-patch forms.create so that returned
 * form as a monkey-patched form.bind which
 * supports file uploads.
 *
 * Monkeyception !
 */
(function (forms) {
  var originalCreate = forms.create.bind(forms);
  forms.create = function create(fields) {
    var form = originalCreate(fields);
    var bind = form.bind;
    form.bind = function bindWithFiles(inputs, files) {
      var data;
      if (files) {
        data = {};
        Object.keys(inputs || {}).forEach(function (k) {
          data[k] = inputs[k];
        });
        Object.keys(files || {}).forEach(function (k) {
          data[k] = files[k];
        });
      } else {
        data = inputs;
      }
      return bind.call(form, data);
    };
    return form;
  };
})(forms);
