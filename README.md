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



## Extended forms

This component extends @caolan's [forms](https://github.com/caolan/forms), providing new features like Twitter Bootstrap
templating, new useful validators and fields…

```javascript
var forms = require('doggybag/forms');

var form = forms.create({
  "username": forms.fields.string({ required:true }),
  "gender":   forms.fields.string({ widget:forms.widgets.multipleCheckbox({}), choices:['M','F','X'], validators:[forms.validators.choices()] }),
  "avatar":   forms.fields.file({ help:"Less than 200K" })
});
```

See [doc/forms.md](https://github.com/Dijiwan/doggybag/tree/master/doc/forms.md) for more complete documentation.



## Config loader

Based on @flatiron's [nconf](https://github.com/flatiron/nconf), this component will allow you to use a two-level
file-based configuration: a "common" configuration, and some overrides depending on your environment.

```javascript
// In your bootstrap
require('doggybag/config').add('myApp'); // loads config/myApp.json and config/myApp.production.json

// Later in your code
var key = require('doggybag/config').myApp.get('key');
```

See [doc/config.md](https://github.com/Dijiwan/doggybag/tree/master/doc/config.md) for more complete documentation.



## Logger

Based on @flatiron's [winston](https://github.com/flatiron/winston), this component acts as a thin wrapper to simply
automatically configure several Logger instances and provide easy access to them.

```javascript
// In your bootstrap
require('doggybag/logger').add('myApp'); // grab config from 'logging.json', key "myApp"

// Later in your code
var logger = require('doggybag/logger').myApp;

logger.warn('This may not occur');
```

See [doc/logger.md](https://github.com/Dijiwan/doggybag/tree/master/doc/logger.md) for more complete documentation.



## Express CRUD

This component acts as an Express app builder you can use in your back-office. It uses `doggybag/forms`, and works
natively with [mongoose](http://mongoosejs.com/) but could work with any type of data.

```javascript
var crud = require('doggybag/crud');

var usersApp = crud.init({
  model: mongoose.model('User'),
  form: function (forms, cb) { cb(null, forms.create(…)) },
  listLocals: crud.helpers.defineLocals({table: "users/list_table"})
});

app.mount('/users', usersApp);
```

See [doc/crud.md](https://github.com/Dijiwan/doggybag/tree/master/doc/crud.md) for more complete documentation.


## Express Proxy Middleware

This components enables your node.js app to be hosted behind a proxy and avoids
Express to become crazy when it comes to `res.redirect`.

Some other middlewares exists with that stuff but usually, they are not unit-tested.

```javascript
app.configure(function(){

  app.use(require('doggybag/middlewares').proxy());
});
```

For now, it will work with the `x-forwarded-host` HTTP header.
Express already deals with the `x-forwarded-proto`, making the `http` or `https`
redirect protocol-compliant.

**Notice**: Express 3.x will cover this feature but though, it's still okay for
Express 2.x and below.
