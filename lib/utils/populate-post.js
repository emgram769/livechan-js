'use strict';

var fs = require('fs');

/* populate_post:
    - converts a POST request into a data object with fields:
        chat, convo, body, name, date, ip
        image, image_filename, image_filesize (if file uploaded)
    calls callback(err) on completion
*/
module.exports = function(req, data, callback) {
    /* TODO: remove this try catch */
    try {
        if (!req.body) {
            return callback(new Error('illegitimate_request'));
        }

        /* populate initial post details */
        data.chat = req.params.id;
        data.convo = req.body.convo || "General";
        data.body = req.body.body || "";
        data.name = req.body.name || "Anonymous";
        data.date = (new Date()).toString();
        var user_ip = req.connection.remoteAddress;
        var ip_addr = req.headers["x-forwarded-for"];
        if (ip_addr) {
            var list = ip_addr.split(",");
            user_ip = list[list.length - 1];
        }
        data.ip = user_ip;

        /* populate initial file details */
        if (req.files &&
            req.files.image &&
            req.files.image.size === 0) {

            /* no file uploaded */
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
        } else {
            /* file exists; record path, name, and size */
            data.image = req.files.image.path.match(/[\w\-\.]*$/)[0];
            data.image_filename = req.files.image.originalFilename;
            data.image_filesize = req.files.image.size;
            return callback();
        }

    } catch(e) {
        console.log('request parsing error', e);
        return callback(new Error('illegitimate_request'));
    }
};

