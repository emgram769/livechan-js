#!/usr/bin/env node

var tripcode = require('../');
var argv = require('optimist').argv;
var concat = require('concat-stream');
var forEach = require('lodash.foreach');

function tripify() {
  forEach(argv._, function(value) {
    console.log('#' + value + ' => !' + tripcode(value));
  });
}

if (argv._.length < 1) {
  var finish = concat(function(data) {
    var lines = data.toString().split('\n');
    lines.forEach(function(line) {
      argv._.push(line);
    });
    tripify();
  });

  var stdin = process.openStdin();
  stdin.pipe(finish);
}
else {
  tripify();
}