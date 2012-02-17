var util = require('util');
var events = require('events');
var uuid = require('node-uuid');


function Redub(channels) {
    this.channels = channels;
    this.uid = uuid;

    var self = this;
    var idsSeen = {};
    var timeout;

    var messageHandler = function(msg) {
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

    this.messageHandler = messageHandler;
    this.channels.forEach(function(channel) {
        channel.addListener('message', messageHandler);
    });
}
util.inherits(Redub, events.EventEmitter);

Redub.prototype.send = function(msg) {
    msg = { uid: this.uid(), payload: msg };
    this.channels.forEach(function(channel) {
        if (channel.ready)
            channel.send(msg);
    });
};

Redub.prototype.end = function() {
    if (this.interval)
        clearInterval(this.interval);

    var messageHandler = this.messageHandler;
    this.channels.forEach(function(channel) {
        channel.removeListener('message', messageHandler);
    });
};


module.exports = function() {
    var channels = arguments[0];
    if (!Array.isArray(channels))
        channels = Array.prototype.slice.call(arguments, 0);
    return new Redub(channels);
};
