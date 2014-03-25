'use strict';

var bcrypt = require('bcrypt');
var fs = require('fs');
var path = require('path');
var config = require('../../config');

var root = path.join(__dirname, '../..');
var admin_pw_file = path.join(root, config.admin_pw_file);

var admin_pw_hash = null;

function check2(password, callback) {
    bcrypt.compare(password, admin_pw_hash, callback);
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

