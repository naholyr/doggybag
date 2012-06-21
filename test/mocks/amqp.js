var sinon = require('sinon');

var EventEmitter = require('events').EventEmitter;

var connection = sinon.spy(function () {
  var e = new EventEmitter();
  e.queueBind = sinon.spy();
  e.queueSubscribe = sinon.spy();
  e.exchangePublish = sinon.spy();
  e.queue = sinon.stub().callsArgWith(2, { "bind":e.queueBind, "subscribe":e.queueSubscribe });
  e.exchange = sinon.stub().callsArgWith(2, { "publish":e.exchangePublish });
  e.publish = sinon.spy();
  e.end = sinon.spy();
  process.nextTick(function () {
    e.emit('ready');
  });
  return e;
});

module.exports = { "createConnection":connection };
