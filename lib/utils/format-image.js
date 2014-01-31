'use strict';

var exec = require('child_process').exec;
var fs = require('fs');

var config = require('../../config');
var invalid_extension = require('./invalid-extension');
var is_video = require('./is-video');

/* format_image
    - checks for image and sets data accordingly
    calls callback(err) on completion
*/
module.exports = function(req, data, callback) {
    /* TODO: remove this try catch */
    try {
        /* no image uploaded */
        if (req.files &&
            req.files.image &&
            req.files.image.size === 0) {


            if (/^\s*$/.test(req.body.body)) {
                return callback(new Error('nothing substantial submitted'));
            } else {
                /* delete blank file */
                return fs.unlink(req.files.image.path, function(err) {
                    if (err) {
                        console.log('error deleting blank file', err);
                    }
                    return callback();
                });
            }
        }

        /* invalid extension */
        else if (invalid_extension(req.files.image.path)) {
            return callback(new Error('invalid_extension'));
        }

        /* video uploaded */
        else if (is_video(req.files.image.path)) {
            var command = 'ffprobe -print_format json -show_streams ' + req.files.image.path;
            exec(command, function(err, stdout, stderr) {
                if (err) {
                    console.log('ffmpeg size error', err);
                    return callback(new Error('metadata_error'));
                }

                var stream_data;
                try {
                    stream_data = JSON.parse(stdout);
                } catch(e) {
                    console.log('ffmpeg size error', stderr);
                    return callback(new Error('metadata_error'));
                }

                var video_stream = null;
                for (var i in stream_data.streams) {
                    if (stream_data.streams[i].codec_type === "video") {
                        video_stream = stream_data.streams[i];
                        break;
                    }
                }
                if (video_stream !== null && video_stream.width && video_stream.height) {
                    data.image = req.files.image.path;
                    data.image_filename = req.files.image.originalFilename;
                    data.image_filesize = fs.statSync(data.image).size;
                    data.image_width = video_stream.width;
                    data.image_height = video_stream.height;
                    callback();
                } else {
                    console.log('ffmpeg could not find video stream', stderr);
                    return callback(new Error('metadata_error'));
                }
            });
        }

        /* image uploaded */
        else {
            var gm = require('gm').subClass({
                imageMagick: config.use_imagemagick
            });

            return gm(req.files.image.path).size(function(err, dimensions) {
                if (err) {
                    console.log('gm size error', err);
                    return callback(new Error('metadata_error'));
                }

                if (dimensions.height > 0 && dimensions.width > 0) {
                    data.image = req.files.image.path;
                    data.image_filename = req.files.image.originalFilename;
                    data.image_filesize = fs.statSync(data.image).size;
                    data.image_width = dimensions.width;
                    data.image_height = dimensions.height;
                }
                return callback();
            });
        }
    } catch(e) {
        console.log('metadata reading error', e);
        return callback(new Error('metadata_error'));
    }
};
