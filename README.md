# doggybag

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
var formsExtended = require('doggybag/forms')
```

`formsExtended` is an object containing several keys.

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
