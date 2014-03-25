'use strict';

var bcrypt = require('bcrypt');
var fs = require('fs');
var path = require('path');
var config = require('../../config');

var root = path.join(__dirname, '../..');
var admin_pw_file = path.join(root, config.admin_pw_file);

var admin_pw_hash = null;
var attempts = [];

function check2(password, callback) {
    var time = new Date().getTime();
    if (attempts.length >= config.max_pw_attempts && time - attempts[config.max_pw_attempts-1] < config.max_pw_attempts_window) {
        callback(new Error('too many password attempts'));
    } else {
        attempts.splice(0, 0, time);
        attempts.splice(config.max_pw_attempts);
        bcrypt.compare(password, admin_pw_hash, callback);
    }
}

/* check_password
    - checks admin password
    calls function(err, matches) on completion
*/
module.exports = function(password, callback) {
    if (admin_pw_hash == null) {
        fs.readFile(admin_pw_file, 'utf8', function(err, data) {
            if (err) callback(err);
            admin_pw_hash = data;
            check2(password, callback);
        });
    } else {
        check2(password, callback);
    }
};

