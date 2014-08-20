**Redub** turns a bunch of objects implementing a simple pub/sub interface
into a redundant pub/sub transport. It works dandy with [redis-pubsub], but
there's no hard dependency. [![Build Status](https://secure.travis-ci.org/Two-Screen/redub.png)](http://travis-ci.org/Two-Screen/redub)

    var pubsub = require('redis-pubsub');
    var redub = require('redub');

    var transport1 = pubsub.createChannel(...);
    var transport2 = pubsub.createChannel(...);

    var channel = redub(transport1, transport2);
    channel.on('message', function(msg, id) {
        console.log(msg);
        channel.end();
    });
    channel.send('Hello world!');

---

Behind the scenes, messages are wrapped in an envelope with a unique ID:

    ['2d1222ff-e0cd-4594-a1fb-19335c98e58c','Hello world!']

These IDs are tracked for a short time, and duplicates are dropped. The
timeout is configurable:

    // Defaults to 10 seconds. 0 means never time out.
    // In practice, IDs are tracked anywhere between timeout and 2 × timeout.
    channel.timeout = 10000;

The method with which IDs are generated is also configurable:

    channel.uid = function(message) {
        // generate and return a unique ID string.
    };

---

Redub will accept any object that quacks like an EventEmitter and implements
the following:

 * method `send(message)` - must serialize (e.g. `JSON.stringify`) the message
   and publish it.
 * event `message(message)` - must be passed a deserialized message.

 [redis-pubsub]: https://github.com/Two-Screen/redis-pubsub
