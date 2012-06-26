# Logger

An wrapper that will automatically configure several `winston` loggers using
your configuration (works very well with `doggybag/config`).

## Usage

```javascript
// In your bootstrap
require('doggybag/logger').add('myApp'); // grab config from 'logging.json', key "myApp"

// Later in your code
var logger = require('doggybag/logger').myApp;

logger.warn('This may not occur');
```

## Options

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

### Initializing multiple loggers

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

## Command-line logger

A special logger `cli` is always available:

```javascript
require('doggybag/logger').cli.data('Some information');
```

## Working with `doggybag/config`

`doggybag/logger` works best with `doggybag/config` with some conventions:

* You have already initialized your configuration with for example `require('doggybag/config').add('logging');`.
* Your loaded configuration has a key for each logger you want to initialize.
* Then you can just omit the second parameter, everything will play nice.

Note that you can specify second parameter as a string if you want to use another config category than "logging".

## How we use it

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
