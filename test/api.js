// iris-redis API tests
//
// Copyright 2011 Iris Couch
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

var tap = require('tap')
var test = tap.test
var util = require('util')

var PORT = 6379
  , HOST = process.env.redis_host || 'redis.example.iriscouch.com'
  , PASSWORD = 's3cret'

test('node_redis API compatibility', function(t) {
  var redis
  t.doesNotThrow(function() { redis = require('../api') }, 'require() the main module')

  t.type(redis, 'object', 'require("iris-redis") looks like a module')
  t.type(redis.createClient, 'function', 'createClient() function is exported')

  var client = redis.createClient(PORT, HOST)
  client.on('error', function(er) { console.error('Error: ' + er) })

  t.type(client, 'object', 'createClient() returns a client object')
  t.type(client.auth, 'function', 'client.auth() method looks good')

  client.end()
  t.end()
})

test('Client requires auth before doing anything else', function(t) {
  var redis = require('../api')
  var client = redis.createClient(PORT, HOST)

  var bad_callback = function() { throw new Error('Callback should never run') }
  var bad_commands = {'get':['key','val'], 'hset':['hashkey','key','val'], 'quit':[]}

  Object.keys(bad_commands).forEach(function(command) {
    var args = bad_commands[command]

    var error = null
    try {
      client[command].apply(client, args, bad_callback)
    } catch (er) {
      if(!er.message.match(/\.auth\(\)/))
        throw er
      error = er
    }

    t.ok(error, 'Unauthenticated command throws an error: ' + command)
  })

  client.end()
  t.end()
})

test('Client authentication', function(t) {
  var redis = require('../api')
  var client = redis.createClient(PORT, HOST)

  var auth_result = {'er':null, 'res':null}

  var auth_timer = setTimeout(timed_out, 3000)
  function timed_out() {
    auth_result.er = 'timeout'
    check_auth()
  }

  client.auth(PASSWORD, function(er, res) {
    clearTimeout(auth_timer)
    auth_result.er = er
    auth_result.res = res
    check_auth()
  })

  function check_auth() {
    t.same(auth_result.er, null, 'No error authenticating')
    t.equal(auth_result.res, 'OK', 'Affirmative authentication response from Redis')

    client.end()
    t.end()
  }
})
