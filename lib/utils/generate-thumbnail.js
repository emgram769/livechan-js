'use_strict';

var path = require('path');
var spawn = require('child_process').spawn;
var fs = require('fs');
var get_extension = require('./get-extension');
var categorize = require('./categorize');

/* generate_thumbnail
    - generates thumbnail for image/video if present
    calls callback(err) on completion
*/
module.exports = function(data, callback) {
    try {
        var extension = get_extension(data.image);
        var category = data.image ? categorize(data.image) : "";
        if (category !== "image" && category !== "video") {
            // no image/video uploaded; we are finished
            return callback();
        }

        /* calculate width and height for thumbnail */
        var scale = Math.min(250 / data.image_width, 100 / data.image_height, 1);
        var thumb_width = Math.round(scale * data.image_width);
        var thumb_height = Math.round(scale * data.image_height);

        /* determine thumbnail path */
        var thumb_base_name = path.basename(data.image).replace(/\.\w+$/, "") + (data.image_transparent ? '.png' : '.jpg');
        data.thumb = path.join(path.dirname(data.image), '..', 'thumb', thumb_base_name);

        /* prepare command to generate thumbnail */
        var command, args;
        if (category === "image") {
            command = 'convert';
            args = (
                '-[0]'+(extension === 'gif' ? ' -layers coalesce' : '')+' -thumbnail '+thumb_width+'x'+thumb_height+'!'+
                (data.image_transparent ? ' +dither -colors 64 -strip png:-' : ' jpeg:-')
            ).split(' ');
        } else if (category === "video") {
            command = 'ffmpeg';
            args = ['-i', data.image];
            args = args.concat((
                '-y -s '+thumb_width+'x'+thumb_height+' -vframes 1 -f image2'+
                (data.image_transparent ? ' -c:v png' : ' -c:v mjpeg')+' -'
            ).split(' '));
        }

        /* execute command */
        var stderr = "";
        var process = spawn(command, args);
        if (category === "image") {
            fs.createReadStream(data.image).on("error", function(e) {console.log(e);}).pipe(process.stdin.on("error", function(e) {console.log(e);}));
        }
        process.stdout.on("error", function(e) {console.log(e);}).pipe(fs.createWriteStream(data.thumb));
        process.stderr.on("error", function(e) {console.log(e);}).on("data", function(data) {stderr += data;});
        process.on("close", function(code) {
            if (code !== 0) {
                console.log('thumbnail command returned error', code, command, stderr);
                return callback(new Error('thumbnail_error'));
            }
            return callback();
        });
    } catch(e) {
        console.log('thumbnail creation error', e);
        return callback(new Error('thumbnail_error'));
    }
};
