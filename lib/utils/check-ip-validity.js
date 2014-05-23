'use strict';

var fs = require('fs');

var user_db = require('../models/user');
var get_user_ip = require('./get-user-ip');

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
	// meant for any bots you'd like to validate with custom passwords
	// very insecure and hacky right now.
	// do not use it I am just testing with it
	// 
	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	if (req.cookies.password_livechan == 'somepassword') {  // this should be WAY more secure in the future
		return callback();
	}

    /* lookup IP */
    user_db
        .find({ip: user_ip})
        .sort({last_post: -1})
        .exec(function(e, d) {
            if (e || !d[0] || (req.cookies.password_livechan !== d[0].session_key)) {
                return callback(new Error('session_expiry'));
            } else if ((d[0].last_post.getTime() + 5000) > (new Date()).getTime()) {
                var now = new Date();
                return user_db.update(
                    {_id: d[0]._id},
                    {$set: {last_post: now.setTime(now.getTime() + 10000)}},
                    function(err) {
                        if (err) return callback(new Error('database_error'));
                        return callback(new Error('countdown_violation'));
                    }
                );
                return;
            } else if (d[0].banned_rooms.indexOf(req.params.id) > -1) {
                return callback(new Error('ban_violation'));
            } else {
                var now = new Date();
                return user_db.update(
                    {_id: d[0]._id},
                    {$set: {last_post: now}},
                    function(err) {
                        if (err) return callback(new Error('database_error'));
                        return callback();
                    }
                );
            }
        });
};
