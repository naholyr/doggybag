"use strict";

var fields = module.exports = {};

var forms = require('forms');

/**
 * Usage: same as forms.fields.string
 *
 * File upload field.
 *
 * WARNING: form.handle() will not bind req.files but only req.body, you have to manually handle this before calling
 * form.bind() or form.handle() or this field will never receive value
 *
 * @param opt
 * @return {*}
 */
fields.file = function (opt) {
  opt = opt || {};
  var f = forms.fields.string(opt);
  f.widget = opt.widget || forms.widgets.file();
  f.parse = function (raw_data) {
    return raw_data;
  };
  return f;
};

/**
 * Usage: same as forms.fields.string
 *
 * This field will always have a value, even when using form.handle() or form.bind() with undefined value, it will
 * then use its default value.
 *
 * Works obviously very better if you specify default value with opt's "value" parameter
 *
 * @param opt
 * @return {*}
 */
fields.constant = function (opt) {
  opt = opt || {};
  var f = (opt.type || forms.fields.string)(opt);
  f._bind = f.bind;
  f.bind = function (raw_data) {
    return this._bind(raw_data || this.value);
  };
  return f;

};
