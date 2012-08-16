# Config loader

This component is based on @flatiron's [nconf](https://github.com/flatiron/nconf).

It is used to cascade and augment several configuration files. Pretty neat
to have a common configuration augmented according to the process `env`.

## Usage

```javascript
// In your bootstrap
require('doggybag/config').add('myApp');

// Later in your code
require('doggybag/config').myApp.get('key')
```

## Options

`add()` can take a bunch of options as second argument:

* `type` can be defined, but then it's exactly like you used `nconf.add`. This is useful if you want to use some non-files providers. You could also user `require('doggybag/config').nconf` which is exposed on purpose. If it's defined, all following options are ignored.
* `dir` is the base directory where you put your configuration files. Default is `$PWD/config`.
* `files` provides directly the list of files to be loaded (they can be relative to `dir`). If it's not specified, the files will be guessed from `env`.
* `env` (default `$NODE_ENV`) and `user` (default `$USER`) will be used to guess what files should be loaded:
  1. `<name>.json`
  2. `<name>.<env>.json`
  3. `<name>.<user>.json`
  4. `<name>.<user>.<env>.json`
* `noShortcut` will disable the shortcut to your provider as a module attribute. This can be mandatory if your configuration name matches an already existing attribute like one of the following: `nconf`, `add`, and `stores`. If you don't use any of this reserved names, feel happy.

## How we use it

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
