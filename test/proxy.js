var middlewares = require('../middlewares');
var expect = require('expect.js');

suite('doggybag/middlewares', function(){

  suite('#proxy', function(){
    var proxy = middlewares.proxy();
    var res = {};
    var req = {
      headers: {
        host: '127.0.0.1:80',
        'accept-encoding': 'gzip,deflate,sdch'
      }
    };

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

});