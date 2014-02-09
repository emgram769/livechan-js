'use strict';

var path = require('path');
var exec = require('child_process').exec;
var fs = require('fs');

var config = require('../../config');
var categorize = require('./categorize');

/* format_image
    - checks for image and sets data accordingly
    calls callback(err) on completion
*/
module.exports = function(data, callback) {
    /* TODO: remove this try catch */
    try {
        /* no file uploaded */
        if (!data.image) {
            return callback();
        }

        /* is this an image/video/audio file? */
        var category = categorize(data.image);

        /* image file uploaded */
        if (category === 'image') {
            var gm = require('gm').subClass({
                imageMagick: config.use_imagemagick
            });

            return gm(data.image).size(function(err, dimensions) {
                if (err) {
                    console.log('gm size error', err);
                    return callback(new Error('metadata_error'));
                }

                if (dimensions.height > 0 && dimensions.width > 0) {
                    data.image_width = dimensions.width;
                    data.image_height = dimensions.height;
                }
                return callback();
            });
        }

        /* video/audio file uploaded */
        else if (category === 'video' || category === 'audio') {
            var clean_name = data.image.match(/[\w\-]+\.\w+$/)[0];
            var full_path = path.join(__dirname, '..', '..', 'public/tmp/uploads', clean_name);
            var command = 'ffprobe -print_format json -show_format -show_streams ' + full_path;
            exec(command, function(err, stdout, stderr) {
                if (err) {
                    console.log('error calling ffprobe', err);
                    return callback(new Error('metadata_error'));
                }

                /* parse JSON returned by ffprobe */
                var metadata;
                try {
                    metadata = JSON.parse(stdout);
                } catch(e) {
                    console.log('ffprobe returned unparseable metadata', stderr);
                    return callback(new Error('metadata_error'));
                }

                /* get file duration, if given */
                if (metadata.format !== undefined && metadata.format.duration !== undefined) {
                    try {
                        data.duration = parseFloat(metadata.format.duration);
                    } catch(e) {
                        console.log('ffprobe returned invalid duration data', stderr);
                        return callback(new Error('metadata_error'));
                    }
                }

                /* find video stream, if any */
                var video_stream = null;
                for (var i in metadata.streams) {
                    if (metadata.streams[i].codec_type === "video") {
                        video_stream = metadata.streams[i];
                        break;
                    }
                }

                if (category === 'video') {
                    if (video_stream !== null && video_stream.width && video_stream.height) {
                        /* get video dimensions */
                        data.image_width = video_stream.width;
                        data.image_height = video_stream.height;

                        /* compensate for sample aspect ratio */
                        if (video_stream.sample_aspect_ratio !== undefined) {
                            try {
                                var parts = video_stream.sample_aspect_ratio.split(':');
                                data.image_width = Math.round(data.image_width * parseInt(parts[0]) / parseInt(parts[1]));
                            } catch(e) {
                                console.log('error parsing SAR from ffprobe', stderr);
                                return callback(new Error('metadata_error'));
                            }
                        }
                        callback();
                    } else {
                        console.log('ffprobe could not find video stream', stderr);
                        return callback(new Error('metadata_error'));
                    }
                } else {
                    /* audio */
                    if (video_stream === null) {
                        callback();
                    } else {
                        console.log('expected audio only, got video', stderr);
                        return callback(new Error('metadata_error'));
                    }
                }
            });
        }

        /* invalid extension */
        else {
            return callback(new Error('invalid_extension'));
        }

    } catch(e) {
        console.log('metadata reading error', e);
        return callback(new Error('metadata_error'));
    }
};
