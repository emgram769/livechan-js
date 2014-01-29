'use strict';

var get_extension = require('./get-extension');

var VIDEO_FORMATS = [
    'ogv',
    'webm'
];

module.exports = function(filename) {
    return (VIDEO_FORMATS.indexOf(get_extension(filename)) > -1);
};