'use strict';

var fs = require('fs');

module.exports = function(e, ds) {
    if (e) {
        return console.log("chat find error", e);
    }
    ds.forEach(function(d) {
        if (d.image) fs.unlink(d.image, function(e2) {});
        if (d.thumb) fs.unlink(d.thumb, function(e2) {});
        d.remove(function(e2) {
            console.log('chat removal error', e2);
        });
    });
};
