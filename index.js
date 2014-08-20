var util = require('util');
var events = require('events');
var uuid = require('node-uuid');


// Alias for quick access.
var arraySlice = Array.prototype.slice;

// Helper used to parse transports from an arguments list. Returns an array.
var transportArgs = function(args) {
    var transports = args[0];
    if (!Array.isArray(transports))
        transports = arraySlice.call(args, 0);
    return transports;
};


function Redub() {
    var self = this;
    var idsSeen = Object.create(null);
    var timeout;
    var interval = null;

    // Handler function for incoming messages. This will emit a `message` event.
    this.messageHandler = function(msg) {
        var uid = msg.uid;
        if (idsSeen[uid] !== undefined)
            return;
        idsSeen[uid] = Date.now();

        self.emit('message', msg.payload);
    };

    // Periodically clean up the index of UIDs.
    var expireHandler = function() {
        var max = Date.now() - timeout;
        for (var key in idsSeen) {
            if (idsSeen[key] <= max) {
                delete idsSeen[key];
            }
        }
    };

    // Control lifespan of UIDs, used to detect duplicates.
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

// Add one or more transports. Transports can be provided as an array, as
// separate arguments or as a method chain.
//
//     redub.add([t1, t2, t3]);
//     redub.add(t1, t2, t3);
//     redub.add(t1).add(t2).add(t3);
//
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

// Remove one or more transports. Transports can be provided as an array, as
// separate arguments or as a method chain.
//
//     redub.remove([t1, t2, t3]);
//     redub.remove(t1, t2, t3);
//     redub.remove(t1).remove(t2).remove(t3);
//
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

// Reset the list of transports. Transports can be provided as an array, as
// separate arguments or as a method chain.
//
//     redub.reset([t1, t2, t3]);
//     redub.reset(t1, t2, t3);
//
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
        transport.send(msg);
    });

    return this;
};

// Wrap a message in an envelope
Redub.prototype.wrap = function(msg) {
    return { uid: this.uid(), payload: msg };
};

// Detach from all transports and stop processing.
Redub.prototype.end = function() {
    this.timeout = 0;
    this.reset();
};


// Create a Redub instance, with an initial set of transports. Transports can
// be provided as an array or as separate arguments.
//
//     var redub = require('redub');
//     var chan1 = redub([t1, t2, t3]);
//     var chan2 = redub(t1, t2, t3);
//
module.exports = function() {
    var channel = new Redub();
    channel.add(transportArgs(arguments));
    return channel;
};
