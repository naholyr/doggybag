# Forms Extended

Provides some utilities for [forms](https://github.com/caolan/forms),
like Twitter Bootstrap templating and so on.

```javascript
var forms = require('doggybag/forms')
```

`forms` is the original @caolan's `forms` object, enhanced with a few additions.

## Additions

### `fields`

* `file`: file upload field
* `constant`: an invariable value text field

### `render`

* `twBootstrap`: a renderer for Twitter Bootstrap, with error handling

### `validators`

* `choices`: will fail if field's value is not included in choices

### `widgets`

* `html`: renders direct HTML. Convenient when a "field" is in fact a complex structure (such as another rendered form)
* `file`: Renders as `<input type="file">`

### `bind`

We also slightly modified (by monkey patching `forms.create`) `form.bind()` so that it can handle files too.

Instead of calling `form.bind(req.body)` you can call `form.bind(req.body, req.files)` if you have file uploads
in your form.

## Usage

See original README (from @caolan) for usage. You can just use the additions like the base features. Simple example below:

```javascript
var forms = require('doggybag/forms');

var form = forms.create({
  "username": forms.fields.string({ required:true }),
  "gender":   forms.fields.string({ widget:forms.widgets.multipleCheckbox({}), choices:['M','F','X'], validators:[forms.validators.choices()] }),
  "avatar":   forms.fields.file({ help:"Less than 200K" })
});

// Handling form
form.bind(req.body, req.files).validate(function(err, f) {
  if (f.isValid()) {
    // OK: redirect ?
  } else {
    // Error: display form again (errors will be automatically shown) ?
  }
});

// show form (including errors eventually)
var html = form.toHTML(forms.render.twBootstrap);
```
