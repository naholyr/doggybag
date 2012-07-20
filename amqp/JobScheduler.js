// Deepthroat scheduling API

var uuid = require('node-uuid');

module.exports = function Scheduler(options, dependencies) {
  // Injected dependencies
  dependencies = dependencies || {};
  var Client = dependencies.AMQPJobResultClient || require('./AMQPJobResultClient');
  var logger = dependencies.logger || require('winston');

  // Options
  options = Client.merge({
    "exchange":"deepthroat",
    "readQueue":"results",
    "writeQueue":"jobs"
  }, options);

  // Internal client
  var c = Client(options);

  // Exposed scheduler
  var e = new (Client.EventEmitter)();

  // Expose internal client
  e.client = c;

  // Spread error
  c.on('error', function (err) {
    logger.error(err);
    e.emit('error', err);
  });

  // Spread ready
  c.on('ready', function () {
    e.emit('ready')
  });

  // Receive result
  c.on('read', function (message, headers, info, ack, m) {
    logger.debug('Received result', { "result(bytes)":JSON.stringify(message).length });
    e.emit('result', message, ack, m.reject.bind(m));
  });

  // Order new job
  e.order = function order(jobType, data, done) {
    if (!done) done = function () {
    };
    var job = {
      "at":Date.now(),
      "jobId":uuid(),
      "jobType":jobType,
      "data":data
    };
    logger.debug('Sending job...', { "jobId":job.jobId });
    return c.write(job, jobType, function () {
      e.emit('job', job);
      done(job);
    });
  };

  // Close connection
  e.end = function (done) {
    logger.debug('Closing scheduler');
    c.end(done);
  };

  return e;
};
