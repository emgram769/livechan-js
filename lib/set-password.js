'use strict';
/*
    LiveChan is a live imageboard web application.
    Copyright (C) 2014 LiveChan Team

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
var bcrypt = require('bcrypt');
var fs = require('fs');
var path = require('path');
var read = require('read');

var config = require('../config');

var root = path.join(__dirname, '..');
var admin_pw_file = path.join(root, config.admin_pw_file);

function create_admin_pw() {
    read({prompt: 'Set password: ', silent: true}, function(err, password) {
        if (err) throw err;
        read({prompt: 'Confirm password: ', silent: true}, function(err2, password2) {
            if (err2) throw err2;
            if (password !== password2) {
                console.log('Passwords did not match');
                create_admin_pw();
                return;
            }
            bcrypt.hash(password, 8, function(err3, hash) {
                fs.writeFile(admin_pw_file, hash, function (err3) {
                    if (err3) throw err3;
                    console.log('Password set.');
                });
            });
        });
    });
}

create_admin_pw();

