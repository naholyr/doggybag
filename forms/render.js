"use strict";

var render = module.exports = {};

/**
 * Usage: form.toHTML(forms.render.twBootstrap)
 *
 * Renders fields using Twitter Bootstrap conventions (control-group, control-label, etc).
 *
 * TODO Better error handling
 *
 * TODO Make Dijiwan-specific code configurable
 *
 * @param name
 * @param field
 * @return {String}
 */
render.twBootstrap = function renderTwBootstrap(name, field) {
  var error = field.errorHTML(); // <p class="error_msg">…</p>
  var html = '<div class="control-group' + (error ? ' error' : '') + '">';
  // Label
  html += '<label class="control-label"';
  if (!field.widget.type.match(/^multiple/)) {
    var id = field.id || 'id_' + name;
    html += ' for="' + id + '"';
  }
  html += '>' + field.labelText(name);
  if (error) {
    html += '<div class="help-inline">' + error + '</div>';
  }
  html += '</label>';
  // Field content
  html += '<div class="controls">';
  // Field content: Input
  if (field.widget.type.match(/^multiple(Checkbox|Radio)$/)) {
    html += '<div class="multiple well">'; // TODO configurable
    html += (function (name, f) {
      var w = f.widget;
      if (!w.classes || !~w.classes.indexOf('input-xlarge')) {
        w.classes = (w.classes || []).concat(['input-xlarge']);
      }
      return Object.keys(f.choices).reduce(function (html, k) {
        // start label
        html += '<label class="checkbox">';
        // input element
        html += '<input type="' + (f.widget.type.match(/radio/i) ? 'radio' : 'checkbox') + '"';
        html += ' name="' + name + '"';
        if (w.classes.length) {
          html += ' class="' + w.classes.join(' ') + '"';
        }
        html += ' value="' + k + '"';
        if (Array.isArray(f.value)) {
          if (f.value.some(function (v) {
            return v === k;
          })) {
            html += ' checked="checked"';
          }
        } else {
          html += f.value === k ? ' checked="checked"' : '';
        }
        html += '>';
        // close label
        html += ' ' + f.choices[k] + '</label>';
        return html;
      }, '');
    })(name, field);
    html += '</div>'; // multiple
  } else {
    var w = field.widget;
    if (!w.classes || !~w.classes.indexOf('input-xlarge')) {
      w.classes = (w.classes || []).concat(['input-xlarge']);
    }
    html += w.toHTML(name, field);
  }
  // Field content: Help
  if (field.help) {
    html += '<p class="help-block">' + field.help + '</p>';
  }
  // Field content: end
  html += '</div>'; // class=controls

  html += '</div>'; // class=control-group

  return html;
};
