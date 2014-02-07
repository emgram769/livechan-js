'use strict';

var config = require('../../config');
var get_extension = require('./get-extension');

module.exports = function(filename) {
    var extension = get_extension(filename);
    if (config.image_formats.indexOf(extension) > -1) return 'image';
    if (config.video_formats.indexOf(extension) > -1) return 'video';
    if (config.audio_formats.indexOf(extension) > -1) return 'audio';
    return 'invalid';
};

