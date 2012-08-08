var middlewares = require('../middlewares');
var expect = require('expect.js');

suite('doggybag/middlewares', function(){
  var res, req;

  function resetResponse(){
    res = {
      redirect: function(url){
        throw Error('Redirection to '+url);
      }
    };
  }

  function resetRequest(){
    req = {
      app: {
        settings: {
          env: 'testing'
        }
      },
      headers: {
        host: '127.0.0.1:80',
        'accept-encoding': 'gzip,deflate,sdch',
        'accept-language': 'da, en;q=0.7, cs-cz; 0.6, yi_Hebr, fr'
      },
      protocol: 'http',
      url: '/faq.html'
    };
  }

  setup(resetRequest);
  setup(resetResponse);


  suite('#proxy()', function(){
    var proxy = middlewares.proxy();

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

    test('middleware available', function(){
      expect(middlewares.ensureHttps).to.be.a('function');
      expect(middlewares.ensureHttps.replaceProtocol).to.be.a('function');
      expect(ensureHttps).to.be.a('function');
    });

    test('already in https', function(done){
      req.protocol = 'https';

      expect(function(){
        ensureHttps(req, res, function next(){
          done();
        });
      }).not.to.throwException();
    });

    test('already in https with a proxy', function(done){
      req.headers['x-forwarded-proto'] = 'https';

      expect(function(){
        ensureHttps(req, res, function next(){
          done();
        });
      }).not.to.throwException();
    });

    test('in http, switching to https', function(done){
      res.redirect = function(url){
        expect(url).to.be('https://127.0.0.1:80/faq.html');

        done();
      };

      ensureHttps(req, res, function next(){ });
    });

    test('in http, not switching because of environment', function(done){
      ensureHttps = middlewares.ensureHttps({
        envs: ['production']
      });

      expect(function(){
        ensureHttps(req, res, function next(){
          done();
        });
      }).not.to.throwException();
    });

    test('in http, switching because of environment', function(done){
      ensureHttps = middlewares.ensureHttps({
        envs: ['testing']
      });

      res.redirect = function(uri){
        done();
      };

      expect(function(){
        ensureHttps(req, res, function next(){
          throw Error('Should not call next element in stack.');
        });
      }).not.to.throwException();
    });
  });

  suite('#locale()', function(){
    var locale = middlewares.locale(['fr', 'en', 'ja']);

    test('No Accept-Language headers', function(done){
      req.headers = {};

      locale(req, res, function next(){
        expect(req.locale).to.be('en');

        done();
      });
    });

    test('One matching string', function(done){
      req.headers['accept-language'] = 'da';

      locale(req, res, function next(){
        expect(req.locale).to.be('da');

        done();
      });
    });

    test('One matching string (underscore)', function(done){
      req.headers['accept-language'] = 'yi_Hebr';

      locale(req, res, function next(){
        expect(req.locale).to.be('yi_Hebr');

        done();
      });
    });

    test('One matching string (dash)', function(done){
      req.headers['accept-language'] = 'cs-cz';

      locale(req, res, function next(){
        expect(req.locale).to.be('cs-cz');

        done();
      });
    });

    test('One matching partial string (underscore)', function(done){
      req.headers['accept-language'] = 'yi_Hebr';

      locale(req, res, function next(){
        expect(req.locale).to.be('yi');

        done();
      });
    });

    test('One matching partial string (dash)', function(done){
      req.headers['accept-language'] = 'cs-cz';

      locale(req, res, function next(){
        expect(req.locale).to.be('cs');

        done();
      });
    });

    test('Fallback language', function(done){
      var locale = middlewares.locale({
        acceptedLocales: ['ko', 'eu', 'ja'],
        fallbackLocale: 'tlh'
      });

      locale(req, res, function next(){
        expect(req.locale).to.be('tlh');

        done();
      });
    });
  });
});