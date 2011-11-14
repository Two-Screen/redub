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


test('open and close a channel', function(t) {
    var channel = redub();
    t.pass('open a channel');

    channel.end();
    t.pass('close a channel');

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
