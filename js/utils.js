function EventEmitter() {}

EventEmitter.prototype.on =
EventEmitter.prototype.addListener = function (event, callback) {
  this._events = this._events || {};
  this._events[event] = this._events[event] || [];
  this._events[event].push(callback);
  return this;
};

EventEmitter.prototype.off =
EventEmitter.prototype.removeListener = function (event, callback) {
  this._events = this._events || {};
  if (event in this._events === false)  return;
  this._events[event].splice(this._events[event].indexOf(callback), 1);
  return this;
};

EventEmitter.prototype.trigger =
EventEmitter.prototype.emit = function (event) {
  this._events = this._events || {};
  if (event in this._events === false) return false;
  for (var i=0; i < this._events[event].length; i++) {
    this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
  }
  return true;
};


function throttle(func, ms) {
  var shouldRun = true;
  return function () {
    if (!shouldRun) return;
    shouldRun = false;
    setTimeout(function () { shouldRun = true; }, ms);
    func.apply(this, arguments);
  };
}

window.requestAnimationFrame = window.requestAnimationFrame ||
  window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
  window.msRequestAnimationFrame || window.oRequestAnimationFrame;

if (!Object.create) {
  Object.create = (function(){
    function F(){}

    return function(o){
      if (arguments.length != 1) {
        throw new Error('Object.create implementation only accepts one parameter.');
      }
      F.prototype = o;
      return new F();
    };
  })();
}
