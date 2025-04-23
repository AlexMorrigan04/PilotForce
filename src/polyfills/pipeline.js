'use strict';

const eos = require('./end-of-stream');

function pipeline(...streams) {
  const callback = typeof streams[streams.length - 1] === 'function'
    ? streams.pop()
    : null;

  if (streams.length < 2) {
    throw new Error('pipeline requires at least 2 streams');
  }

  let error;
  const destroys = [];

  function onError(err) {
    if (!error) error = err;
    
    destroys.forEach(destroy => {
      destroy();
    });
    
    if (callback) {
      callback(error);
    }
  }

  let i = 0;
  (function connect(stream) {
    if (i === streams.length) {
      if (callback) callback();
      return;
    }

    i++;

    if (i < streams.length) {
      stream.pipe(streams[i]);
      destroys.push(() => {
        if (streams[i].destroy) streams[i].destroy();
      });
    }

    if (stream.destroy) {
      destroys.push(() => {
        stream.destroy();
      });
    }

    // Listen for errors
    stream.on('error', onError);
    
    connect(streams[i]);
  })(streams[0]);

  return streams[streams.length - 1];
}

module.exports = pipeline;
