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
        var category = data.image ? categorize(data.image) : "";
        if (category !== "image" && category !== "video") {
            // no image/video uploaded; we are finished
            return callback();
        }
        var extension = get_extension(data.image);

        /* calculate width and height for thumbnail */
        var scale = Math.min(250 / data.image_width, 100 / data.image_height, 1);
        var thumb_width = Math.round(scale * data.image_width);
        var thumb_height = Math.round(scale * data.image_height);

        /* determine thumbnail path */
        var thumb_extension = (category === "image" && data.image_transparent !== false) ? 'png' : 'jpg';
        var thumb_base_name = path.basename(data.image).replace(/\.\w+$/, "") + '.' + thumb_extension;
        data.thumb = path.join(path.dirname(data.image), '..', 'thumb', thumb_base_name);

        /* prepare command to generate thumbnail */
        var command, args;
        if (category === "image") {
            command = 'convert';
            args = (
                '-[0]'+(extension === 'gif' ? ' -layers coalesce' : '')+' -thumbnail '+thumb_width+'x'+thumb_height+'! -strip'+
                (thumb_extension === 'png' ? ' +dither -posterize 24 -quality 70 png:-' : ' -quality 80 jpeg:-')
            ).split(' ');
        } else if (category === "video") {
            command = 'ffmpeg';
            args = ['-i', data.image];
            args = args.concat((
                '-y -s '+thumb_width+'x'+thumb_height+' -vframes 1 -f image2 -c:v mjpeg -'
            ).split(' '));
        }
    } catch(e) {
        console.log('error in thumbnail creation code', e);
        return callback(new Error('BUG: error in thumbnail creation code'));
    }

    try {
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
                return callback(new Error('could not create thumbnail for file; may be corrupt'));
            }
            return callback();
        });
    } catch(e) {
        console.log('failed to spawn thumbnail process', e);
        return callback(new Error('could not make thumbnail for file at this time (probably server stress)'));
    }
};
