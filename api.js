// iris-redis API
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

var redis = require('redis')
var commands = require('redis/lib/commands')
var util = require('util')

module.exports = {}
Object.keys(redis).forEach(function(key) {
  module.exports[key] = redis[key]
})

module.exports.createClient = function() {
  var client = redis.createClient.apply(this, arguments)

  client._auth = client.auth
  client._same_tick = true
  process.nextTick(function() { client._same_tick = false })

  commands.forEach(function(command) {
    if(client.hasOwnProperty(command))
      throw new Error('Substututing non-prototype command not supported: ' + command)

    if(command == 'info')
      client[command] = bad_info
    else
      client[command] = bad_command(command)
  })

  client.auth = auth_wrapper
  return client
}

function bad_command(name) {
  var er = new Error('Mandatory .auth() before command: ' + name)
  return function() {
    if(this._same_tick)
      throw er
    else
      this.emit('error', er)
  }
}

// Provide a more useful error message since info() is called implicitly for users.
function bad_info() {
  var er = new Error('You must run .auth() immediately after .createClient()')
  if(this._same_tick)
    throw er
  else
    this.emit('error', er)
}


function auth_wrapper(pass, callback) {
  var self = this

  pass = this.host + ":" + pass
  return self._auth(pass, function(er, res) {
    if(!er)
      commands.forEach(function(command) {
        if(self.hasOwnProperty(command) && typeof self[command] == 'function')
          delete self[command]
      })

    return callback(er, res)
  })
}
