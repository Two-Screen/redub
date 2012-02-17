var util = require('util');
var events = require('events');
var test = require('tap').test;
var redub = require('./');


function TestTransport(delay) {
    this.delay = delay;
    this.ready = true;
}
util.inherits(TestTransport, events.EventEmitter);

TestTransport.prototype.send = function(msg) {
    setTimeout(function() {
        this.emit('message', msg);
    }.bind(this), this.delay);
};


var tt1 = new TestTransport(0);
var tt2 = new TestTransport(50);
var tt3 = new TestTransport(200);


test('manipulate channels and transports', function(t) {
    var channel;

    channel = redub();
    t.equal(channel.channels.length, 0,
        'open a channel with no transports');
    channel.end();
    t.pass('close the channel');

    channel = redub([]);
    t.pass(channel.channels.length, 0,
        'open a channel with no transports as an array');
    channel.end();
    t.pass('close the channel');

    channel = redub(tt1);
    t.equal(channel.channels.length, 1,
        'open a channel with one transport');
    channel.end();
    t.pass('close the channel');

    channel = redub(tt1, tt2, tt3);
    t.equal(channel.channels.length, 3,
        'open a channel with multiple transports');
    channel.remove();
    t.equal(channel.channels.length, 3,
        'empty remove call');
    channel.add();
    t.equal(channel.channels.length, 3,
        'empty add call');
    channel.remove(tt2);
    t.equal(channel.channels.length, 2,
        'remove a single transport');
    channel.remove(tt2);
    t.equal(channel.channels.length, 2,
        'try to remove a single already inactive transport');
    channel.add(tt2);
    t.equal(channel.channels.length, 3,
        'add a single transport');
    channel.add(tt2);
    t.equal(channel.channels.length, 3,
        'try to add a single already active transport');
    channel.remove(tt1, tt3);
    t.equal(channel.channels.length, 1,
        'remove multiple transports');
    channel.add(tt1, tt3);
    t.equal(channel.channels.length, 3,
        'add multiple transports');
    channel.end();
    t.pass('close the channel');

    channel = redub([tt1, tt2, tt3]);
    t.equal(channel.channels.length, 3,
        'open a channel with multiple transports as an array');
    channel.remove([]);
    t.equal(channel.channels.length, 3,
        'remove call with empty array');
    channel.add([]);
    t.equal(channel.channels.length, 3,
        'add call with empty array');
    channel.remove([tt2]);
    t.equal(channel.channels.length, 2,
        'remove a single transport as an array');
    channel.remove([tt2]);
    t.equal(channel.channels.length, 2,
        'try to remove a single already inactive transport as an array');
    channel.add([tt2]);
    t.equal(channel.channels.length, 3,
        'add a single transport as an array');
    channel.add([tt2]);
    t.equal(channel.channels.length, 3,
        'try to add a single already active transport as an array');
    channel.remove([tt1, tt3]);
    t.equal(channel.channels.length, 1,
        'remove multiple transports as an array');
    channel.add([tt1, tt3]);
    t.equal(channel.channels.length, 3,
        'add multiple transports as an array');
    channel.end();
    t.pass('close the channel');

    t.end();
});


test('send and receive a message', function(t) {
    t.plan(3);

    var channel = redub(tt1, tt2, tt3);

    channel.on('message', function(msg) {
        t.equal(msg, 'bla', 'receive a message');
    });

    channel.send('bla');
    t.pass('send a message');

    setTimeout(function() {
        channel.end();
        t.pass('test end');
    }, 250);
});


test('duplicate messages from low timeout', function(t) {
    t.plan(4);

    var channel = redub(tt1, tt2, tt3);
    channel.timeout = 75;

    channel.on('message', function(msg) {
        t.equal(msg, 'bla', 'receive a message');
    });

    channel.send('bla');
    t.pass('send a message');

    setTimeout(function() {
        channel.end();
        t.pass('test end');
    }, 250);
});


test('dropped messages from bad ID generator', function(t) {
    t.plan(4);

    var channel = redub(tt1, tt2, tt3);
    channel.uid = function() { return 'foobar'; };

    channel.on('message', function(msg) {
        t.equal(msg, 'bla', 'receive a message');
    });

    channel.send('bla');
    t.pass('send the first message');

    channel.send('bla');
    t.pass('send the second message');

    setTimeout(function() {
        channel.end();
        t.pass('test end');
    }, 250);
});
