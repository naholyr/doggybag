/**
 * Public API
 */

var JobAgent = require('./JobAgent.js');
var JobScheduler = require('./JobScheduler.js');

var API = module.exports = {

  /**
   * Start a new agent (job consumer)
   *
   * @param type JobType "web-crawler", "pagerank", etc.
   * @param options See lib/AMQPJobResultClient.js
   * @param done function (err, agent) when agent is ready or failed
   */
  "newAgent":function newAgent(type, options, done, dependencies) {
    dependencies = dependencies || {};
    return (dependencies.JobAgent || JobAgent)(type, options, function (err, agent) {
      if (err) return done(err); // Validation error
      doneOnReadyOrFirstError(agent, done);
    }, dependencies);
  },

  /**
   * Start a new scheduler (job publisher)
   *
   * @param options See lib/AMQPJobResultClient.js + option "singleton" default true
   * @param done function (err, scheduler)
   */
  "newScheduler":function newScheduler(options, done, dependencies) {
    dependencies = dependencies || {};
    return doneOnReadyOrFirstError((dependencies.JobScheduler || JobScheduler)(options, dependencies), function (err, scheduler) {
      if (!err && typeof API.scheduler === 'undefined') {
        API.scheduler = scheduler;
      }
      return done(err, scheduler);
    });
  },

  /**
   * Retrieve the first scheduler created using newScheduler()
   */
  "scheduler":undefined

};

/**
 * Execute callback when first "ready" or "error" event is received
 *
 * @param e
 * @param done
 * @return {*}
 */
function doneOnReadyOrFirstError(e, done) {
  if (!e) return done();
  function respond(err) {
    e.removeListener('error', respond);
    e.removeListener('ready', respond);
    done(err, e);
  }

  e.once('error', respond);
  e.once('ready', respond);
  return e;
}
