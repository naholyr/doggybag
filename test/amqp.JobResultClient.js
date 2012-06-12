"use strict";

var expect = require('expect.js');

var AMQP_OPTIONS = {
    "autoReconnect": false, // <- very important as it breaks mocking capacities
    "host": "fake-rabbitmq.local.host",
    "exchange": "test-deepthroat",
    "readQueue": "responses",
    "writeQueue": "requests"
};

suite("AMQP read/write client", function() {
    var AMQPJobResultClient = require('../amqp/AMQPJobResultClient.js');
    var amqp = require('./mocks/amqp');
    var client; // Initialized before

    suiteSetup(function (done) {
        client = AMQPJobResultClient(AMQP_OPTIONS, { "amqp": amqp });
        client.on('ready', function () { done() });
    });

    suite('Write API', function () {
        test('should expose the internal connection', function () {
            expect(amqp.createConnection.calledOnce).to.be.ok();
            expect(amqp.createConnection.returned(client.connection)).to.be.ok();
        });
        test('should initialize persistent exchange', function () {
            var e = client.connection.exchange;
            expect(e.calledOnce).to.be.ok();
            var args = e.getCall(0).args;
            expect(args[0]).to.equal(AMQP_OPTIONS.exchange);
            expect(args[1]).to.be.an('object');
            expect(args[1].type).to.equal('topic');
            expect(args[1].durable).to.be.ok();
            expect(args[1].autoDelete).to.not.be.ok();
        });
        test('should have published via the exchange on writeQueue', function (done) {
            client.write('some data', 'the-suffix', function () {
                var c = client.connection;
                expect(c.publish.called).to.not.be.ok();
                expect(c.exchangePublish.calledOnce).to.be.ok();
                var args = c.exchangePublish.getCall(0).args;
                expect(args[0]).to.equal(AMQP_OPTIONS.writeQueue + '.the-suffix');
                expect(args[1]).to.equal('some data');
                done();
            });
        });
    });

    suite('Read API', function () {
        test('should have subscribed to readQueue', function () {
            expect(client.connection.queueSubscribe.calledOnce).to.be.ok();
        })
    });

    suite('Socket handling', function () {
        test('should close connection', function () {
            client.end(function () { });
            expect(client.connection.end.calledOnce).to.be.ok();
        });
    });

});
