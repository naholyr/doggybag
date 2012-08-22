var expect = require('expect.js');

process.env.NODE_ENV = 'test';


var logger = require('../logger');

function checkLogger(name) {
  expect(logger[name]).to.be.an('object');
  ["debug", "info", "warn", "error"].forEach(function(level) {
    expect(logger[name][level]).to.be.a('function');
  });
}

suite('doggybag/logger', function() {

  test('always provides CLI', function() {
    checkLogger('cli');
    expect(logger.cli.data).to.be.a('function');
  });

  test('should fail with empty list of names', function() {
    expect(function() {
      logger.add([], {});
    }).to.throwException(/empty list/i);
  });

  test('"add" is a forbidden name', function() {
    expect(function() {
      logger.add('add', { "add": {} });
    }).to.throwException(/can't be used as a logger name/i);
  });

  suite('work with hashes', function() {

    suiteSetup(function() {
      logger.add('one', {
        console: {}
      });
    });

    test('"one" initialized', function() {
      checkLogger('one');
    });

    suite('multiple at once', function() {

      suiteSetup(function() {
        logger.add(['two', 'three'], {
          two: {
            console: {}
          },
          three: {} // rely on winston's default
        });
      });

      test('"two" initialized', function() {
        checkLogger('two');
      });

      test('"three" initialized', function() {
        checkLogger('two');
      });

      test('should fail on missing configuration', function() {
        expect(function() {
          logger.add(['four', 'five'], { "four": {} });
        }).to.throwException(/logger "five" has no defined configuration/i);
      });

    });

  });

  suite('work with doggybag/config', function() {

    suiteSetup(function() {
      require('../config').add('logging', {dir: __dirname + "/logging"});
    });

    test('initialization ok with loaded config', function() {
      logger.add(['fromConfig1', 'fromConfig2']);
    });

    test('loggers added from loaded config', function() {
      checkLogger('fromConfig1');
      checkLogger('fromConfig2');
    });

    test('fail on missing configuration', function() {
      expect(function() {
        logger.add('fromConfig3');
      }).to.throwException(/logger "fromConfig3" has no defined configuration/i);
    })

  });

});