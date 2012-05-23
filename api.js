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

  // Create an error object right now, so that the callback is more useful down the road.
  client._bad_command_er = new Error('Mandatory .auth() before any command')
  client._bad_info_er = new Error('You must run .auth() immediately after .createClient()')

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
  return function() {
    if(this._same_tick)
      throw new Error(this._bad_command_er.message)
    else
      this.emit('error', this._bad_command_er)
  }
}

// Provide a more useful error message since info() is called implicitly for users.
function bad_info() {
  if(this._same_tick)
    throw new Error(this._bad_info_er.message)
  else
    this.emit('error', this._bad_info_er)
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
