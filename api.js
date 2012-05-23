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

module.exports.createClient = createClient

function createClient(port, host, options) {
  var client = redis.createClient(port, host, options)

  client._iris_redis = true
  client._options = options
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
  client.iris_config = iris_config
  client.iris_upgrade = iris_upgrade

  if(options && options.auth)
    client.auth(options.auth)

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

  callback = callback || function() {}

  // With auth called, the faux commands can be removed, allowing normal commands to queue up.
  commands.forEach(function(command) {
    if(self.hasOwnProperty(command) && typeof self[command] == 'function')
      delete self[command]
  })

  pass = this.host + ":" + pass
  return self._auth(pass, function(er, res) {
    if(er)
      return callback(er)
    callback(er, res)
  })
}


function iris_config(callback) {
  var self = this

  if(typeof callback != 'function')
    throw new Error('Required callback: function(error, config_obj)')

  self.smembers('_config', function(er, res) {
    if(er)
      return callback(er)

    var config = {}

    // This is synchronous becuase it's just a few keys, and it simplifies the code.
    get_config_key()
    function get_config_key() {
      var key = res.pop()
      if(!key)
        return callback(null, config)

      self.get(key, function(er, res) {
        if(er)
          return callback(er)
        config[key] = res
        return get_config_key()
      })
    }
  })
}


function iris_upgrade(callback) {
  var self = this

  if(typeof callback != 'function')
    throw new Error('Required callback: function(error, new_client)')

  // Only call the callback once ever.
  var real_callback = callback
  callback = function() {
    real_callback.apply(this, arguments)
    real_callback = function() {}
  }

  return self.iris_config(function(er, config) {
    if(er)
      return callback(er)

    var new_port = +config['_config:port']
      , new_ip   = config['_config:ip']

    // Just build a normal redis client, not a wrapped one; but give it the iris_config and iris_upgrade
    // methods so people can just run an upgrade whenever they want.
    var new_client = redis.createClient(new_port, new_ip, self._options)
    new_client.auth(self.auth_pass)

    new_client.on('ready', function() {
      console.log('Client ready!')
      self.quit()

      new_client.iris_config = iris_config
      new_client.iris_upgrade = iris_upgrade
      callback(null, new_client)
    })

    new_client.on('error', function(er) { callback(er) })
  })
}
