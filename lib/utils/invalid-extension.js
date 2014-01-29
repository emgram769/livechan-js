'use strict';

var get_extension = require('./get-extension');

var VALID_EXTENSIONS = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'ogv',
    'webm'
];

module.exports = function(filename) {
    return !(VALID_EXTENSIONS.indexOf(get_extension(filename)) > -1);
};