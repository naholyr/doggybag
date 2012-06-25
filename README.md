# doggybag

[![Build Status](https://secure.travis-ci.org/Dijiwan/doggybag.png?branch=master)](http://travis-ci.org/Dijiwan/doggybag)

At [Dijiwan](http://dijiwan.com), we use JavaScript a lot, especially with *node.js*.
We have common needs across our project, so we decided to package them, and
make them available publicly.

**A brief word of History**
While looking a name for this project, we asked to translate the word *toolbox*
in Japanese to our japanese-speaking-guy
([Guillaume](https://github.com/gmarty)).

As his answer *dôgubako* (道具箱) sounded like *doggybag*, we laughed and decided to call it as is.
It's also a way to carry delicious stuff at home, or at work.



## Forms Extended

Provides some utilities for [forms](https://github.com/caolan/forms),
like Twitter Bootstrap templating and so on.

```javascript
var forms = require('doggybag/forms')
```

`forms` is the original @caolan's `forms` object, enhanced with a few additions.

### Additions

#### `fields`

* `file`: file upload field
* `constant`: an invariable value text field

#### `render`

* `twBootstrap`: a renderer for Twitter Bootstrap, with error handling

#### `validators`

* `choices`: will fail if field's value is not included in choices

#### `widgets`

* `html`: renders direct HTML. Convenient when a "field" is in fact a complex structure (such as another rendered form)
* `file`: Renders as `<input type="file">`

#### `bind`

We also slightly modified (by monkey patching `forms.create`) `form.bind()` so that it can handle files too.

Instead of calling `form.bind(req.body)` you can call `form.bind(req.body, req.files)` if you have file uploads
in your form.

### Usage

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



## Config loader (using `nconf`)

It is used to cascade and augment several configuration files. Pretty neat
to have a common configuration augmented according to the process `env`.

### Usage

```javascript
// In your bootstrap
require('doggybag/config').add('myApp');

// Later in your code
require('doggybag/config').myApp.get('key')
```

### Options

`add()` can take a bunch of options as second argument:

* `type` can be defined, but then it's exactly like you used `nconf.add`. This is useful if you want to use some non-files providers. You could also user `require('doggybag/config').nconf` which is exposed on purpose. If it's defined, all following options are ignored.
* `dir` is the base directory where you put your configuration files. Default is `$PWD/config`.
* `files` provides directly the list of files to be loaded (they can be relative to `dir`). If it's not specified, the files will be guessed from `env`.
* `env` will be used to guess what files should be loaded: `<name>.json` + `<name>.<env>.json` . Default is `$NODE_ENV`.
* `noShortcut` will disable the shortcut to your provider as a module attribute. This can be mandatory if your configuration name matches an already existing attribute like one of the following: `nconf`, `add`, and `stores`. If you don't use any of this reserved names, feel happy.

### How we use it

```bash
$ ls /path/to/app/config
myApp.json myApp.development.json myApp.production.json myApp.test.json
```

**/path/to/app/app.js**

```javascript
process.chdir(__dirname);

require('doggybag/config').add(); // General purpose configuration
require('doggybag/config').add('logging'); // Winston configuration
require('doggybag/config').add('database'); // Mongoose configuration
```

**/path/to/app/lib/myLib.js**
```javascript
var conf = require('doggybag/config').default;

var x = conf.get('…');
```


## Logger

An wrapper that will automatically configure several `winston` loggers using
your configuration (works very well with `doggybag/config`).

### Usage

```javascript
// In your bootstrap
require('doggybag/logger').add('myApp'); // grab config from 'logging.json', key "myApp"

// Later in your code
var logger = require('doggybag/logger').myApp;

logger.warn('This may not occur');
```

### Options

`add()` takes two parameters:

* The name of the logger: This will be used to retrieve the logger with `require('doggybag/logger').yourLoggerName`. If you don't give one, "default" will be used.
* The options for your logger. Check `winston`'s per-transport configuration for this.

Sample usage:

```javascript
var logger = require('doggybag/logger');

logger.add('default', {
  console: {
    level: "warn",
    colorize: true,
    timestamp: true,
    handleExceptions: true
  }
});

logger.default.debug('Hello, world'); // Should not be visible
logger.default.warn('World ? Hello ?'); // Should be visible
```

#### Initializing multiple loggers

Note that you can configure several loggers at once. In this case you must use a hash of configurations:

```javascript
logger.add(['app1', 'app2'], {
  app1: { /* configuration for logger 1 */ },
  app2: { /* configuration for logger 1 */ },
});

logger.app1.info('hello');
logger.app2.info('world');
```

In this case, the result returned by `add()` is the list of initialized loggers (same order).

### Command-line logger

A special logger `cli` is always available:

```javascript
require('doggybag/logger').cli.data('Some information');
```

### Working with `doggybag/config`

`doggybag/logger` works best with `doggybag/config` with some conventions:

* You have already initialized your configuration with for example `require('doggybag/config').add('logging');`.
* Your loaded configuration has a key for each logger you want to initialize.
* Then you can just omit the second parameter, everything will play nice.

Note that you can specify second parameter as a string if you want to use another config category than "logging".

### How we use it

```bash
$ ls /path/to/app/config
logging.json logging.development.json logging.production.json logging.test.json
```

The key configuration:

* in `logging.production.json`: `"file"` is configured and console is muted with `"console": { "silent": true }`.
* in `logging.development.json`: only `"console"` is configured and set to "debug" level.
* in `logging.test.json`: same as `production` to avoid pollution of test reports.

**/lib/logger.js**

```javascript
// Initialize configuration
var conf = require('doggybag/config');
conf.add('logging', { "dir": __dirname + "/../config" });
// Note: we add "loggers" in configuration

// Expose loggers
var log = module.exports = require('doggybag/logger');

// Initialize
log.add(conf.get('loggers'), conf);
```

**/path/to/app/app.js**
```javascript
var log = require('/path/to/lib/logger.js').frontend;

log.info('someone visited my website :O');
```

This way, whenever we want to change a logging behavior, or even add a new logger we just have to edit config JSON files.



## Express CRUD

See `doc/crud.md` for detailed documentation.

This component acts as an Express app builder you can use in your back-office. It's still in development and does not
provide the whole set of features we planned initially as we didn't need them immediately.

It's based on `forms`.

It's made to work natively with Mongoose models, but could work with any type of data, given you provide the necessary
access layers.

### Missing features

* Sorting in list mode
* Filtering in list mode
* Automatic helpers for partials:
  * URL generator
  * Confirmation for deletion
  * Pagination
  * …

### Installation

You may need to copy the templates in `node_modules/doggybag/crud/views` and customize them the way you want. These
are the "layouts" for your CRUD modules, they must fill in your global layout, and will be completed with partials
(you must write too) for edit and list modes.

### Usage

Example: to add a `/users` route to your app to manage your `User` model, you need to define a few partials and just
call `crud.init()`.

#### Partial `_list_table`

The template depends so much on your own style, and you could want something that is totally independent from your
model, then we decided to not provide any defaults or API for the list mode. Just display it the way you need.

```html
<table class="table table-striped">
  <thead>
  <tr>
    <th>{{_ "Name"}}</th>
    <th>{{_ "E-mail"}}</th>
    <th>{{_ "Actions"}}</th>
  </tr>
  </thead>
  <tbody>
  {{#each users}}
  <tr>
    <td><a href="{{../crud_basepath}}/{{_id}}"><strong>{{name}}</strong></a></td>
    <td><a href="mailto:{{email}}">{{email}}</a></td>
    <td><ul>
      <li><a href="{{../crud_basepath}}/{{_id}}" class="btn">{{_ "Edit"}}</a></li>
      <li><a href="#" onclick="(function(f){if(confirm('{{_ "Are you sure you want to permanently delete user `%s`?" name}}')){f.action='{{../crud_basepath}}/delete/{{_id}}';f.submit();}return false;})(document.getElementById('deleteForm'))">{{_ "Delete"}}</a></li>
        </ul>
      </div>
    </td>
  </tr>
  {{/each}}
  </tbody>
</table>

{{#if isPaginated}}
{{#if previousPage}}<a href="?page={{previousPage}}>«</a>{{/if}
{{numPage}}/{{nbPages}}
{{#if nextPage}}<a href="?page={{nextPage}}>»</a>{{/if}
{{/if}}
```

Note: `crud_basepath` is automatically defined and safe to use.

#### JavaScript

```javascript
var crud = require('doggybag/crud');

var users = crud.init({
  model: mongoose.model('User'),
  listLocals: crud.helpers.defineLocals({table: "projects/list_table"})
});

app.mount('/users', users);
```

### Options of `crud.init()`

* `model`: Mongoose model (if you don't define this option, you **must** define `findAll` & `countPages` & `findOne` & `new` & `update` & `remove`).
  * `new`: method to create a new object from form data (`function(data,cb)` with cb being `function(err,object)`, default calls `new model`).
  * `update`: method to update an object from form data (`function(object,data,cb)` with cb being `function(err,object)`, default calls `model.update`).
  * `remove`: method to delete an object (`function(object,cb)` with cb being `function(err)`, default calls `object.remove`).
  * `findAll`: method to find all elements (`function(page,nb,sort,cb)` with cb being `function(err,objects)`, default calls `model.find`).
  * `findOne`: method to find an alement by id (`function(id,cb)` with cb being `function(err,object)`, default calls `model.findById`).
  * `countPages`: method to count total number of pages (`function(nbPerPage,cb)`, cb being `function(err,nbPages)`, default calls `model.count`).
* `views`: path to your views `edit` and `list` (defaults to embedded views so it can work out of the box given you use `hbs` template engine, but you may copy and customize those views).
* `prefix`: a prefix you can define if you need to "namespace" your URIs. Very useful for a CRUD about embedded documents.
* `gettext`: if you use a translation tool, and it's not `req.i18n.gettext` you need to override this option as `function(string,req)` which returns translated `string`.
* For edit mode:
  * `form`: mandatory `function(forms,cb)` with cb being a `function(err,generatedForm)`. This is where you build the edit form.
  * `varname`: variable name of your object in edit mode (default `object`).
  * `beforeEdit`: Express middleware called before rendering.
  * `editLocals`: called to define additional locals (`function(object,cb)` cb being `function(locals)`, default calls `cb(null)`).
  * `values`: method to calculate values passed to form, very useful if some fields are not corresponding to your model (`function(object,cb)`, cb being `function(err,values)`, default calls `object.toObject`).
  * `renderForm`: method to render your form (`function(form,forms,cb)` with cb being `function(err,html)`, default calls `form.toHTML(forms.render.twBootstrap)`).
* For list mode:
  * `varsname`: variable name of your objects's list in list mode (default `varname+'s'`).
  * `beforeList`: Express middleware called before rendering.
  * `nbPerPage`: pagination in list mode (default 25).
  * `defaultSort`: default sorting mode (an array of `[field,direction]`, default `[["_id", "asc"]]`).
  * `listLocals`: called to define additional locals (`function(objects,cb)` cb being `function(locals)`, default calls `cb(null)`).

### Available view locals

* In all modes
  * `crud_basepath` (string): the base URL.
  * `message` (object with keys `type` and `text`): a message to be displayed to user (error, success).
* In list mode
  * `objects` (array of object): contains the objects displayed. The variable name can be configured.
  * `isPaginated` (boolean): is number of pages greater than 1 ? The following variables are then defined:
    * `nbPages` (int): number of pages.
    * `numPage` (int): current page (taken from URL's parameter `page`, default 1).
    * `previousPage` (int): previous page (defined only if applicable).
    * `nextPage` (int): next page (defined only if applicable).
    * `pages` (array of int): all pages.
  * `title`: page title.
  * `empty` (boolean): if `count` is 0.
  * `count` (int): number of objects.
  * `table` (string): the main table (i.e. your partial rendered).
* In create/edit mode
  * `object`: contains the object edited. The variable name can be configured.
  * `formId` (string): a random unique ID you can use for your form (very useful if you have more than one crud per page).
  * `clientSideValidation` (array of rules): a rule is a hash with keys `fieldName` and `attributes` being a hash of `name: value`.
    It defines the HTML5 attributes you should add to your markup. It's automatically added on client with JS if you use default
    templates. You can specify your own HTML5 validations adding a `html5Validators` array to your `forms`' field.
  * `title`: page title
  * `form` (string): the rendered form.
  * `save_url`: form's action.

### Helpers

Available un `crud.helpers` they will help you enjoy this component even in more advanced situations:

* `defineLocals` helps you map partials to view locals, very useful for i18n for example. It will return a function you
  can safely pass to `editLocals` or `listLocals` options. Example:
  `"listLocals":crud.helpers.defineLocals({ "table":"/path/to/views/list_table", "title":"/path/to/views/list_title" })`
* `sortArray` allows you to apply the `sort` option to an array of objects. Especially useful when you work with
  simple arrays and cannot rely on Mongoose's sort ability.

To see a simple example of fully working CRUD for an in-memory array, look at the unit tests in `test/crud.js`.
