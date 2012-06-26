var expect = require('expect.js');

process.env.NODE_ENV = 'test';


var forms = require('../forms');

var express = require('express');
var Browser = require('zombie');

suite('doggybag/forms', function () {

  test('check API', function () {
    ['div', 'p', 'li', 'table']
      .concat(['twBootstrap'])
      .forEach(function (style) {
        expect(forms.render).to.have.key(style);
      });
    ['string', 'number', 'boolean', 'email', 'password', 'url', 'array']
      .concat(['constant', 'file'])
      .forEach(function (field) {
        expect(forms.fields).to.have.key(field);
      });
    ['matchField', 'min', 'max', 'range', 'minlength', 'maxlength', 'rangelength', 'regexp', 'email', 'url']
      .concat(['choices'])
      .forEach(function (validator) {
        expect(forms.validators).to.have.key(validator);
      });
    ['text', 'password', 'hidden', 'checkbox', 'select', 'textarea', 'multipleCheckbox', 'multipleRadio', 'multipleSelect']
      .concat(['html', 'file'])
      .forEach(function (widget) {
        expect(forms.widgets).to.have.key(widget);
      })
  });

  suite('create form', function () {

    var form;

    setup(function () {
      form = forms.create({
        "username":forms.fields.string({ required:true }),
        "gender":forms.fields.string({ widget:forms.widgets.multipleCheckbox({}), choices:['M', 'F', 'X'], validators:[forms.validators.choices()], required:true }),
        "avatar":forms.fields.file({ help:"Less than 200K" })
      });
    });

    test('bind() accepts two parameters', function () {
      expect(form.bind).to.have.length(2);
    });

    test('invalid fields', function (done) {
      form.bind({}).validate(function (err, f) {
        expect(err).to.be(undefined);
        expect(f.fields.username.error).to.match(/required/i);
        expect(f.fields.gender.error).to.match(/required/i);
        expect(f.fields.avatar.error).to.be(undefined);
        done();
      });
    });

    suite('work with server', function () {

      var app = express.createServer();

      var browser = new Browser();

      suiteSetup(function (done) {
        app.configure(function () {
          app.set('views', __dirname + '/forms/views');
          app.set('view engine', 'hbs');
          app.use(express.bodyParser());
          app.use(app.router);
        });
        app.get('/', function (req, res) {
          res.render('index', { "form":form.toHTML(forms.render.twBootstrap) });
        });
        app.post('/', function (req, res, next) {
          form.bind(req.body, req.files).validate(function (err, f) {
            if (err) return next(err);
            res.render('index', { "form":f.toHTML(forms.render.li), "avatar":f.fields.avatar.value });
          });
        });
        app.listen();
        app.on('listening', done);
      });

      suiteTeardown(function () {
        app.close();
      });

      test('display form', function (done) {
        browser.visit('http://127.0.0.1:' + app.address().port, function (err, browser) {
          if (err) return done(err);
          expect(browser.success).to.be.ok();
          expect(browser.document.querySelectorAll('input[type=text][name=username]').length).to.equal(1);
          expect(browser.document.querySelectorAll('input[type=checkbox][name=gender]').length).to.equal(3);
          expect(browser.document.querySelectorAll('input[type=file][name=avatar]').length).to.equal(1);
          expect(browser.html()).to.match(/<p class="help-block">Less than 200K<\/p>/i);
          done();
        });
      });

      test('submit form with missing field', function (done) {
        browser
          .fill("username", "")
          .check("X")
          .pressButton("submit", function () {
            expect(browser.success).to.be.ok();
            expect(browser.document.querySelectorAll('li.field.error.required').length).to.equal(1); // username
            expect(browser.document.querySelectorAll('#avatar-filename').length).to.equal(0); // no file uploaded
            done();
          });
      });

      test('submit form with all required files', function (done) {
        browser
          .fill("username", "dead buddy")
          .pressButton("submit", function () {
            expect(browser.success).to.be.ok();
            expect(browser.document.querySelectorAll('li.field.error.required').length).to.equal(0);
            expect(browser.document.querySelectorAll('#avatar-filename').length).to.equal(0); // no file uploaded
            done();
          });
      });

      test('upload file', function (done) {
        browser
          .attach("avatar", __dirname + "/forms/avatar.jpg")
          .pressButton("submit", function () {
            expect(browser.success).to.be.ok();
            expect(browser.document.querySelectorAll('li.field.error.required').length).to.equal(0);
            expect(browser.document.querySelectorAll('#avatar-filename').length).to.equal(1); // file uploaded
            expect(browser.document.querySelector('#avatar-filename').innerHTML).to.match(/avatar\.jpg/i);
            done();
          });
      });

    });

  });

});