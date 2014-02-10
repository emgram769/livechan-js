'use strict';

var path = require('path');
var exec = require('child_process').exec;
var fs = require('fs');

var categorize = require('./categorize');
var shell_escape = require('./shell-escape');

/* format_image
    - reads metadata of uploaded file
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

        /* prepare shell command to read metadata */
        var clean_base_name = data.image.match(/[\w\-]+\.\w+$/)[0];
        var clean_name = path.join(__dirname, '..', '..', 'public/tmp/uploads', clean_base_name);
        if (category === 'image') {
            var command = 'identify -format "[%W,%H,%T,\\"%A\\"]," '+shell_escape(clean_name);
        } else if (category === 'video' || category === 'audio') {
            var command = 'ffprobe -print_format json -show_format -show_streams '+shell_escape(clean_name);
        } else {
            return callback(new Error('invalid_extension'));
        }

        /* execute command */
        exec(command, function(err, stdout, stderr) {
            if (err) {
                console.log('error calling', command, err);
                return callback(new Error('metadata_error'));
            }

            /* convert ImageMagick output to proper JSON */
            if (category === 'image') {
                var json_data = '['+stdout.trim().slice(0,-1)+']';
            } else {
                var json_data = stdout;
            }

            /* parse JSON */
            var metadata;
            try {
                metadata = JSON.parse(json_data);
            } catch(e) {
                console.log('command returned unparseable metadata', command, stderr, JSON.stringify(stdout));
                return callback(new Error('metadata_error'));
            }

            if (category === 'image') {
                if (metadata.length == 0) {
                    console.log('identify did not return metadata', stderr);
                    return callback(new Error('metadata_error'));
                }
                data.image_width = metadata[0][0];
                data.image_height = metadata[0][1];
                data.image_transparent = (metadata[0][3].toLowerCase() === "true");
                if (metadata.length > 1) {
                    data.duration = 0;
                    metadata.forEach(function(x) {
                        data.duration += x[2] / 100;
                    });
                }
                return callback();
            } else if (category === 'video' || category === 'audio') {
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
            }
        });
    } catch(e) {
        console.log('metadata reading error', e);
        return callback(new Error('metadata_error'));
    }
};
