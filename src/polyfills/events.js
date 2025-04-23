'use strict';

class EventEmitter {
  constructor() {
    this._events = {};
  }

  on(type, listener) {
    this._events[type] = this._events[type] || [];
    this._events[type].push(listener);
    return this;
  }

  once(type, listener) {
    const onceWrapper = (...args) => {
      this.removeListener(type, onceWrapper);
      listener.apply(this, args);
    };
    this.on(type, onceWrapper);
    return this;
  }

  removeListener(type, listener) {
    if (this._events[type]) {
      const idx = this._events[type].indexOf(listener);
      if (idx !== -1) {
        this._events[type].splice(idx, 1);
      }
    }
    return this;
  }

  emit(type, ...args) {
    if (!this._events[type]) return false;
    
    const listeners = this._events[type].slice();
    for (const listener of listeners) {
      listener.apply(this, args);
    }
    return true;
  }
}

module.exports = {
  EventEmitter,
  once: (emitter, name) => {
    return new Promise((resolve, reject) => {
      const eventListener = (...args) => {
        resolve(args);
        emitter.removeListener(name, eventListener);
      };
      emitter.on(name, eventListener);
    });
  }
};
