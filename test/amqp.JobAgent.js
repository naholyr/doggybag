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

    suiteSetup(function (done) {
        JobAgent("fake", AMQP_OPTIONS, function (err, a) {
            expect(err).to.not.be.ok();
            agent = a;
            done();
        }, { "AMQPJobResultClient": AMQPJobResultClient });
    });

    suite('Receiving jobs', function (done) {
        var msgAck;

        setup(function (done) {
            msgAck = sinon.spy();
            setTimeout(function () {
                agent.client.emit('read', {
                    "at": Date.now(),
                    "jobId": "unique-id",
                    "data": "some data"
                }, sinon.mock(), sinon.mock(), msgAck);
            }, 10);
            done();
        });

        test('should receive expected arguments', function (done) {
            agent.once('job', function (job, respond, ack) {
                expect(job).to.be.an('object');
                expect(respond).to.be.a('function');
                expect(ack).to.be.a('function');
                done();
            });
        });
        test('should complete job data', function (done) {
            agent.once('job', function (job, respond, ack) {
                expect(job.at).to.be.a('number');
                expect(job.jobId).to.equal('unique-id');
                expect(job.jobType).to.equal('fake');
                expect(job.data).to.equal('some data');
                done();
            });
        });
        test('should call validate and run, and have already responded', function (done) {
            fakeAgent.validate.reset();
            fakeAgent.run.reset();
            agent.client.write.reset();
            agent.once('job', function (job, respond, ack) {
                process.nextTick(function () {
                    expect(agent.client.write.calledOnce).to.be.ok();
                    expect(agent.client.write.getCall(0).args[0]).to.have.key('data');
                    expect(agent.client.write.getCall(0).args[0].data).to.eql({"success":true, "data":undefined});
                    expect(fakeAgent.validate.calledOnce).to.be.ok();
                    expect(fakeAgent.run.calledOnce).to.be.ok();
                    expect(function () { respond('some response') }).to.throwError();
                    expect(msgAck.calledOnce).to.be.ok();
                    done();
                });
            });
        });
        test('should be unable to acknowledge message more than once', function (done) {
            agent.once('job', function (job, respond, ack) {
                ack();
                ack();
                ack();
                expect(msgAck.calledOnce).to.be.ok();
                done();
            });
        });
    });

    suite('Socket handling', function () {
        test('should close connection', function () {
            agent.end(function () { });
            expect(agent.client.end.calledOnce).to.be.ok();
        });
    });

});
