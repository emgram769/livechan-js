'use strict';

var fs = require('fs');

var user_db = require('../models/user');
var add_to_chat = require('./add-to-chat');
var format_image = require('./format-image');

/* check_ip_validity:
    - checks if ip is banned
    - checks session validity
    - checks cool down
    calls format_chat(req, res, next, add_to_chat) on success
*/
module.exports = function(req, res, next) {
    /* get IP */
    var user_ip = req.connection.remoteAddress;
    var ip_addr = req.headers['x-forwarded-for'];
    if (ip_addr) {
        var list = ip_addr.split(',');
        user_ip = list[list.length - 1];
    }

    /* lookup IP */
    user_db
        .find({ip: user_ip})
        .sort({last_post: -1})
        .exec(function(e, d) {
            if (e) {
                res.json({failure: 'session_expiry'});
                return;
            }
            else if (d[0]) {
                if (req.cookies.password_livechan !== d[0].session_key) {
                    res.json({failure: 'session_expiry'});
                    return;
                } else if ((d[0].last_post.getTime() + 5000) > (new Date()).getTime()) {
                    var now = new Date();
                    user_db.update(
                        {_id: d[0]._id},
                        {$set: {last_post: now.setTime(now.getTime() + 10000)}},
                        function() {
                            if (req.files && req.files.image && req.files.image.path) {
                                /* delete file */
                                fs.unlink(req.files.image.path);
                            }
                            res.json({failure: 'countdown_violation'});
                        }
                    );
                    return;
                } else if (d[0].banned_rooms.indexOf(req.params.id) > -1) {
                    if (req.files && req.files.image && req.files.image.path) {
                        /* delete file */
                        fs.unlink(req.files.image.path);
                    }
                    res.json({ failure: 'ban_violation' });
                    return;
                } else {
                    var now = new Date();
                    user_db.update(
                        {_id: d[0]._id},
                        {$set: {last_post: now}},
                        function() {
                            format_image(req, res, next, add_to_chat);
                        }
                    );
                }
            } else {
                if (req.files && req.files.image && req.files.image.path)
                    /* delete file */
                    fs.unlink(req.files.image.path);

                    res.json({ failure: 'session_expiry' });
                    return;
                }
        });
};