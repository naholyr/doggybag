"use strict";

var expect = require('expect.js');

var AMQP_OPTIONS = {
    "autoReconnect": false, // <- very important as it breaks mocking capacities
    "host": "fake-rabbitmq.local.host",
    "exchange": "test-deepthroat",
    "readQueue": "responses",
    "writeQueue": "requests"
};

suite("Job Scheduler", function() {
    var JobScheduler = require('../amqp/JobScheduler.js');
    var AMQPJobResultClient = require('./mocks/AMQPJobResultClient.js');
    var scheduler; // Initialized before

    suiteSetup(function (done) {
        scheduler = JobScheduler(AMQP_OPTIONS, { "AMQPJobResultClient": AMQPJobResultClient });
        scheduler.on('ready', function () { done() });
    });

    test('should write formatted job data', function (done) {
        var job = { "uri": "http://www.google.fr" };
        scheduler.order('pagerank', job, function (err) {
            expect(scheduler.client.write.calledOnce).to.be.ok();
            var args = scheduler.client.write.getCall(0).args;
            expect(args[0]).to.be.an('object');
            expect(args[0].at).to.be.a('number');
            expect(args[0].jobId).to.be.a('string');
            expect(args[0].jobType).to.equal('pagerank');
            expect(args[0].data).to.equal(job);
            done();
        });
    });

    suite('Socket handling', function () {
        test('should close connection', function () {
            scheduler.end(function () { });
            expect(scheduler.client.end.calledOnce).to.be.ok();
        });
    });

});
