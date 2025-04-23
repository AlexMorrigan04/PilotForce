'use strict';

// Use native browser modules instead of Node.js readable-stream
const Stream = require('stream');
const { Readable, Writable, Duplex, Transform, PassThrough } = Stream;

// Add our custom implementations of end-of-stream and pipeline
const eos = require('./end-of-stream');
const pipeline = require('./pipeline');

// Create exports matching the original stream-browserify
Stream.Readable = Readable;
Stream.Writable = Writable;
Stream.Duplex = Duplex;
Stream.Transform = Transform;
Stream.PassThrough = PassThrough;
Stream.finished = eos.finished;
Stream.pipeline = pipeline;

module.exports = Stream;
