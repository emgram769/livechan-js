'use strict';

var fs = require('fs');

var user_db = require('../models/user');
var get_user_ip = require('./get-user-ip');
var path = require('path');
var config = require('../../config');

var root = path.join(__dirname, '../..');
var no_limit_cookie_file = path.join(root, config.no_limit_cookie_file);
var no_limit_cookie_string = '';

/* check_ip_validity:
    - checks if ip is banned
    - checks session validity
    - checks cool down
    calls callback(err) on completion
*/
module.exports = function(req, callback) {
    /* get IP */
    var user_ip = get_user_ip(req);

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    //
    // meant for any bots you'd like to validate with custom cookies
    // 
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    fs.readFile(no_limit_cookie_file, 'utf8', function(err, data) {
        if (err) {
            console.log("no special cookie file found");
            return;
        } // We have a default string, so this doesn't matter
        no_limit_cookie_string = data;
    });

    if (req.cookies.password_livechan == no_limit_cookie_string && no_limit_cookie_string !== '') {
        return callback();
    }

    /* lookup IP */
    user_db
        .find({
            ip: user_ip
        })
        .sort({
            last_post: -1
        })
        .exec(function(e, d) {
            if (e || !d[0] || (req.cookies.password_livechan !== d[0].session_key)) {
                return callback(new Error('session_expiry'));
            } else if ((d[0].last_post.getTime() + 5000) > (new Date()).getTime()) {
                var now = new Date();
                return user_db.update({
                        _id: d[0]._id
                    }, {
                        $set: {
                            last_post: now.setTime(now.getTime() + 10000)
                        }
                    },
                    function(err) {
                        if (err) return callback(new Error('database_error'));
                        return callback(new Error('countdown_violation'));
                    }
                );
                return;
            } else if ((d[0].banned_rooms.indexOf(req.params.id) > -1) ||
                (d[1] && d[1].banned_rooms && d[1].banned_rooms.indexOf(req.params.id) > -1)) {
                return callback(new Error('ban_violation'));
            } else {
                var now = new Date();
                return user_db.update({
                        _id: d[0]._id
                    }, {
                        $set: {
                            last_post: now
                        }
                    },
                    function(err) {
                        if (err) return callback(new Error('database_error'));
                        return callback();
                    }
                );
            }
        });
};