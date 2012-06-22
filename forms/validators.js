"use strict";

var validators = module.exports = {};

/**
 * Usage: field.validators.push(forms.validators.choices([ val1, val2, ... ]))
 *
 * Will fail if field's value is not included in choices.
 *
 * @param choices
 * @return {Function}
 */
validators.choices = function validatorChoices(choices) {
  return function (form, field, callback) {
    var valids = choices || field.choices;
    var values = field.data;
    if (!Array.isArray(values)) values = [values];
    var invalidValues = values.reduce(function (invalids, value) {
      if (typeof valids[value] === 'undefined') {
        invalids.push(value);
      }
      return invalids;
    }, []);
    if (invalidValues.length) {
      callback('Unexpected values: ' + invalidValues.join(', '));
    } else {
      callback();
    }
  };
};
