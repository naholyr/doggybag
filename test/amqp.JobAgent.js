"use strict";

var expect = require('expect.js');
var sinon = require('sinon');

var fakeAgent = require("./mocks/fake-agent.js");
var AMQP_OPTIONS = {
  "autoReconnect": false, // <- very important as it breaks mocking capacities
  "module": fakeAgent,
  "host": "fake-rabbitmq.local.host",
  "exchange": "test-deepthroat",
  "readQueue": "responses",
  "writeQueue": "requests"
};

suite("Job Agent", function() {
  var JobAgent = require('../amqp/JobAgent.js');
  var AMQPJobResultClient = require('./mocks/AMQPJobResultClient.js');
  var agent; // Initialized before

  suiteSetup(function(done) {
    JobAgent("fake", AMQP_OPTIONS, function(err, a) {
      expect(err).to.not.be.ok();
      agent = a;
      done();
    }, { "AMQPJobResultClient": AMQPJobResultClient });
  });

  suite('Receiving jobs', function(done) {
    var msgAck;

    setup(function(done) {
      msgAck = sinon.spy();
      setTimeout(function() {
        agent.client.emit('read', {
          "at": Date.now(),
          "jobId": "unique-id",
          "data": "some data"
        }, sinon.mock(), sinon.mock(), msgAck);
      }, 10);
      done();
    });

    test('should receive expected arguments', function(done) {
      agent.once('job', function(job, respond, ack) {
        expect(job).to.be.an('object');
        expect(respond).to.be.a('function');
        expect(ack).to.be.a('function');
        done();
      });
    });
    test('should complete job data', function(done) {
      agent.once('job', function(job, respond, ack) {
        expect(job.at).to.be.a('number');
        expect(job.jobId).to.equal('unique-id');
        expect(job.jobType).to.equal('fake');
        expect(job.data).to.equal('some data');
        done();
      });
    });
    test('should call validate and run, and have already responded', function(done) {
      fakeAgent.validate.reset();
      fakeAgent.run.reset();
      agent.client.write.reset();
      agent.once('job', function(job, respond, ack) {
        process.nextTick(function() {
          expect(agent.client.write.calledOnce).to.be.ok();
          expect(agent.client.write.getCall(0).args[0]).to.have.key('data');
          expect(agent.client.write.getCall(0).args[0].data).to.eql({"success": true, "data": undefined});
          expect(fakeAgent.validate.calledOnce).to.be.ok();
          expect(fakeAgent.run.calledOnce).to.be.ok();
          expect(function() {
            respond('some response')
          }).to.throwError();
          expect(msgAck.calledOnce).to.be.ok();
          done();
        });
      });
    });
    test('should be unable to acknowledge message more than once', function(done) {
      agent.once('job', function(job, respond, ack) {
        ack();
        ack();
        ack();
        expect(msgAck.calledOnce).to.be.ok();
        done();
      });
    });

    suite('Extra parameters', function() {

      function buildAgent(validate, run, cb) {
        var options = {
          "autoReconnect": AMQP_OPTIONS.autoReconnect,
          "host": AMQP_OPTIONS.host,
          "exchange": AMQP_OPTIONS.exchange,
          "readQueue": AMQP_OPTIONS.readQueue,
          "writeQueue": AMQP_OPTIONS.writeQueue,
          "module": {
            "validate": validate,
            "run": run
          }
        };

        JobAgent("fake", options, function(err, agent) {
          if (!err) {
            setTimeout(function() {
              agent.client.emit('read', {
                "at": Date.now(),
                "jobId": "unique-id",
                "data": "some data"
              }, sinon.mock(), sinon.mock(), sinon.mock());
            }, 10);
          }
          cb(err, agent);
        }, { "AMQPJobResultClient": AMQPJobResultClient });
      }

      test('- jobId in validate', function(done) {
        buildAgent(function validate3(data, jobId, cb) {
          expect(data).to.equal('some data');
          expect(jobId).to.equal('unique-id');
          expect(cb).to.be.a('function');
          cb(null, data);
        }, function run2(data, cb) {
          expect(data).to.equal('some data');
          expect(cb).to.be.a('function');
          cb(null, data);
        }, function built(err, agent) {
          agent.once('job', function(job, respond, ack) {
            done();
          });
        });
      });

      test('- jobId in run', function(done) {
        buildAgent(function validate2(data, cb) {
          expect(data).to.equal('some data');
          expect(cb).to.be.a('function');
          cb(null, data);
        }, function run3(data, jobId, cb) {
          expect(data).to.equal('some data');
          expect(jobId).to.equal('unique-id');
          expect(cb).to.be.a('function');
          cb(null, data);
        }, function built(err, agent) {
          agent.once('job', function(job, respond, ack) {
            done();
          });
        });
      });

      test('- jobId in both', function(done) {
        buildAgent(function validate3(data, jobId, cb) {
          expect(data).to.equal('some data');
          expect(jobId).to.equal('unique-id');
          expect(cb).to.be.a('function');
          cb(null, data);
        }, function run3(data, jobId, cb) {
          expect(data).to.equal('some data');
          expect(jobId).to.equal('unique-id');
          expect(cb).to.be.a('function');
          cb(null, data);
        }, function built(err, agent) {
          agent.once('job', function(job, respond, ack) {
            done();
          });
        });
      });

      test('- jobId and jobAt in both', function(done) {
        buildAgent(function validate4(data, jobId, jobAt, cb) {
          expect(data).to.equal('some data');
          expect(jobId).to.equal('unique-id');
          expect(jobAt).to.be.a('number');
          expect(cb).to.be.a('function');
          cb(null, data);
        }, function run4(data, jobId, jobAt, cb) {
          expect(data).to.equal('some data');
          expect(jobId).to.equal('unique-id');
          expect(jobAt).to.be.a('number');
          expect(cb).to.be.a('function');
          cb(null, data);
        }, function built(err, agent) {
          agent.once('job', function(job, respond, ack) {
            done();
          });
        });
      });

    });
  });

  suite('Socket handling', function() {
    test('should close connection', function() {
      agent.end(function() {
      });
      expect(agent.client.end.calledOnce).to.be.ok();
    });
  });

});
