var expect = require('expect.js');

process.env.NODE_ENV = 'test';


var crud = require('../crud');

var express = require('express');
var Browser = require('zombie');

suite('doggybag/crud', function () {

  test('check API', function () {
    expect(crud).to.have.key('helpers');
    expect(crud.helpers).to.have.key('defineLocals');
    expect(crud.helpers).to.have.key('sortArray');
    expect(crud.init).to.be.a('function');
  });

  test('should fail if required options are not all given', function () {
    expect(function () {
      crud.init({})
    }).to.throwException(/mandatory option/i);
  });

  test('should accept minimal options', function () {
    expect(crud.init({
      "model":{},
      "form":function () {

      }
    })).to.be.ok();
  });

  suite('initialize crud', function () {

    // Data
    var guys;

    // HTTP server
    var app;

    // HTTP client
    var browser = new Browser();

    setup(function () {
      guys = [
        {
          "id":1,
          "name":"John"
        },
        {
          "id":2,
          "name":"Peter"
        },
        {
          "id":3,
          "name":"Ryan"
        }
      ];
    });

    suiteSetup(function (done) {
      // The standard configuration for an array
      var guysApp = crud.init({
        "new":function (formData, cb) {
          var guy = {
            "id":guys.length + 1,
            "name":formData.name
          };
          guys.push(guy);
          cb(null, guy);
        },
        "update":function (guy, formData, cb) {
          guy.name = formData.name;
          cb(null, guy);
        },
        "remove":function (guy, cb) {
          var index = guys.indexOf(guy);
          if (~index) {
            guys.splice(index, 1);
          }
          cb(null);
        },
        "findAll":function (page, nb, sort, cb) {
          cb(null, crud.helpers.sortArray(guys, sort).slice((page - 1) * nb, page * nb));
        },
        "findOne":function (id, cb) {
          var i = guys.map(function (guy) {
            return String(guy.id)
          }).indexOf(String(id));
          cb(~i ? null : new Error('Guy not found'), guys[i]);
        },
        "countPages":function (nbPerPage, cb) {
          cb(null, Math.ceil(guys.length / nbPerPage));
        },
        "form":function (forms, cb) {
          cb(null, forms.create({
            "name":forms.fields.string({"required":true})
          }));
        },
        "varname":"guy",
        "listLocals":crud.helpers.defineLocals({"table":"list_table"})
      });
      // Specify templates for the CRUD app
      guysApp.configure(function () {
        guysApp.set('view engine', 'hbs');
        guysApp.set('views', __dirname + '/crud/views');
      });
      // Your parent app
      app = express.createServer();
      app.configure(function () {
        // Note that it can use different view settings, thank Express!
        app.set('view engine', 'html');
        app.set('views', '/path/to/somewhere/else');
        app.use(express.errorHandler({ 'dumpExceptions':true, 'showStack':true }));
        // Your parent app can be unable to parse forms, this is handled in mounted app
        app.use(app.router);
      });
      // Mount your CRUD app
      app.use('/guys', guysApp);
      // Start
      app.once('listening', done);
      app.listen();
    });

    suiteTeardown(function () {
      app.close();
    });

    test('list mode', function (done) {
      browser.visit('http://127.0.0.1:' + app.address().port + '/guys', function (err) {
        if (err) return done(err);
        expect(browser.success).to.be.ok();
        guys.forEach(function (guy) {
          var e = browser.document.querySelector('a[href="/guys/' + guy.id + '"]');
          expect(!!e).to.be.ok();
          expect(e.innerHTML).to.equal(guy.name);
        });
        done();
      });
    });

    test('edit mode', function (done) {
      browser.clickLink(guys[1].name, function (err) {
        if (err) return done(err);
        expect(browser.success).to.be.ok();
        expect(browser.document.querySelectorAll('input[name="name"][value="' + guys[1].name + '"]').length).to.equal(1);
        done();
      });
    });

    // Removed until mikeal/request#255 is published to npm
    /*
    test('missing required field', function (done) {
      browser.fill("name", "").pressButton("Save changes", function (err) {
        if (err) return done(err);
        expect(browser.html()).to.match(/error: Invalid form/i);
        done();
      })
    });
    */

    test('update', function (done) {
      browser.fill("name", "Walter").pressButton("Save changes", function (err) {
        if (err) return done(err);
        expect(browser.success).to.be.ok();
        expect(guys[1].name).to.equal("Walter");
        done();
      });
    });

    test('create', function (done) {
      browser.visit('http://127.0.0.1:' + app.address().port + '/guys', function (err) {
        if (err) return done(err);
        expect(browser.success).to.be.ok();
        browser.clickLink('Create', function (err) {
          if (err) return done(err);
          expect(browser.success).to.be.ok();
          browser.fill("name", "Arnold").pressButton("Save changes", function (err) {
            if (err) return done(err);
            expect(browser.success).to.be.ok();
            expect(guys).to.have.length(4);
            expect(guys[3].name).to.equal('Arnold');
            done();
          });
        });
      });
    });

    test('back to edit mode after create', function () {
      expect(browser.document.querySelectorAll('input[name="name"][value="Arnold"]').length).to.equal(1);
    });

    test('delete', function (done) {
      browser.visit('http://127.0.0.1:' + app.address().port + '/guys', function (err) {
        if (err) return done(err);
        expect(browser.success).to.be.ok();
        browser.onconfirm('Are you sure you want to permanently delete user John ?', true);
        browser.clickLink('#delete-1', function (err) {
          if (err) return done(err);
          expect(browser.success).to.be.ok();
          expect(guys).to.have.length(2);
          done();
        });
      });
    });

    test('field with quotes', function (done) {
      browser.visit('http://127.0.0.1:' + app.address().port + '/guys', function (err) {
        if (err) return done(err);
        expect(browser.success).to.be.ok();
        browser.clickLink('Create', function (err) {
          if (err) return done(err);
          expect(browser.success).to.be.ok();
          browser.fill("name", 'Arnold "the big"').pressButton("Save changes", function (err) {
            if (err) return done(err);
            expect(browser.success).to.be.ok();
            expect(guys).to.have.length(4);
            expect(guys[3].name).to.equal('Arnold "the big"');
            expect(browser.document.querySelector('input[name="name"]').value).to.equal(guys[3].name);
            done();
          });
        });
      });
    });

  });

});