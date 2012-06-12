
var sinon = require('sinon');
var original = require('../../amqp/AMQPJobResultClient.js');
var EventEmitter = require('events').EventEmitter;

module.exports = sinon.spy(function () {
    var e = new EventEmitter();
    e.write = sinon.stub().callsArg(2);
    e.end = sinon.spy();
    process.nextTick(function () { e.emit('ready'); });
    return e;
});

// Original API exposes some dependencies
module.exports.merge = original.merge;
module.exports.EventEmitter = original.EventEmitter;
