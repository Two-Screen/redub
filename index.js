var util = require('util');
var events = require('events');
var uuid = require('node-uuid');


var transportArgs = function(args) {
    var transports = args[0];
    if (!Array.isArray(transports))
        transports = Array.prototype.slice.call(args, 0);
    return transports;
};


function Redub() {
    this.transports = [];
    this.uid = uuid;

    var self = this;
    var idsSeen = {};
    var timeout;

    this.messageHandler = function(msg) {
        var uid = msg.uid;
        if (idsSeen[uid])
            return;
        idsSeen[uid] = (new Date).valueOf();

        self.emit('message', msg.payload);
    };

    var expireHandler = function() {
        var max = (new Date).valueOf() - timeout;
        for (var key in idsSeen)
            if (idsSeen[key] <= max)
                delete idsSeen[key];
    };

    Object.defineProperty(this, 'timeout', {
        get: function() {
            return timeout;
        },
        set: function(value) {
            timeout = value;

            if (this.interval)
                clearInterval(this.interval);

            if (timeout > 0)
                this.interval = setInterval(expireHandler, timeout);
            else
                this.interval = null;
        }
    });
    this.timeout = 10000;
}
util.inherits(Redub, events.EventEmitter);

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
};

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
};

Redub.prototype.send = function(msg) {
    msg = { uid: this.uid(), payload: msg };
    this.transports.forEach(function(transport) {
        if (transport.ready)
            transport.send(msg);
    });
};

Redub.prototype.end = function() {
    var messageHandler = this.messageHandler;

    if (this.interval)
        clearInterval(this.interval);

    this.transports.forEach(function(transport) {
        transport.removeListener('message', messageHandler);
    });
};


module.exports = function() {
    var channel = new Redub();
    channel.add(transportArgs(arguments));
    return channel;
};
