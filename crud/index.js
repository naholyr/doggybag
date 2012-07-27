/**
 * CRUD
 */

'use strict';

var express = require('express');
var async = require('async');
var forms = require('../forms');

/**
 * Initialize CRUD app
 *
 * @param options
 * @return HTTPServer.
 */
function initializeApp(options) {

  /**
   * Default options
   *
   * @type {*}
   */
  options = options || {};
  var Model = options.model;
  if (!Model && (!options.findAll || !options.countPages || !options.findOne || !options.new || !options.update)) throw new Error('Mandatory option "model", or options "findAll", "countPages", "findOne", "new", and "update"');
  var makeForm = options.form;
  if (!makeForm) throw new Error('Mandatory option "form"');
  var viewKey = options.varname || 'object';
  var viewKeyPlural = options.varsname || (viewKey + 's');
  var viewDir = options.views || (__dirname + '/views');
  var newObject = options.new || function newObject(data, cb) {
    new Model(data).save(cb)
  };
  var updateObject = options.update || function updateObject(object, data, cb) {
    // Loop and call "save", to ensure Mongoose hooks are correctly triggered
    for (var property in data) {
      object[property] = data[property];
    }
    object.save(cb);
  };
  var removeObject = options.remove || function removeObject(object, cb) {
    object.remove(cb);
  };
  var formValues = options.values || function (object, cb) {
    cb(null, typeof object.toObject === 'function' ? object.toObject({ 'getters':true }) : object)
  };
  var renderForm = options.renderForm || function renderForm(form, forms, cb) {
    cb(null, form.toHTML(forms.render.twBootstrap))
  };
  var beforeEdit = options.beforeEdit || function beforeEdit(req, res, next) {
    next()
  };
  var beforeList = options.beforeList || function beforeList(req, res, next) {
    next()
  };
  var uriPrefix = options.prefix || '';
  var nbPerPage = options.nbPerPage || 25;
  var countPages = options.countPages || function countPages(nbPerPage, cb, req, res) {
    Model.count(function (err, nb) {
      cb(err, err ? 0 : Math.ceil(nb / nbPerPage))
    })
  };
  var defaultSort = options.defaultSort || [
    ['_id', 'ascending']
  ];
  var findAll = options.findAll || function findAll(page, nb, sort, cb, req, res) {
    var q = Model.find().skip((page - 1) * nb);
    // Apply sorting: Query#sort(key, order)
    if (sort) sort.forEach(function (o) {
      q.sort.apply(q, o)
    });
    q.limit(page * nb).exec(cb);
  };
  var findOne = options.findOne || function findOne(id, cb, req, res) {
    Model.findById(id, cb)
  };
  var editLocals = options.editLocals || function editLocals(object, cb, req, res) {
    cb(null)
  };
  var listLocals = options.listLocals || function listLocals(object, cb, req, res) {
    cb(null)
  };
  var gettext = options.gettext || function gettext(string, req) {
    return (req.i18n && req.i18n.gettext) ? req.i18n.gettext(string) : string
  };

  /**
   * Returned app (meant to be used as middleware)
   *
   * Usage:
   *
   * var app = express.createServer();
   * app.use('/crud', crud.init(options));
   */
  var app = express.createServer();

  /**
   * Always define view variable 'crud_basepath' to customize links
   */
  app.configure(function () {
    app.use(function (req, res, next) {
      res.local('crud_basepath', app.settings.basepath || '');
      next();
    });
    app.use(express.bodyParser());
    app.use(app.router);
  });

  /**
   * List mode: find all objects
   *
   * @type {Middleware}
   * @see options.model, options.findAll
   */
  function setObjects(req, res, next) {
    async.parallel([
      // Count pages
      function (cb) {
        countPages(nbPerPage, function (err, nbPages) {
          res.local('nbPages', nbPages);
          res.local('isPaginated', nbPages > 1);
          cb(err);
        }, req, res);
      },
      // Find objects
      function (cb) {
        var page = parseInt(req.query.page, 10) || 1;
        res.local('numPage', page);
        // TODO sort can be configured from request params, should use a configurable callback
        var sort = defaultSort;
        findAll(req.query.page || 1, nbPerPage, sort, function (err, objects) {
          if (err) {
            message(res, gettext('Failed retrieving objects.', req), err);
            objects = [];
          }
          res.local(viewKeyPlural, req[viewKeyPlural] = objects);
          cb();
        }, req, res);
      }
    ], function (err) {
      if (!err) {
        // Additional view variables for pagination, if template engine doesn't support expressions
        if (res.local('numPage') > 1) {
          res.local('previousPage', res.local('numPage') - 1);
        }
        if (res.local('numPage') < res.local('nbPages')) {
          res.local('nextPage', res.local('numPage') + 1);
        }
        // If template engine doesn't support for-loops
        // TODO insert separators for huge number of pages, should result in something like "1 2 3 4 5  …  37 38 *39* 40 41  …  121 122 123 124 125"
        res.local('pages', (function (n) {
          var a = [];
          for (var p = 1; p < n + 1; p++) {
            a.push({ 'page':p, 'active':p === res.local('numPage') });
          }
          return a;
        })(res.local('nbPages')));
      }
      next(err);
    });
  }

  /**
   * Edit mode: find object by id
   *
   * @type {ParamMiddleware}
   * @see options.model, options.findOne
   */
  function resolveObjectId(req, res, next, id) {
    findOne(id, function (err, object) {
      if (err || !object) {
        // Go back to list mode and display error
        message(res, gettext('Failed retrieving object.', req), err || 'Not found');
        return list(req, res, next);
      }
      res.local(viewKey, req[viewKey] = object);
      next();
    }, req, res);
  }

  /**
   * Defines view locals for client-side form constraints using HTML5 attributes
   *
   * @param form
   * @param res
   */
  function defineClientSideValidation(form, res) {
    var formId = 'form' + Math.ceil(Math.random() * 100000);
    res.local('formId', formId);
    var rules = [];
    Object.keys(form.fields).forEach(function (fieldName) {
      var field = form.fields[fieldName];
      var attributes = [];
      if (field.required) {
        attributes.push({ 'name':'required' });
      }
      Object.keys(field.htmlValidators || {}).forEach(function (name) {
        attributes.push({ 'name':name, 'value':field.htmlValidators[name] });
      });
      if (attributes.length) {
        rules.push({ 'fieldName':fieldName, 'attributes':attributes });
      }
    });
    res.local('clientSideValidation', rules);
  }

  /**
   * Escape field's value: when a string, we transform special characters to entities
   *
   * @param value
   */
  function escapeFieldValue(value) {
    if (typeof value === 'string') {
      value = value.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    return value;
  }

  /**
   * Create edition form
   *
   * @type {Middleware}
   * @see options.form, options.values, forms.Field.modelValue
   */
  function setForm(req, res, next) {
    // Build the form
    makeForm(forms, function (err, form) {
      if (err || !form) {
        // Go back to list mode and display error
        message(res, gettext('Failed building form.', req), err || 'Unexpected error');
        return list(req, res, next);
      }
      req.form = form;
      // Define client-side validation with HTML5 attributes
      defineClientSideValidation(form, res);
      // New object: no binding
      if (!req[viewKey]) return next();
      // Editing: map and bind values from edited object
      var onValues = function onValues(err, values) {
        if (err) {
          // Error while retrieving default values: display empty form ?
          // TODO maybe we should redirect to list ? Study possible cases here
          message(res, gettext('Failed retrieving form values.', req), err);
        } else if (values) {
          // don't use form.bind(values), we only want to specify default values
          // using "bind()" would erase values not present in "values" but with a default value defined
          // instead, we change field's default value
          Object.keys(values).forEach(function (k) {
            if (typeof values[k] !== 'undefined' && form.fields[k]) {
              form.fields[k].value = escapeFieldValue(values[k]);
            }
          });
        }
        next();
      };
      // Grab default values from model
      formValues(req[viewKey], function (err, values) {
        if (err) return onValues(err, values);
        var valueCallbacks = Object.keys(form.fields).map(function valueCallback(k) {
          var f = form.fields[k];
          // Field already has an assigned default value
          if (typeof f.value !== 'undefined') {
            return;
          }
          // Field has a "modelValue" option provided to resolve its default value from model
          if (f.modelValue) {
            // Asynchronous
            if (f.modelValue.length === 2) {
              return function (cb) {
                f.modelValue(req[viewKey], function (err, v) {
                  cb(err, values[k] = v)
                })
              };
            }
            // Synchronous
            return function (cb) {
              var e, v;
              try {
                v = f.modelValue(req[viewKey])
              } catch (err) {
                e = err
              }
              cb(e, values[k] = v)
            };
          }
          // Last case: we assign corresponding model field, only if value has not been defined in "formValues"
          if (typeof values[k] === 'undefined' && typeof req[viewKey][k] !== 'undefined') {
            values[k] = req[viewKey][k];
            return;
          }
        });
        // Remove falsey callbacks before passing to async.parallel
        valueCallbacks = valueCallbacks.filter(function isTruthy(v) {
          return !!v
        });
        // Execute all the modelValue()s and respond
        async.parallel(valueCallbacks, function (err) {
          onValues(err, values)
        });
      }, req, res);
    }, req, res);
  }

  /**
   * Route to list mode
   *
   * @route GET /
   * @see options.views
   */
  function list(req, res, next) {
    listLocals(req[viewKeyPlural], function (err, locals) {
      if (err) return next(err); // This one may be unrecoverable :-\
      locals = locals || {};
      locals.title = locals.title || ('List ' + viewKeyPlural);
      locals.filters = locals.filters || null;
      locals.empty = locals.empty || ('No ' + viewKey);
      locals.table = locals.table || '<div class="alert alert-danger">' + gettext('ERROR: no table to display', req) + '</div>';
      locals.count = req[viewKeyPlural].length;
      res.render(viewDir + '/list', locals);
    }, req, res);
  }

  /**
   * Route to edit mode
   *
   * @route GET /create
   * @route GET /:id
   * @see options.renderForm, options.views
   */
  function edit(req, res, next) {
    renderForm(req.form, forms, function (err, html) {
      if (err) {
        message(res, gettext('Failed rendering form.', req), err);
        html = '';
      }
      editLocals(req[viewKey], function (err, locals) {
        if (err) return next(err); // This one may be unrecoverable :-\
        locals = locals || {};
        locals.form = html;
        locals.title = locals.title || (req[viewKey] ? ('Edit ' + viewKey + ' ' + req[viewKey].id) : ('New ' + viewKey));
        locals.save_url = locals.save_url || (req[viewKey] ? req[viewKey].id : '');
        res.render(viewDir + '/edit', locals);
      }, req, res);
    });
  }

  /**
   * Route to save edited object (then redirects to edit mode)
   *
   * @route POST /
   * @route POST /:id
   * @see options.getPrefix, options.update, options.new, options.model
   */
  function save(req, res, next) {
    var data;
    // When object is saved
    function postSave(err, object) {
      res.local(viewKey, req[viewKey] = object); // Bind updated object
      if (err) {
        message(res, gettext('The object failed to be saved.', req), err);
        // Directly send back to create mode
        next();
      } else {
        message(res, gettext('Successfully saved object.', req), null, 'success');
        // Display edit form using the required middlewares to retrieve object and generate proper form
        // TODO redirect (303) with a flash message using sessions (waiting for sessions, coming with authentication)
        resolveObjectId(req, res, function () {
          setForm(req, res, next);
        }, object.id);
      }
    }

    // Complete request data: make files available in req.body so that forms.handle() works properly
    if (req.files) {
      Object.keys(req.files).forEach(function (name) {
        if (req.files[name].name) {
          req.body[name] = req.files[name];
        }
      });
    }
    // Handle request data
    req.form.bind(req.body).validate(function (err, f) {
      if (f.isValid()) {
        data = f.data;
        if (req[viewKey]) {
          updateObject(req[viewKey], f.data, postSave, req, res);
        } else {
          newObject(f.data, postSave, req, res);
        }
      } else {
        postSave(err || new Error(gettext('Invalid form.', req)), req[viewKey]);
      }
    });
  }

  /**
   * Route to remove object (then redirects to list mode)
   *
   * @route POST /delete/:id
   * @see options.model, options.getPrefix
   */
  function remove(req, res, next) {
    var object = req[viewKey];
    if (!object) {
      message(res, gettext('Failed removing object.', req), 'Not found');
      next();
    } else {
      removeObject(object, function (err) {
        message(res, err ? gettext('Failed removing object.', req) : gettext('Object successfully removed.', req), err, err ? null : 'success');
        next();
      }, req, res);
    }
  }

  /**
   * CRUD URLs
   *
   * @see options.prefix, options.beforeList, options.beforeEdit, options.onError
   */
  app.param('id', resolveObjectId);
  app.get(uriPrefix || '/', setObjects, beforeList, list);
  app.get(uriPrefix + '/create', setForm, beforeEdit, edit);
  app.post(uriPrefix + '/delete/:id', remove, setObjects, beforeList, list);
  app.get(uriPrefix + '/:id', setForm, beforeEdit, edit);
  app.post(uriPrefix + '/:id', setForm, save, beforeEdit, edit);
  app.post(uriPrefix || '/', setForm, save, beforeEdit, edit);

  return app;
}


/**
 * Helper functions
 */
function message(res, text, error, type) {
  type = type || (error ? 'error' : 'info');
  if (error) {
    console.error('CRUD Error!', error.stack || error); // TODO logging
    text += ' → ' + error;
  }
  res.local('message', { 'type':type, 'text':text });
}


/**
 * Public helpers
 * @type {Object}
 */
var helpers = {
  // @see options.listLocals, options.editLocals
  'defineLocals':function (indirects, directs) {
    // Reformat all values as functions
    var functions = [];
    var names = [];
    // Indirects are used as-is (function) or wrapped with res.partial()
    var valueAsPartial = function valueAsPartial(value) {
      var path = String(value);
      return function (data, fn, req, res) {
        res.partial(path, fn);
      };
    };
    var indirectNames = Object.keys(indirects || {});
    names = names.concat(indirectNames);
    functions = functions.concat(indirectNames.map(function (name) {
      return (typeof indirects[name] === 'function') ? indirects[name] : valueAsPartial(indirects[name]);
    }));
    // Directs are wrapped in a fake async flavor
    var makeAsync = function valueAsAsync(value) {
      if (typeof value === 'function') {
        // Wrapped sync function
        return function (data, fn, req, res) {
          fn(null, value(data, req, res));
        };
      } else {
        // Wrapped single value
        return function (data, fn, req, res) {
          fn(null, value);
        };
      }
    };
    var directNames = Object.keys(directs || {});
    names = names.concat(directNames);
    functions = functions.concat(directNames.map(function (name) {
      return makeAsync(directs[name]);
    }));
    // Build the "listLocals" / "editLocals" callback
    return function (data, cb, req, res) {
      var locals = {};
      // All functions are the same signature, we just all call them as async
      async.parallel(functions.map(function (foo) {
        // Simply call reformated-as-async function
        return function (cb) {
          foo(data, cb, req, res)
        };
      }), function (err, values) {
        if (err) return cb(err);
        // map names and values (async guarantees order)
        var locals = {};
        names.forEach(function (name, i) {
          locals[name] = values[i];
        });
        cb(null, locals);
      });
    };
  },
  // Apply [[field, order], [field, order], ...] sorting rules to an array of objects
  'sortArray':function (objects, sort) {
    var comparator = function (rule) {
      var field = rule[0];
      var order = rule[1] || 'asc';
      switch (String(order).toLowerCase()) {
        case 'desc':
        case 'descending':
        case '-1':
          order = -1;
          break;
        default:
          order = +1;
          break;
      }
      return function (o1, o2) {
        var f1 = o1[field], f2 = o2[field];
        return order * (f1 > f2 ? +1 : (f1 < f2 ? -1 : 0));
      };
    };
    if (sort) {
      sort.forEach(function (o) {
        objects.sort(comparator(o));
      });
    }
    return objects;
  }
};


/**
 * Exposed API
 *
 * * express: Express module
 * * forms: Extended Forms module
 * * init: CRUD app generator
 */
module.exports = {
  'express':express,
  'forms':forms,
  'init':initializeApp,
  'helpers':helpers
};
