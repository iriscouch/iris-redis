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

var HOST = process.env.redis_host || 'redis.example.iriscouch.com'
  , LOCALHOST = '127.0.0.1'

test('node_redis API compatibility', function(t) {
  var redis
  t.doesNotThrow(function() { redis = require('../api') }, 'require() the main module')

  t.type(redis, 'object', 'require("iris-redis") looks like a module')
  t.type(redis.createClient, 'function', 'createClient() function is exported')

  var client = redis.createClient(6379, LOCALHOST)
  client.on('error', function(er) { console.error('Error: ' + er) })

  t.type(client, 'object', 'createClient() returns a client object')
  t.type(client.auth, 'function', 'client.auth() method looks good')

  client.end()
  t.end()
})
