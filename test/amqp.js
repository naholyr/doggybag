"use strict";

var expect = require('expect.js');
var sinon = require('sinon');
var EventEmitter = require('events').EventEmitter;

suite('Main API', function () {
  var amqp = require('../amqp');

  test('should have expected properties', function () {
    expect(amqp.newAgent).to.be.a('function');
    expect(amqp.newScheduler).to.be.a('function');
    expect(amqp).to.have.property('scheduler');
  });

  suite('Agent', function (done) {
    var e, JobAgent, fn, name, options;
    setup(function () {
      e = new EventEmitter();
      JobAgent = sinon.stub().callsArgWith(2, undefined, e);
      fn = sinon.spy();
      name = 'fake';
      options = {};
      setTimeout(function () {
        e.emit('ready');
      }, 30);
    });
    test('should create a new JobAgent', function (done) {
      amqp.newAgent(name, options, fn, { "JobAgent":JobAgent });
      e.on('ready', function () {
        expect(JobAgent.calledOnce).to.be.ok();
        expect(fn.calledOnce).to.be.ok();
        expect(fn.getCall(0).args[0]).to.not.be.ok();
        expect(fn.getCall(0).args[1]).to.be.an('object');
        done();
      });
    });
  });

  suite('Scheduler', function (done) {
    var e, JobScheduler, fn, options;
    setup(function () {
      e = new EventEmitter();
      JobScheduler = sinon.stub().returns(e);
      fn = sinon.spy();
      options = {};
      setTimeout(function () {
        e.emit('ready');
      }, 30);
    });
    test('should have no scheduler stored', function (done) {
      expect(amqp.scheduler).to.not.be.ok();
      e.on('ready', done);
    });
    test('should create a new JobScheduler', function (done) {
      amqp.newScheduler(options, fn, { "JobScheduler":JobScheduler });
      e.on('ready', function () {
        expect(JobScheduler.calledOnce).to.be.ok();
        expect(fn.calledOnce).to.be.ok();
        expect(fn.getCall(0).args[0]).to.not.be.ok();
        expect(fn.getCall(0).args[1]).to.be.an('object');
        done();
      });
    });
    test('should have stored previous instance', function (done) {
      expect(amqp.scheduler).to.be.an('object');
      e.on('ready', done);
    });
  });

  suite('Scheduler', function () {

  });
});
