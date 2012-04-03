var util = require('util');
var events = require('events');
var uuid = require('node-uuid');

// Prepares transport argumenst as an Array.
// This function can be called with an array of transports
// of with each transport as an argument.
//    transportArgs([arg1, arg2]);
//    transportArgs(arg1, arg2);
// Both will produce a single array as output
var transportArgs = function(args) {
    var transports = args[0];
    if (!Array.isArray(transports))
        transports = Array.prototype.slice.call(args, 0);
    return transports;
};

// Redub contructor
function Redub() {
    var self = this;
    var idsSeen = {};
    var timeout;
    var interval = null;

    // Handler function for incoming messages. This will emit a `message` event.
    this.messageHandler = function(msg) {
        var uid = msg.uid;
        if (idsSeen[uid])
            return;
        idsSeen[uid] = (new Date).valueOf();

        self.emit('message', msg.payload);
    };

    var expireHandler = function() {
        var max = (new Date).valueOf() - timeout;
        for (var key in idsSeen) {
            if (idsSeen[key] <= max) {
                delete idsSeen[key];
            }
        }
    };

    Object.defineProperty(this, 'timeout', {
        get: function() {
            return timeout;
        },
        set: function(value) {
            timeout = value;

            if (interval)
                clearInterval(interval);

            if (timeout > 0)
                interval = setInterval(expireHandler, timeout);
            else
                interval = null;
        }
    });

    this.transports = [];
    this.uid = uuid;
    this.timeout = 10000;
}
util.inherits(Redub, events.EventEmitter);

// Add one or more transports to Redub. Transports can be provided as
// an array, as separate arguments or as a method chain.
//
//  redub.add([t1, t2, t3]);
//  redub.add(t1, t2, t3);
//  redub.add(t1).add(t2).add(t3);
Redub.prototype.add = function() {
    var transports = this.transports;
    var messageHandler = this.messageHandler;

    transportArgs(arguments).forEach(function(transport) {
        var idx = transports.indexOf(transport);
        if (idx === -1) {
            transport.addListener('message', messageHandler);
            transports.push(transport);
        }
    });

    return this;
};

// Remove on or more transports from Redub. Transports can be provided as
// an array, as separate arguments or as a method chain.
//
// redub.remove([t1, t2, t3]);
// redub.remove(t1, t2, t3);
// redub.remove(t1).remove(t2).remove(t3);
Redub.prototype.remove = function() {
    var transports = this.transports;
    var messageHandler = this.messageHandler;

    transportArgs(arguments).forEach(function(transport) {
        var idx = transports.indexOf(transport);
        if (idx !== -1) {
            transport.removeListener('message', messageHandler);
            transports.splice(idx, 1);
        }
    });

    return this;
};

// Reset the Redub instance removing all transports.
Redub.prototype.reset = function() {
    var messageHandler = this.messageHandler;

    this.transports.forEach(function(transport) {
        transport.removeListener('message', messageHandler);
    });
    this.transports = [];

    this.add(transportArgs(arguments));

    return this;
};

// Send a message over all transports.
Redub.prototype.send = function(msg) {
    msg = this.wrap(msg);
    this.transports.forEach(function(transport) {
        if (transport.ready)
            transport.send(msg);
    });

    return this;
};

// Wrap a message in an envelope
Redub.prototype.wrap = function(msg) {
    return { uid: this.uid(), payload: msg };
};

Redub.prototype.end = function() {
    this.timeout = 0;
    this.reset();
};


module.exports = function() {
    var channel = new Redub();
    channel.add(transportArgs(arguments));
    return channel;
};
