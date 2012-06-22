var expect = require('expect.js');

process.env.NODE_ENV = 'test';


var config = require('../config');


suite('doggybag/config', function () {

  var dir = __dirname + "/config";

  test('always loads ENV and CLI', function () {
    expect(config.stores).to.be.an('object');
    expect(config.stores).to.have.key('env');
    expect(config.stores).to.have.key('argv');
  });

  test('throws when no file exists', function () {
    // Invalid name
    expect(function () {
      config.add('undef', {"dir":dir});
    }).to.throwError();
    // Invalid dir
    expect(function () {
      config.add('sample', {"dir":"/tmp/undefdir"});
    }).to.throwError();
  });

  suite('- nconf', function () {

    var nconf = require('nconf');

    test('is exposed', function () {
      expect(config.nconf).to.equal(require('nconf'));
      expect(config.stores).to.equal(require('nconf').stores);
    });

    test('is used when "type" option is provided', function () {
      var originalAdd = nconf.add;
      var called = false;
      nconf.add = function () {
        called = true;
        return originalAdd.apply(this, arguments);
      };
      var mem = config.add('fallback', {"type":"memory"});
      expect(mem).to.equal(config.stores.fallback);
      expect(config.fallback).to.equal(config.stores.fallback);
      expect(called).to.be(true);
      nconf.add = originalAdd;
    });

  });

  suite('- default config', function () {

    var provider;

    suiteSetup(function () {
      provider = config.add({"dir":dir});
    });

    test('name is "default"', function () {
      expect(config.stores).to.have.key('default');
      expect(config.stores.default).to.equal(provider);
    });

    test('config provider is exposed as a module key', function () {
      expect(config.default).to.equal(config.stores.default);
    });

    test('has loaded default.json', function () {
      expect(provider.get('whoami')).to.equal('default');
      expect(provider.get('default')).to.be(true);
    });
    test('has loaded default.test.json', function () {
      expect(provider.get('env')).to.equal('test');
    });

  });

  suite('- default config with forced env', function () {

    var provider;

    suiteSetup(function () {
      provider = config.add({"dir":dir, "env":"good"});
    });

    test('name is still "default"', function () {
      expect(config.stores).to.have.key('default');
      expect(config.stores.default).to.equal(provider);
    });

    test('has loaded default.good.json', function () {
      expect(provider.get('env')).to.equal('good');
    });

  });

  suite('- sample config', function () {

    var provider;

    suiteSetup(function () {
      provider = config.add('sample', {"dir":dir, "noShortcut":true});
    });

    test('name is "sample"', function () {
      expect(config.stores).to.have.key('sample');
      expect(config.stores.sample).to.equal(provider);
    });

    test('config provider is *not* exposed as a module key', function () {
      expect(config.default).to.equal(config.stores.default);
    });

    test('has loaded sample.json', function () {
      expect(provider.get('whoami')).to.equal('sample');
      expect(provider.get('default')).to.be(true);
    });
    test('has loaded sample.test.json', function () {
      expect(provider.get('env')).to.equal('test');
    });

  });

});