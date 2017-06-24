'use strict';

var path = require('path');
var spawn = require('child_process').spawn;
var fs = require('fs');

var get_extension = require('./get-extension');
var categorize = require('./categorize');
var config = require('../../config');

// format names returned by identify/ffprobe
var format_names = {
    'gif': 'gif',
    'jpg': 'jpeg',
    'jpeg': 'jpeg',
    'png': 'png',
    'ogg': 'ogg',
    'ogv': 'ogg',
    'webm': 'matroska,webm',
    'mp3': 'mp3',
    'flac': 'flac',
    'mp4': 'mp4'
};

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
    var extension = get_extension(data.image);
    var category = categorize(data.image);

    /* prepare command to read metadata */
    var command, args;
    if (category === 'image') {
      command = 'identify';
      if (extension === 'gif') {
        args = ('-format %T, - -format 0],["%m",%W,%H,%[opaque]]] -').split(' ');
        args[2] = data.image;
        args[5] = data.image + '[0]';
      } else {
        args = ('-format 0,0],["%m",%w,%h]] -').split(' ');
        args[2] = data.image + '[0]';
      }
    } else if (category === 'video' || category === 'audio') {
      command = 'ffprobe';
      args = '-print_format json -show_format -show_streams'.split(' ');
      args.push(data.image);
    } else {
      return callback(new Error('unsupported file extension'));
    }
  } catch(e) {
    console.log('error in metadata reading code', e);
    return callback(new Error('BUG: error in metadata reading code'));
  }

  try {
    /* execute command */
    var stdout = "";
    var stderr = "";
    var process = spawn(command, args);
    process.stdout.on("error", function(e) {console.log(e);}).on("data", function(data) {stdout += data;});
    process.stderr.on("error", function(e) {console.log(e);}).on("data", function(data) {stderr += data;});
    process.on("close", function(code) {
      if (code !== 0) {
        console.log('metadata command returned error', code, command, stderr);
        return callback(new Error('could not read file; may be corrupt'));
      }

      /* convert ImageMagick output to proper JSON */
      if (category === 'image') {
        var json_data = '[['+stdout.trim().toLowerCase();
      } else {
        var json_data = stdout;
      }

      /* parse JSON */
      var metadata;
      try {
        metadata = JSON.parse(json_data);
      } catch(e) {
        console.log('command returned unparseable metadata', command, args, stderr, JSON.stringify(stdout));
        return callback(new Error('BUG: command returned unparseable metadata'));
      }

      if (category === 'image') {
          if (!(metadata.length === 2 && metadata[0].length >= 2 && metadata[1].length >= 3)) {
            console.log('identify returned invalid metadata', stderr, JSON.stringify(metadata));
            return callback(new Error('BUG: identify returned invalid metadata'));
          }
          if (metadata[1][0] !== format_names[extension]) {
            console.log('image file content does not match extension', metadata[1][0], format_names[extension]);
            return callback(new Error('image file content does not match extension'));
          }
          data.image_width = metadata[1][1];
          data.image_height = metadata[1][2];
          if (3 < metadata[1].length) {
            data.image_transparent = !metadata[1][3];
          }
          if (extension === 'jpg' || extension === 'jpeg') {
            data.image_transparent = false;
          }
          if (metadata[0].length > 2) {
            data.duration = 0;
            metadata[0].forEach(function(x) {
              data.duration += x;
            });
            data.duration /= 100;
          }
          return callback();
      } else if (category === 'video' || category === 'audio') {

        if (category === 'video') {
          /* check container format and stream codecs */
          if (metadata.format === undefined || metadata.streams === undefined) {
            console.log('ffprobe output missing format/streams info');
            return callback(new Error('BUG: ffprobe output missing format/streams info'));
          }
          if (metadata.format.format_name.indexOf(format_names[extension]) == -1) {
            console.log(metadata.format.format_name);
            console.log(extension);
            console.log('video file content does not match extension');
            return callback(new Error('video file content does not match extension'));
          }
          for (var i in metadata.streams) {
            var codec_names = config.codec_names[metadata.streams[i].codec_type];
            if (codec_names !== undefined && codec_names.indexOf(metadata.streams[i].codec_name) < 0) {
              console.log('unrecognized codec', metadata.streams[i].codec_name);
              return callback(new Error('unrecognized codec'));
            }
          }

          /* get file duration, if given */
          if (metadata.format.duration !== undefined) {
            try {
              data.duration = parseFloat(metadata.format.duration);
            } catch(e) {
              console.log('ffprobe returned invalid duration data', stderr);
              return callback(new Error('BUG: ffprobe returned invalid duration data'));
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
                return callback(new Error('BUG: error parsing SAR from ffprobe'));
              }
            }
            callback();
          } else {
            console.log('ffprobe could not find video stream', stderr);
            return callback(new Error('file does not contain video (is this an audio file?)'));
          }
        } else {
          /* audio */
          //if (video_stream === null) {
            callback();
          /*} else {
            console.log('expected audio only, found video', stderr);
            return callback(new Error('expected audio only, found video'));
          }*/
        }
      }
    });
  } catch(e) {
    console.log('failed to spawn metadata process', e);
    return callback(new Error('could not process file at this time (probably server stress)'));
  }
};
