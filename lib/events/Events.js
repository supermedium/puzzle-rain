'use strict';

const Emitter = require('events').EventEmitter;
const emitter = new Emitter();

function Events () {
}

Events.prototype.on = function () {
  emitter.on.apply(emitter, arguments);
  return this;
};

Events.prototype.emit = function () {
  emitter.emit.apply(emitter, arguments);
  return this;
};

Events.prototype.removeListener = function () {
  emitter.removeListener.apply(emitter, arguments);
  return this;
};

module.exports = new Events();