var middlewares = require('../middlewares');
var expect = require('expect.js');

suite('doggybag/middlewares', function(){
  var res, req;

  suiteSetup(function(){
    res = {};

    req = {
      connection: {
        encrypted: false
      },
      headers: {
        host: '127.0.0.1:80',
        'accept-encoding': 'gzip,deflate,sdch'
      },
      protocol: 'http',
      url: 'http://www.example.com/faq.html'
    };
  });


  suite('#proxy()', function(){
    var proxy = middlewares.proxy();

    setup(function(){
      delete req.headers['x-forwarded-host'];
      req.headers.host = '127.0.0.1:80';
    });

    test('proxy available', function(){
      expect(middlewares.proxy).to.be.a('function');
      expect(proxy).to.be.a('function');
    });

    test('no proxy', function(done){
      proxy(req, res, function next(){
        expect(req.headers.host).to.be('127.0.0.1:80');
        expect(req.headers['x-forwarded-host']).to.be(undefined);

        done();
      });
    });

    test('proxy as simple string', function(done){
      var hostValue = '  lolcats.example.com  ';
      req.headers['x-forwarded-host'] = hostValue;

      proxy(req, res, function next(){
        expect(req.headers.host).to.be('lolcats.example.com');
        expect(req.headers['x-forwarded-host']).to.be(hostValue);

        done();
      });
    });

    test('multiple proxies', function(done){
      var hostValue = '  lolcats.example.com, panda.ftw.com, joomlaroc.ks  ';
      req.headers['x-forwarded-host'] = hostValue;

      proxy(req, res, function next(){
        expect(req.headers.host).to.be('lolcats.example.com');
        expect(req.headers['x-forwarded-host']).to.be(hostValue);

        done();
      });
    });
  });

  suite('#ensureHttps()', function(){
    var ensureHttps = middlewares.ensureHttps();

    setup(function(){
      delete req.headers['x-forwarded-proto'];
      req.protocol = 'http';
      req.connection.encrypted = false;

      res.redirect = function(url){
        throw Error('Redirection to '+url);
      };
    });

    test('middleware available', function(){
      expect(middlewares.ensureHttps).to.be.a('function');
      expect(middlewares.ensureHttps.replaceProtocol).to.be.a('function');
      expect(ensureHttps).to.be.a('function');
    });

    test('already in https', function(done){
      req.connection.encrypted = true;

      expect(function(){
        ensureHttps(req, res, function next(){
          done();
        });
      }).not.to.throwException();
    });

    test('already in https with a proxy', function(done){
      req.protocol = 'https';

      expect(function(){
        ensureHttps(req, res, function next(){
          done();
        });
      }).not.to.throwException();
    });

    test('in http, switching to https', function(done){
      res.redirect = function(url){
        expect(url).to.be('https://www.example.com/faq.html');

        done();
      };

      ensureHttps(req, res, function next(){ });
    });
  });
});