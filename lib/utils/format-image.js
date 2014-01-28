'use strict';

var exec = require('child_process').exec;
var fs = require('fs');

var config = require('../../config');
var format_post = require('./format-post');
var generate_thumbnail = require('./generate-thumbnail');
var invalid_extension = require('./invalid-extension');
var is_video = require('./is-video');

/* format_image
    - checks for image and sets data accordingly
    calls generate_thumbnail(req, res, next, data, callback) in case of image/video
    skips to format_post(req, res, next, data, callback) otherwise
*/
module.exports = function(req, res, next, callback) {
    /* TODO: remove this try catch */
    try {
        /* to be stored in db and passed to clients */
        var data = {};

        /* no image uploaded */

        if (req.files &&
            req.files.image &&
            req.files.image.size === 0 ||
            invalid_extension(req.files.image.path)) {

            /* delete blank file */
            fs.unlinkSync(req.files.image.path);

            if (/^\s*$/.test(req.body.body)) {
                res.json({ failure: "nothing substantial submitted" });
                return;
            } else {
                format_post(req, res, next, data, callback);
            }
        }

        /* video uploaded */
        else if (is_video(req.files.image.path)) {
            var command = 'ffprobe -print_format json -show_streams ' + req.files.image.path;
            exec(command, function(err, stdout, stderr) {
                if (err) return console.log('ffmpeg size error', err);

                var stream_data;
                try {
                    stream_data = JSON.parse(stdout);
                } catch(e) {
                    return console.log('ffmpeg size error', stderr);
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
                    generate_thumbnail(req, res, next, data, callback);
                } else {
                    console.log("ffmpeg could not find video stream", stderr);
                    return;
                }
            });
        }

        /* image uploaded */
        else {
            var gm = require('gm').subClass({
                imageMagick: config.use_imagemagick
            });

            gm(req.files.image.path).size(function(err, dimensions) {
                if (err) {
                    return console.log('gm size error', err);
                }

                if (dimensions.height > 0 && dimensions.width > 0) {
                    data.image = req.files.image.path;
                    data.image_filename = req.files.image.originalFilename;
                    data.image_filesize = fs.statSync(data.image).size;
                    data.image_width = dimensions.width;
                    data.image_height = dimensions.height;
                }
                generate_thumbnail(req, res, next, data, callback);
            });
        }
    } catch(e) {
        if (req.files && req.files.image && req.files.image.path) {
            /* delete blank file */
            fs.unlinkSync(req.files.image.path);
        }
        res.json({failure: 'illegitimate_request'});
    }
};