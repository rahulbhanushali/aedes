'use strict'

var test = require('tape').test
var helper = require('./helper')
var aedes = require('../')
var setup = helper.setup
var connect = helper.connect
var subscribe = helper.subscribe

test('publishes an hearbeat', function (t) {
  t.plan(3)
  var broker = aedes({
    heartbeatInterval: 10 // ms
  })

  broker.subscribe('$SYS/+/heartbeat', function (message, cb) {
    var id = message.topic.match(/\$SYS\/([^/]+)\/heartbeat/)[1]
    t.equal(id, broker.id, 'broker id matches')
    t.deepEqual(message.payload.toString(), id, 'message has id as the payload')
    broker.close(t.pass.bind(t, 'broker closes'))
  })
})

test('does not forward $SYS topics to # subscription', function (t) {
  t.plan(4)
  var s = connect(setup())

  subscribe(t, s, '#', 0, function () {
    s.outStream.once('data', function (packet) {
      t.fail('no packet should be received')
    })

    s.broker.mq.emit({
      cmd: 'publish',
      topic: '$SYS/hello',
      payload: 'world'
    }, function () {
      t.pass('nothing happened')
    })
  })
})

test('does not store $SYS topics to QoS 1 # subscription', function (t) {
  t.plan(3)

  var broker = aedes()
  var opts = { clean: false, clientId: 'abcde' }
  var s = connect(setup(broker), opts)

  subscribe(t, s, '#', 1, function () {
    s.inStream.end()

    s.broker.publish({
      cmd: 'publish',
      topic: '$SYS/hello',
      payload: 'world',
      qos: 1
    }, function () {
      s = connect(setup(broker), { clean: false, clientId: 'abcde' }, function () {
        t.end()
      })

      s.outStream.once('data', function (packet) {
        t.fail('no packet should be received')
      })
    })
  })
})
