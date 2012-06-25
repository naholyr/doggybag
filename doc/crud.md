CRUD generator
==============

**TODO**

* Display error messages
* Configurable list mode
* Base reusable templates

Basic usage
-----------

Minimal usage:

```javascript
app.use('/items', crud.init({
  "model": models.Item,
  "form": function (forms, cb) {
    var form = forms.create(...);
    cb(null, form);
  }
}));
```

This will add the following routes to your app:

* GET /items -> List your items
* GET /items/create -> display a form to create a new item
* POST /items/delete/:id -> delete item
* GET /items/:id -> display a form to edit item
* POST /items/:id -> update item and redirect to edit
* POST /items -> create item and redirect to edit

This will also add the following variable:

* req.object -> current edited item
* req.objects -> list all items
* req.form -> current form instance
* object, objects, and form are also usable within corresponding views

This will require the following templates:

* objects/list.html (extension depends on main app's configuration)
* objects/edit.html (idem)

Configuration
-------------

Following options are available:

* `model`: Mongoose model class.²
* `form` (mandatory): function(forms, fn), fn being a function(error, form). Generates the form.
* `varname`: name used for single object availability in view and req. Default = `'object'`.
* `varsname`: name used for objects list availability in view and req. Default = `varname + 's'`.
* `views`: views directory, from where views "edit" and "list" will be rendered. Default = `'crud'`.
* `new`: function(data, fn), fn being a function(error, object). Creates a new model instance from posted data. Default = `new model(data).save(fn)`.
* `update`: function(object, data, fn), fn being a function(error, object). Update object from posted data. Default calls `model.update`.
* `findOne`: function(id, fn), fn being a function(error, object). Find object by id. Default calls `model.findById`.
* `nbPerPage`: number of items per page, will be used by `findAll` and `countPages`. Default is 25.
* `defaultSort`: default sort configuration, it's an array of couples ["key", "order"], where order is "ascending" or "descending". Default is `[['_id', 'ascending']]`.
* `findAll`: function(page, nbPerPage, sortKey, fn), fn being a function(error, objects). Find all objects for given page, sorted by given key. Default calls `model.find`.
* `countPages`: function(nbPerPage, fn), fn being a function(error, nbPages). Calculates the total number of pages. Default obviously calls `model.count()` and divides by `nbPerPages`.
* `values`: function(object, fn), fn being a function(error, values). Retrieves default form values from object. Default calls `object.toObject`.
* `renderForm`: function(form, forms, fn), fn being a function(error, html). Generates form's HTML. Default calls `form.toHTML` with dedicated Twitter Bootstrap renderer.
* `beforeEdit`, `beforeList`, `onError`: Express middlewares. Default just call `next()`.
* `prefix`: a specific prefix applied to all routes. Default is empty.
* `editLocals`: function(object, fn), fn being a function(err, locals). Defines locals to be passed to "edit" view. If you use default views, you must define `title` and `save_url` locals.
* `listLocals`: function(objects, fn), fn being a function(err, locals). Defines locals to be passed to "list" view. If you use default views, you must define `title`, `filters`, `table` and `empty` locals.

You **must** provide `model` or the five following model options `new`, `update`, `findOne`, `findAll` and `countPages`.

Note that `form`, `new`, `update`, `findOne`, `findAll`, `countPages` and `values` callback all take `req` and `res` as additional last parameters, whenever you would need it.

Using default views
-------------------

You can define your own "edit" and "list" views, or rely on defaults present in "crud" views directory.

If you rely on defaults, you must provide locals by defining options `editLocals` and `listLocals`.

```javascript
function editLocals (user, cb, req, res) {
  res.partial('path/to/edit_title', function (err, html) { cb(err, { "title": html }); });
}
```

You can use a helper to define those two functions:

```javascript
// crud.helpers.defineLocals(partials, strings)
options.editLocals = crud.helpers.defineLocals({ "title": "path/to/edit_title" });
options.listLocals = crud.helpers.defineLocals({ "table": "path/to/list_table" }, { "empty": "No document found, you should create one!" });
```

* First hash defines asynchronous operations:
  * a string will be interpreted as the path to a partial
  * a function will be called as function(objects, fn, req, res) where fn is function(err, value)
* Second hash defines direct operations:
  * a string will be used as-is
  * a function will be called as function(objects, req, res) and its result used as value

Field values
------------

Default value for each field is given from (greatest to lowest priority):

* `field.modelValue` (see forms additions)
* `values` option callback
* `object[fieldName]` (default)

Forms additions
---------------

`crud.js` adds following elements to default `forms` module:

* `forms.render.twBootstrap` is a dedicated rendering for Twitter Bootstrap control groups.
* `forms.validators.choices` is a validator for `multipleCheckbox` or `multipleSelect` widgets.
* `forms.fields.file` adds a file input field.
* `forms.fields.constant` may not be present in req.body, it will directly use its default value (very useful with `forms.widgets.html`).
* `forms.widgets.html` allows to include direct HTML in your form.
* `forms.widgets.file` will render file input.

In addition to this, it adds specific support for additional keys in field declaration:

* `help`: a help message (used only with `twBootstrap` renderer)
* `modelValue`: a callback used to populate form from model. This is especially useful if you do not plan to map each field to the corresponding model key. It can be declared in two flavors:
  * synchronous: function(object) -> return value
  * asynchronous: function(object, fn) -> calls fn(error, value)
* `htmlValidators`: a hashmap `attributeName: attributeValue` that will enable fields customization (done with client-side JavaScript to avoid uncertain string replacements), for example add `"htmlValidators": { "type": "email" }` to mark your input as validated against email syntax.
