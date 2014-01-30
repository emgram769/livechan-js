'use_strict';

var path = require('path');
var exec = require('child_process').exec;
var fs = require('fs');
var config = require('../../config.js');
var format_post = require('./format-post');
var is_video = require('./is-video');

/* generate_thumbnail
    - generates thumbnail for image
    calls format_post(req, res, next, data, callback) on completion
*/
module.exports = function(req, res, next, data, callback) {
    /* TODO: remove this try catch */
    try {
        var scale = Math.min(250 / data.image_width, 100 / data.image_height, 1);
        var thumb_width = Math.round(scale * data.image_width);
        var thumb_height = Math.round(scale * data.image_height);

        var thumbs_location = path.join(__dirname, '..', '..', 'public/tmp/thumb/');
        data.thumb = thumbs_location + data.image.match(/([\w\-]+)\.\w+$/)[1] + '.jpg';

        if (is_video) {
            var command = "ffmpeg -i "+req.files.image.path+" -s "+thumb_width+"x"+thumb_height+" -vframes 1 "+data.thumb;
            exec(command, function(err, stdout, stderr) {
                if (err) {
                    return console.log("thumbnail creation error", err);
                }
                format_post(req, res, next, data, callback);
            });
        } else {
            var gm = require('gm').subClass({
                imageMagick: config.use_imagemagick
            });

            gm(data.image)
                .out("-delete", "1--1") // use first frame only; only needed for ImageMagick
                .thumb(thumb_width, thumb_height, data.thumb, function(err) {
                    if (err) {
                        return console.log("thumbnail creation error", err);
                    }
                    format_post(req, res, next, data, callback);
                });
        }
    } catch(e) {
        console.log("thumbnail creation error", e);
        if (req.files && req.files.image && req.files.image.path) {
            /* delete blank file */
            fs.unlink(req.files.image.path);
        }
        res.json({failure: "illegitimate_request"});
    }
};