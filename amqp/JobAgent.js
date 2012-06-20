"use strict";

var winston = require('winston');
var path = require('path');

var Client = require('./AMQPJobResultClient');

function Agent(jobType, options, dependencies) {
  // Injected dependencies
  dependencies = dependencies || {};
  var Client = dependencies.AMQPJobResultClient || require('./AMQPJobResultClient');

  // Options
  options = Client.merge({
    "exchange":"deepthroat",
    "readQueue":"jobs",
    "readRoute":jobType,
    "writeQueue":"results",
    "maxRetries":3,
    "retryTimeout":30000
    // "modulesPath": "/path/to/agents"
    // "modulePath": "/path/to/agents/myAgent.js"
    // "module": require('myAgent')
  }, options);

  // Internal client
  var c = Client(options);

  // Exposed agent
  var e = new (Client.EventEmitter)();

  // Expose options
  e.options = options;

  // Expose internal client
  e.client = c;

  // Spread error
  c.on('error', function (err) {
    winston.error(err);
    e.emit('error', err);
  });

  // Spread ready
  c.on('ready', function () {
    e.emit('ready')
  });

  // Receive job
  c.on('read', function (message, headers, info, ack, messageInstance) {
    winston.debug('Receiving job');

    var isAck = false;
    var isResponded = false;
    var job = {
      "at":message.at,
      "jobId":message.jobId,
      "jobType":message.jobType || jobType,
      "data":message.data
    };
    // Acknowledge message (you may want to acknowledge before sending result)
    function doAck() {
      if (!isAck) {
        isAck = true;
        ack();
      }
    }

    function doReject(requeue, timeout, result) {
      if (!isAck) {
        isAck = true;
        // Simple case of message rejected because of a fatal error: no requeue, no retry
        if (!requeue) {
          return messageInstance.reject(false);
        }
        // Requeue the message for later retry, two possible cases
        // 1. The message has not reached the retry limit…
        var maxRetries = parseInt(options.maxRetries, 10);
        if (isNaN(maxRetries)) {
          maxRetries = DEFAULT_MAX_RETRIES;
        }
        var retryCount = parseInt(message.retryCount, 10);
        if (isNaN(retryCount)) {
          retryCount = 0;
        }
        if (retryCount < maxRetries) {
          // … then the message can be requeued
          // Increment counter
          message.retryCount = retryCount + 1;
          // Check requeue timeout
          if (typeof timeout === 'undefined') timeout = options.retryTimeout;
          timeout = parseInt(timeout, 10);
          if (isNaN(timeout)) timeout = 0;
          // Re-publish modified message
          // Note that we re-publish instead of reject + requeue, because reject will not place the message
          // at bottom of the queue as we would expect it, plus we cannot modify message's payload and woudn't
          // be able to increment retry counter !
          winston.warn('Message republished for later retry', { "delay":timeout, "jobId":message.jobId, "result":JSON.stringify(result) });
          // Note that we could ACK right now, but if we do and the agent is killed in the meantime, the message
          // will be lost forever: never re-published, already acked = lost.
          setTimeout(function () {
            c.write(message, c.options.readRoute, function () {
              winston.debug('Message has been republished, ack now', { "delay":timeout, "jobId":message.jobId });
              ack();
            }, c.options.readQueue);
          }, timeout);
          return;
        }
        // 2. The message has reached the retry limit…
        // … then it's simply reject as dead-letter
        winston.warn('Dead-letter', { "jobId":message.jobId });
        messageInstance.reject(false);
      }
    }

    // Send result
    function doRespond(result, rejectRequeue, timeout) {
      if (isResponded) {
        throw new Error('Cannot call respond() twice !');
      }
      isResponded = true;
      // Auto-ack on respond
      if (!isAck) {
        if (typeof rejectRequeue !== 'undefined' && rejectRequeue !== null) {
          doReject(rejectRequeue, timeout, result);
          return; // Do not push result when rejecting
        } else {
          doAck();
        }
      }
      // Write response to results queue
      var result = {
        "at":Date.now(),
        "jobAt":message.at,
        "jobId":message.jobId,
        "jobType":message.jobType || jobType,
        "data":result
      };
      winston.debug('Sending result', { "result(bytes)":JSON.stringify(result).length });
      return c.write(result, result.jobType, function () {
        e.emit('result', result, job);
      });
    }

    // Emit job event for each received message on this route
    winston.debug('Received job', { "jobId":job.jobId });
    e.emit('job', job, doRespond, doAck);
  });

  // Close connection
  e.end = function (done) {
    winston.debug('Closing agent...');
    c.end(done);
  };

  // Expose jobType value
  e.jobType = jobType;

  return e;
}

module.exports = function (jobType, options, fn, dependencies) {
  options = options || {};

  // When finished
  var done = function done(err) {
    process.nextTick(function () {
      if (fn) fn(err, agent);
    });
    return agent;
  };

  // Get standard agent components
  var agentModule;
  try {
    agentModule = options.module || require(options.modulePath || path.join(options.modulesPath || '.', jobType));
  } catch (e) {
    return done(e, null);
  }
  delete options.module;
  delete options.modulePath;

  if (agentModule.options) {
    options = Client.merge(options, agentModule.options);
  }

  // The agent (~ AMQP client)
  var agent = Agent(jobType, options, dependencies);

  // When a job data has been validated
  var onValidated = function onValidate(jobData, respond) {
    process.nextTick(function () {
      try {
        agentModule.run(jobData, function (err, result) {
          if (err) {
            respond({ "error":"JOB_FAILED", "data":err.stack || err.toString(), "partialResult":result }, err.reject ? err.requeue : null, err.reject && (err.requeueDelay || options.requeueDelay));
          } else {
            respond({ "success":true, "data":result });
          }
        });
      } catch (e) {
        respond({ "error":"RUN_UNCAUGHT_EXCEPTION", "data":e.stack || e.toString() });
      }
    });
  };

  // When a new job is received
  var onJob = function onJob(job, respond) {
    try {
      agentModule.validate(job.data, function (err, jobData) {
        if (err) {
          respond({ "error":"INVALID_JOB", "data":err.stack || err.toString(), "originalJob": job });
        } else {
          onValidated(jobData, respond);
        }
      });
    } catch (e) {
      respond({ "error":"VALIDATION_UNCAUGHT_EXCEPTION", "data":e.stack || e.toString(), "originalJob": job });
    }
  };

  // Bind main event to our workflow
  agent.on('job', onJob);

  return done(null, agent);
};

// Exposed specific error class to ease access to reject/requeue API
function RejectError(message, requeue, delay) {
  // Inheritance
  Error.call(this, message);
  // stack
  Error.captureStackTrace(this, this.constructor);
  // Message
  this.message = message;
  // name
  this.name = this.constructor.name;
  // reject & requeue
  this.reject = true;
  this.requeue = !!requeue;
  if (typeof delay !== 'undefined') {
    this.requeueDelay = delay;
  }
}

RejectError.prototype.__proto__ = Error.prototype;

module.exports.RejectError = RejectError;
