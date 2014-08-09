
/**
 * Module dependencies.
 */

var b64 = require('forbeslindesay/base64-encode@2.0.1');
var indexof = require('component/indexof@0.0.3');
var jsonp = require('webmodules/jsonp@0.0.4');
var json = require('segmentio/json@1.0.0');

/**
 * TODO: component/queue
 */

var q = [];

/**
 * Push.
 */

q.add = function(fn){
  this.push(fn);
  if (q.running) return;
  q.running = true;
  var self = this;
  next();

  function next(){
    var n = self.shift();
    if (!n) return;
    n(next);
  }
};

/**
 * Expose `mochasend`
 */

module.exports = mochasend;

/**
 * Client ID.
 */

var id = (function(){
  var s = window.location.search;
  if ('?' == s.charAt(0)) s = s.substr(1);
  var parts = s.split('=');
  for (var i = 0; i < parts.length; ++i) {
    if ('__id__' == parts[i]) return parts[i + 1];
  }
})();

/**
 * Initialize mochasend with `Runner`.
 *
 * TODO: send "ping" event.
 *
 * @param {Runner} runner
 * @param {String} path
 * @api public
 */

function mochasend(runner, path){
  path = path || '/saucelabs';
  runner.on('start', event('start', path));
  runner.on('suite', event('suite', path));
  runner.on('suite end', event('suite end', path));
  runner.on('pass', event('pass', path));
  runner.on('fail', event('fail', path));
  runner.on('pending', event('pending', path));
  runner.on('end', function(){
    event('end', path)({ failures: runner.failures });
  });
}

/**
 * Send event `name` to `path`.
 *
 * @param {String} name
 * @param {String} path
 * @return {Object}
 * @api private
 */

function event(name, path){
  return function(obj, err){
    q.add(function(next){
      if (err) obj.err = toObject(err);
      if (obj.fullTitle) obj._fullTitle = obj.fullTitle();
      var json = stringify({ event: name, obj: obj });
      var data = b64(json);
      var query = '?id=' + id + '&data=' + data;
      jsonp(path + query, next);
    });
  };
};

/**
 * Error to object.
 *
 * @param {Error} err
 * @return {Object}
 * @api private
 */

function toObject(err){
  var ret = {};
  for (var k in err) ret[k] = err[k];
  ret.stack = err.stack || '';
  ret.message = err.message || '';
  return ret;
}

/**
 * Stringify circular json.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function stringify(obj){
  var c = [];
  return json.stringify(obj, function(k, v){
    if ('object' != typeof v) return v;
    if ('suites' == k) return [];
    if ('tests' == k) return [];
    if (~indexof(c, v)) return {};
    c.push(v);
    return v;
  });
}
