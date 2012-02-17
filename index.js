var util = require('util');
var events = require('events');
var uuid = require('node-uuid');


var channelArgs = function(args) {
    var channels = args[0];
    if (!Array.isArray(channels))
        channels = Array.prototype.slice.call(args, 0);
    return channels;
};


function Redub() {
    this.channels = [];
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
    var channels = this.channels;
    var messageHandler = this.messageHandler;

    channelArgs(arguments).forEach(function(channel) {
        var idx = channels.indexOf(channel);
        if (idx === -1) {
            channel.addListener('message', messageHandler);
            channels.push(channel);
        }
    });
};

Redub.prototype.remove = function() {
    var channels = this.channels;
    var messageHandler = this.messageHandler;

    channelArgs(arguments).forEach(function(channel) {
        var idx = channels.indexOf(channel);
        if (idx !== -1) {
            channel.removeListener('message', messageHandler);
            channels.splice(idx, 1);
        }
    });
};

Redub.prototype.send = function(msg) {
    msg = { uid: this.uid(), payload: msg };
    this.channels.forEach(function(channel) {
        if (channel.ready)
            channel.send(msg);
    });
};

Redub.prototype.end = function() {
    var messageHandler = this.messageHandler;

    if (this.interval)
        clearInterval(this.interval);

    this.channels.forEach(function(channel) {
        channel.removeListener('message', messageHandler);
    });
};


module.exports = function() {
    var channel = new Redub();
    channel.add(channelArgs(arguments));
    return channel;
};
