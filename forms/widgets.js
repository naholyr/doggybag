"use strict";

var widgets = module.exports = {};

/**
 * Usage: field.widget = forms.widgets.html('<input>')
 *
 * Widget rendering direct HTML
 *
 * @param html
 * @return {Object}
 */
widgets.html = function (html) {
  return {
    "type":"html",
    "toHTML":function () {
      return html
    }
  };
};

/**
 * Usage: same as forms.widgets.text
 *
 * Renders as <input type="file">
 *
 * @param opt
 * @return {Object}
 */
widgets.file = function (opt) {
  opt = opt || {};
  var w = {};
  w.classes = opt.classes || [];
  w.type = "file";
  w.toHTML = function toHTML(name, f) {
    f = f || {};
    var html = '<input type="file" name="' + name + '" id="' + (f.id || 'id_' + name) + '"';
    if (w.classes.length) {
      html += ' class="' + w.classes.join(' ') + '"';
    }
    html += ' />';
    return html;
  };
  return w;
};
