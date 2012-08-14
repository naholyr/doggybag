# AMQP job/result wrapper

This component uses AMQP as a transport layer to implement a `worker` / `scheduler` system:

* The scheduler `order`s a `job`, giving a job type and data
* If an agent (or worker) is able to work on this job type and is currently listening, it will receive the `job`
* The agent works, and emits a `result` bound to original message (by a unique ID)
* The scheduler receives the `result` and does whatever he's supposed to do with it

In case of error the agent will be able to refuse a job, and tell if it should be sent later again or not.

## Usage

### Declaration

First, declare a scheduler:

```javascript
var amqp = require('doggybag/amqp');

var options = {
  // Connection information
  "host": "rabbitmq.server",
  "exchange": "test-hello"
};

// Initialize scheduler
var scheduler = amqp.newScheduler(options, function(err, scheduler) {
  // when connection is ready
});
```

Then, declare the agent:

```javascript
var amqp = require('doggybag/amqp');

var jobType = "hello";

var options = {
  // Connection information
  "host": "rabbitmq.server",
  "exchange": "test-hello",
  // Agent methods (see "implementation")
  "module": {
    "validate": validate,
    "run": run
  }
};

// Initialize agent
var agent = amqp.newAgent(jobType, options, function(err, agent) {
  // when connection is ready
});
```

### Implementation

Scheduler will order jobs:

```javascript
var jobType = "hello";
var jobData = {"who": "world"};

scheduler.order(jobType, jobData, function optionalCallback(job) {
  // the actually sent job:
  // job.at = now
  // job.jobId = unique ID
  // job.jobType === jobType
  // job.data === jobData
});
```

Agent will handle jobs using the two mandatory exported methods:

```javascript
// Validation
function validate(jobData, cb) {
  if (!jobData.who) {
    return cb(new Error('Who am I supposed to say hello?'));
  }
  cb(null, jobData);
}

// Process
function run(jobData, cb) {
  cb(null, 'Hello, ' + jobData.who);
}
```

Scheduler will handle results:

```javascript
scheduler.on('result', function(result, ack, reject) {
  // result.jobType == "hello"
  // result.at = now
  // result.jobAt = date
  // result.jobId = job's unique ID (use it to match results with pending operation)
  // result.data = an object:
  if (result.data.success) {
    console.log('OK →', result.data.data); // should print "OK → Hello, world"
  } else {
    console.log('ERROR', result.data.error, result.data.data); // print error code and more info
  }
  // IMPORTANT! always ack or reject the message, or it will stay in the queue and you will receive them
  // each time you restart. But worse: you will not receive any new result until restarted!
  ack();
});
```

### Execution

Both should be running. Usually the scheduler is part of your app and then it should not be a process of itself, but the
agent will generally need to be run separately. Just write a binary with `require('./lib/my-agent.js')` and run it, you
can additionnally listen to events and write some logs down.

## Configuration

### Common options

All are optional, however you're strongly encouraged to define "exchange".

* `exchange`: AMQP exchange used for communicating (same queue names on different exchanges won't mix messages). Good
practice: always specify your exchange.
* `autoReconnect`: experimental option that enables automatic re-connection to AMQP server when it dropped. Not heavily
tested but no drawback has been detected. Enabled by default.
* `host`, `port`, `login`, `password`, `vhost`: connection information.
* `resultsQueue`: queue where results will be written (read by scheduler, published by agent).
* `jobsQueue`: queue where jobs will be written (read by agent, published by scheduler).

Following options are kept for backward compatibility but you shouldn't use them anymore:

* `writeQueue`: queue where data will be written (default is "results" for agents, "jobs" for scheduler).
* `readQueue`: queue where data will be read ("results" for scheduler, "jobs" for agents).
* `readRoute`: additional information for reading specific data, which will allow agents to read only jobs of their type
(default is jobType for agent, and none for scheduler).

### Scheduler options

No specific option for scheduler.

### Agent options

You have to provide `module` (or alternatively `modulePath` or `modulesPath`).

* `maxRetries`: when an agent fails and requeue the job, it won't be handled more than X times (default = 3). Past this
number of retries, message is qualified as "dead letter".
* `retryTimeout`: delay before requeueing (default = 30 seconds).
* `module`: the implementation of the agend, must provide two methods `validate(job, cb)` and `run(job, cb)`.
* `modulePath`: if you don't want to provide `module` directly, pass here a path which will be required and used as
module (useful to put configuration in a JSON file for example).
* `modulesPath`: if you're really lazy and follow common-sense convention, set this option and the module will be
required from "`modulesPath`/`jobType`.js".

## Error handling

Common errors:
* `INVALID_JOB`: Job validation failed (you called `cb` with an error as first parameter in `validate` method). No requeue.
* `VALIDATION_UNCAUGHT_EXCEPTION`: Job validation poorly failed (you threw an exception in `validate` method). No requeue.
* `JOB_FAILED`When an error occurs at runtime, agent will respond with error `JOB_FAILED`

From agent, you may want to have greater control on requeuing, this is easily achieved using embedded error class
`JobAgent.RejectError`:

```javascript
var RejectError = require('doggybag/amqp/JobAgent').RejectError;
// Usage: new RejectError(message [, requeue [, delay]])

function run(data, cb) {
  query(data.sql, function (err, result) {
    if (err) {
      // OK, query failed, but this one can fail if moon is not perfectly aligned with earth and sun, let's retry tomorrow
      return cb(new RejectError(err, true, 24*3600000));
    }
    …
  });
}
```

Note that you can't requeue a validation error. `validate` is supposed to validate if all options are here, syntactically
valid, and should not depend on the time of day. If you can have errors depending on context (an object referred by the
job data has disappeared from database ?) handle it at run level so you can decide how to handle error.

Arguably, we let all the control to agent. If you want the scheduler to get the power of deciding when a job should be
requeued or abandoned, just don't requeue it from agent, and in scheduler just call `order()` again when you feel it.
No need for specific API here.

## Result

There will always be a "result" object passed with `result` event received by scheduler. This object can have following
attributes:

* `data` (mixed): depending on context, can be an error's stack trace or the actual result.
* `success` (boolean): true if job passed successfully.
* `error` (string): error code if an error occurred.
* `originalJob` (object): the ordered job, only available when a validation error occurred, so you can compare original
job and data potentially sent back by `validate`'s callback.
* `partialResult` (result): the result sent by `run`'s callback, only available with error `JOB_FAILED`.

Mandatory attributes: `success` or `error`, and `data`.

## Events

### Common events

* all AMQP client related events, including `error` and `end`.
* `read` when reading a value (result for scheduler, job for agent).
* `ready` when connection succeeded.

### Scheduler events

* `result` when a result is ready (parameters = result, ack, reject; call `ack()` or `reject()` to flush the message).
* `job` when a job has been ordered (useful for logging purpose, parameters = job).

### Agent events

* `result` when a result is sent (useful for logging purpose, parameters = result, job).
* `job` when a job is received (parameters = job, respond, ack; call `respond(err, data)` to send result).

## Replace logger

Logger must have following methods (`winston` is used internally):
* `error(message, moreInfo)`
* `debug(message, moreInfo)`
* `warn(message, moreInfo)`

### Using dependency injection

You can replace some internal components by injecting dependencies "manually". Typically you will want to replace the
logger:

```javascript
amqp.newAgent(jobType, options, cb, {logger: myLogger});
amqp.newScheduler(options, cb, {logger: myLogger});
```

You can replace other internal components, but these are far from common cases.

### Using `logger` attribute

The logger is exposed as an attribute of agent or scheduler (they're both the same instance).

It's an instance of `winston` module, you can just configure it your way, or override some of its methods.
