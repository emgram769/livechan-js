'use strict';

var path = require('path');
var spawn = require('child_process').spawn;
var fs = require('fs');

var get_extension = require('./get-extension');

module.exports = function(data, callback) {
    try {
        /* no file uploaded */
        if (!data.image) {
            return callback();
        }
        var extension = get_extension(data.image);
        if (extension === 'jpg' || extension === 'jpeg') {
            var process = spawn("mogrify", ['-auto-orient', data.image]);
            process.on("close", function(code) {
                return callback();
            });
        } else {
            return callback();
        }
    } catch(e) {
        console.log('failed to rotate image', e);
        return callback(new Error('could not process file at this time (probably server stress)'));
    }
        
};

