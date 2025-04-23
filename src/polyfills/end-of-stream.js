'use strict';

// Simple finished implementation that doesn't rely on node modules
function finished(stream, opts) {
  if (!opts) opts = {};
  
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      stream.removeListener('error', onError);
      stream.removeListener('end', onEnd);
      stream.removeListener('close', onClose);
      stream.removeListener('finish', onFinish);
    };

    const onError = (err) => {
      cleanup();
      reject(err);
    };
    
    const onEnd = () => {
      cleanup();
      resolve();
    };
    
    const onClose = () => {
      cleanup();
      resolve();
    };
    
    const onFinish = () => {
      cleanup();
      resolve();
    };

    stream.on('error', onError);
    stream.on('end', onEnd);
    stream.on('close', onClose);
    stream.on('finish', onFinish);
  });
}

// Export both as a function and with a finished property for compatibility
const eos = finished;
eos.finished = finished;

module.exports = eos;
