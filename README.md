## Redis on Iris Couch

`iris-redis` is a very simple wrapper, 100% compatible with the [Node.js redis package][node_redis]. It simplifies connecting, and helps to see metadata about your server.

## Example

```javascript
var redis = require('iris-redis')
var client = redis.createClient(6379, "redis.example.iriscouch.com")
client.auth("s3cret")

client.on("ready", function() {
  // Done! Hey, I said it was 100% compatible.
  client.iris_config(function(er, config) {
    if(er) throw er

    console.log("Got my server config: %j", config)
    client.quit()
  })
})
```

The output looks like this:

```javascript
Got my server config:
{ '_config:datacenter': 'sj01.softlayer',
  '_config:server': 'example',
  '_config:max_memory': '20mb',
  '_config:ip': '10.55.80.194',
  '_config:port': '17162' }
```

## Easy AUTH command

Iris Couch requires an `AUTH` command in the format `redis.your_hostname.iriscouch.com:your_password`. To save you some trouble, the iris-redis package prepends the hostname in its `.auth()` wrapper.

In other words, if you run this: `client.auth("s3cret")`

then iris-redis will convert that to this: `client.auth("redis.example.iriscouch.com:s3cret")`

## Automatic authentication.

Since authentication is mandatory on Iris Couch, you can provide the `"auth"` key in the options.

```javascript
var client = redis.createClient(6379, "redis.example.iriscouch.com", {auth: "s3cret"})
```

<a name="upgrading"></a>
## Upgrading to a direct connection

Iris Couch uses a reverse proxy&mdash;the same battle-hardened proxy that runs CouchDB. Unfortunately, this adds latency to Redis.

If you are in the right data center, you can connect directly to your server's IP address and port. The information is in the `_config/*` keys, or there is a convenience function.

```javascript
client.iris_upgrade(function(er, new_client) {
  if(er) throw er

  // Hooray! This is a direct LAN connection to the back-end. Note, the original client already quit().
  new_client.set("happy", "true")
  new_client.quit()
})
```

## License

Apache 2.0

[node_redis]: https://github.com/mranney/node_redis
