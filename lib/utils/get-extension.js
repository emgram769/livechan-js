'use strict';

module.exports = function(filename) {
    var i = filename.lastIndexOf('.');
    return (i < 0) ? '' : filename.substr(i + 1).toLowerCase();
};