# doggybag

[![Build Status](https://secure.travis-ci.org/Dijiwan/doggybag.png?branch=master)](http://travis-ci.org/Dijiwan/doggybag)

At [Dijiwan](http://dijiwan.com), we use JavaScript a lot, especially with *node.js*.
We have common needs across our project, so we decided to package them, and
make them available publicly.

**A brief word of History**
While looking a name for this project, we asked to translate the word *toolbox*
in Japanese to our japanese-speaking-guy
([Guillaume](https://github.com/gmarty)).

As his answer sounded like *doggybag*, we laughed and decided to call it as is.
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
if (req.method === 'POST') {
  form.bind(req.body, req.files);
  if (form.isValid()) {
    // Save to database
  }
}

// show form (including errors eventually)
var html = form.render(forms.render.twBootstrap);
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
