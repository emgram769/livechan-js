'use strict';

var path = require('path');
var spawn = require('child_process').spawn;
var fs = require('fs');

var categorize = require('./categorize');

/* format_image
    - reads metadata of uploaded file
    calls callback(err) on completion
*/
module.exports = function(data, callback) {
    try {
        /* no file uploaded */
        if (!data.image) {
            return callback();
        }

        /* is this an image/video/audio file? */
        var category = categorize(data.image);

        /* prepare command to read metadata */
        var command, args;
        if (category === 'image') {
            command = 'identify';
            args = '-format [%W,%H,%T,"%A"], -'.split(' ');
        } else if (category === 'video' || category === 'audio') {
            command = 'ffprobe';
            args = '-print_format json -show_format -show_streams'.split(' ');
            args.push(data.image);
        } else {
            return callback(new Error('invalid_extension'));
        }

        /* execute command */
        var stdout = "";
        var stderr = "";
        var process = spawn(command, args);
        if (category === 'image') {
            fs.createReadStream(data.image).on("error", function(e) {console.log(e);}).pipe(process.stdin.on("error", function(e) {console.log(e);}));
        }
        process.stdout.on("error", function(e) {console.log(e);}).on("data", function(data) {stdout += data;});
        process.stderr.on("error", function(e) {console.log(e);}).on("data", function(data) {stderr += data;});
        process.on("close", function(code) {
            if (code !== 0) {
                console.log('metadata command returned error', code, command, stderr);
                return callback(new Error('metadata_error_01'));
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
                return callback(new Error('metadata_error_02'));
            }

            if (category === 'image') {
                if (metadata.length == 0) {
                    console.log('identify did not return metadata', stderr);
                    return callback(new Error('metadata_error_03'));
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
                        return callback(new Error('metadata_error_04'));
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
                                return callback(new Error('metadata_error_05'));
                            }
                        }
                        callback();
                    } else {
                        console.log('ffprobe could not find video stream', stderr);
                        return callback(new Error('metadata_error_06'));
                    }
                } else {
                    /* audio */
                    if (video_stream === null) {
                        callback();
                    } else {
                        console.log('expected audio only, got video', stderr);
                        return callback(new Error('metadata_error_07'));
                    }
                }
            }
        });
    } catch(e) {
        console.log('metadata reading error', e);
        return callback(new Error('metadata_error_08'));
    }
};