var EventEmitter = require('events').EventEmitter;


// shallow merge objects
function merge(to, from, keys) {
  if (typeof from !== 'object') from = {};
  if (typeof keys === 'undefined') keys = Object.keys(from);
  keys.forEach(function (key) {
    if (typeof from[key] !== 'undefined') to[key] = from[key];
  });
  return to;
}

// Options:
// * readQueue (mandatory)
// * readRoute (default = none, will match pattern "readQueue.#", else will match pattern "readQueue.readRoute")
// * writeQueue (mandatory)
// * port (default 5672)
// * host (default localhost)
// * login (default "guest")
// * password (default "guest")
// * vhost (default "/")
// * exchange
module.exports = function (options, dependencies) {
  // Injected dependencies
  dependencies = dependencies || {};
  var amqp = dependencies.amqp || require('amqp');
  var logger = dependencies.logger || require('winston');

  // Options
  options = merge({ "exchange":"amq.topic", "autoReconnect":true }, options);

  // Connections
  var serverOptions = merge({}, options, [ "host", "port", "login", "password", "vhost" ]);

  // Events:
  // * error: when a connection error occurs
  // * read: when a result is read
  var e = new EventEmitter();

  // Expose logger
  e.logger = logger;

  // Expose options
  e.options = options;

  // Execute when publish exchange is ready
  var onReady = (function onConnectionReadyFactory() {
    // 1. Create connection
    if (options.autoReconnect) {
      e.connection = autoReconnectAMQPConnection(serverOptions, { "defaultExchangeName":options.exchange }, dependencies);
    } else {
      e.connection = amqp.createConnection(serverOptions, { "defaultExchangeName":options.exchange });
    }
    var exchange;
    var ready = false;
    e.connection.on('ready', function () {
      // 2. Connect to exchange
      e.connection.exchange(options.exchange, {
        "type":"topic",
        "autoDelete":false,
        "durable":true
      }, function (openExchange) {
        exchange = openExchange;
        ready = true;
        e.emit('ready');
      });
    });
    return function onConnectionReady(fn) {
      if (ready) {
        process.nextTick(function () {
          fn.call(e, exchange)
        });
      } else {
        process.nextTick(function () {
          onConnectionReady(fn)
        });
      }
    }
  })();

  // Subscribe to result queue
  onReady(function (exchange) {
    // 1. Create queue
    var queueName = options.readQueue + (options.readRoute ? ('.' + options.readRoute) : '');
    var queuePattern = options.readQueue + '.' + (options.readRoute || '#');
    var prefetchCount = parseInt(options.readSize, 10);
    if (isNaN(prefetchCount)) prefetchCount = 1;
    // Persistent queue
    e.connection.queue(queueName, { "durable":true, "autoDelete":false }, function (q) {
      // 2. Bind queue to this exchange
      q.bind(options.exchange, queuePattern);
      // Finally, subscribe to this queue with configured QOS
      q.subscribe({ "ack":true, "prefetchCount":prefetchCount }, function (message, headers, info, m) {
        e.logger.debug('Received a message');
        e.emit('read', message, headers, info, function ack() {
          m.acknowledge()
        }, m);
      });
    });
  });

  // Send data to job queue
  e.write = function write(data, suffix, done, writeQueue) {
    onReady(function (exchange) {
      var route = writeQueue || options.writeQueue;
      if (suffix) route += '.' + suffix;
      exchange.publish(route, data, { "deliveryMode":2 /* persistent */ });
      done();
    });
    return this;
  };

  // Close connection
  e.end = function end(done) {
    e.connection.end();
    e.connection.once('end', done);
    return this;
  };

  return e;
};

// Auto-reconnect feature
function autoReconnectAMQPConnection(options, amqpOptions, dependencies) {
  // Injected dependencies
  dependencies = dependencies || {};
  var amqp = dependencies.amqp || require('amqp');

  // Base options
  options = Object.create(options);

  // Time between retries
  var reconnectDelay = options.reconnectDelay;
  delete options.reconnectDelay;
  if (typeof reconnectDelay !== 'number') reconnectDelay = parseInt(reconnectDelay, 10);
  if (isNaN(reconnectDelay)) reconnectDelay = 10000; // Every 10 seconds

  // Max retries before really sending disconnection error
  var maxRetries = options.maxRetries;
  delete options.maxRetries;
  if (typeof maxRetries !== 'number') maxRetries = parseInt(maxRetries, 10);
  if (isNaN(maxRetries)) maxRetries = 5;//30; // Try during max 5 minutes

  // Create connection
  var connection = amqp.createConnection(options, amqpOptions);

  // Handle status
  var connected = false, connecting = false;
  connection.on('connect', function () {
    connected = true;
    connecting = false;
    flush();
  });
  connection.on('close', function (err) {
    if (!connecting) {
      connected = false;
      if (err) reconnect();
    }
  });

  // Buffer calls
  var queuedCommands = [];

  function flush() {
    // Flush queued commands when reconnect
    queuedCommands.forEach(function (command) {
      connection[command[0]].apply(connection, command[1]);
    });
  }

  function bufferize(command, args) {
    queuedCommands.push([command, args]);
  }

  function wrapMethod(prop, method) {
    connection[prop] = function () {
      if (!connected) {
        bufferize(prop, arguments);
        return this; // TODO that depends heavily on the command, but we need to make a reasonable choice
      } else {
        return method.apply(connection, arguments);
      }
    }
  }

  // Wrap all methods
  ['__sendMethod', 'write', 'end'].forEach(function (p) {
    var method = connection[p];
    if (typeof method === 'function') {
      wrapMethod(p, method);
    }
  });

  // Auto-reconnection
  function reconnect(err) {
    connecting = true;
    var retries = maxRetries;
    // When connection is finally successful
    function onSuccess() {
      connection.removeListener('close', doTry);
    }

    // Try once
    function doTry() {
      if (!connecting) {
        // cancelled reconnection: happens when a wished "close" event occurred while reconnecting
        // stop trying to reconnect
        // TODO is it the real good solution ? we could silently lose data
        connection.removeListener('connect', onSuccess);
        return;
      }
      else if (0 === retries--) {
        // Forget any chance of success here
        connection.removeListener('connect', onSuccess);
        connection.emit('error', 'RECONNECTION_FAILED'); // Custom error event for this particular case
        connecting = false;
        return;
      }
      setTimeout(function () {
        connection.reconnect();
        // handle next event
        connection.once('close', doTry);
      }, reconnectDelay);
    }

    // Once connection succeeded
    connection.once('connect', onSuccess);
    // Try now!
    doTry();
  }

  // Return this enhanced connection
  return connection;
}

// Expose dependencies
module.exports.EventEmitter = EventEmitter;
module.exports.merge = merge;
