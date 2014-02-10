'use_strict';

var path = require('path');
var exec = require('child_process').exec;
var fs = require('fs');
var categorize = require('./categorize');

/* generate_thumbnail
    - generates thumbnail for image/video if present
    calls callback(err) on completion
*/
module.exports = function(data, callback) {
    /* TODO: remove this try catch */
    try {
        var category = data.image ? categorize(data.image) : "";
        if (category !== "image" && category !== "video") {
            // no image/video uploaded; we are finished
            return callback();
        }

        /* calculate width and height for thumbnail */
        var scale = Math.min(250 / data.image_width, 100 / data.image_height, 1);
        var thumb_width = Math.round(scale * data.image_width);
        var thumb_height = Math.round(scale * data.image_height);

        /* prepare shell command to read metadata */
        var clean_base_names = data.image.match(/([\w\-]+)\.\w+$/);
        var clean_name = path.join(__dirname, '..', '..', 'public/tmp/uploads', clean_base_names[0]);
        var thumb_base_name = clean_base_names[1] + (data.image_transparent ? '.png' : '.jpg');
        data.thumb = path.join(__dirname, '..', '..', 'public/tmp/thumb', thumb_base_name);
        if (category === "image") {
            var command = "convert "+clean_name+"[0] -layers coalesce -thumbnail "+thumb_width+"x"+thumb_height+"! "+(data.image_transparent?"+dither -colors 64 -strip ":"")+data.thumb;
        } else if (category === "video") {
            var command = "ffmpeg -y -i "+clean_name+" -s "+thumb_width+"x"+thumb_height+" -vframes 1 "+data.thumb;
        }

        /* execute command */
        return exec(command, function(err, stdout, stderr) {
            if (err) {
                console.log('thumbnail creation error', err);
                return callback(new Error('thumbnail_error'));
            }
            return callback();
        });
    } catch(e) {
        console.log('thumbnail creation error', e);
        return callback(new Error('thumbnail_error'));
    }
};
