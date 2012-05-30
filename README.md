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

## nconf Environment Loader

It is used to cascade and augment several configuration files. Pretty neat
to have a common configuration augmented according to the process `env`.

```bash
$ ls /path/to/app/config
myApp.json myApp.dev.json myApp.prod.json myApp.test.json
```

```javascript
// any file requiring conf
var conf = require('doggybag/config').myApp;
```