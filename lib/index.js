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
var crypto = require('crypto');
var fs = require('fs');
var http = require('http');
var https = require('https');
var format = require('util').format;
var path = require('path');

var captcha = require('captcha');
var express = require('express');
var ipfilter = require('ipfilter');
var logfmt = require('logfmt');
var mongoose = require('mongoose');
var socketio = require('socket.io');
var tripcode = require('tripcode');

var config = require('../config');
var Socket = require('./socket');
var chat_db = require('./models/chat');
var user_db = require('./models/user');

var root = path.join(__dirname, '..');
var salt_file = path.join(root, config.salt_file);
var ca_file = path.join(root, config.ssl.ca);
var key_file = path.join(root, config.ssl.key);
var cert_file = path.join(root, config.ssl.cert);

fs.readFile(salt_file, 'utf8', function(err, data) {
    if (!err) {
        config.securetrip_salt = data;
    }
});

/* initialize app */
var app = express();
var port = process.env.PORT || 5000;
var secure_port = 443;
if (port != 80) secure_port = 5443;

/* listen now */
var server = http.createServer(app).listen(port, function() {
    console.log('Express server listening on port %d in %s mode',
                server.address().port, app.settings.env);
});

var secure_server;
try {
    var options = {
        ca:   fs.readFileSync(ca_file),
        key:  fs.readFileSync(key_file),
        cert: fs.readFileSync(cert_file)
    };
    secure_server = https.createServer(options, app).listen(secure_port, function() {
        console.log('Express secure_server listening on port %d in %s mode',
                    secure_server.address().port,
                    app.settings.env);
    });
} catch (e) {
    console.log(e);
    console.log('Running with insecure server');
    secure_server = server;
}

Socket.io = socketio.listen(secure_server);

/* set up db */
mongoose.connect('mongodb://localhost/livechan_db');

/* 5mb limit */
app.use(express.limit('5mb'));

/* for saving images */
app.use(express.bodyParser({
    uploadDir: path.join(root, 'public/tmp/uploads'),
    keepExtensions: true
}));

/* blocked nodes. this file can include more */
fs.readFile('tor_list.txt', 'utf8', function(err, data) {
    if (err) return;

    // One IP per line
    var tor_list = data.split('\n');
    app.use(ipfilter(tor_list));
});

/* logging only during development */
if (port !== 80)
    app.use(logfmt.requestLogger());

/* serve public data (/public/*) and get cookies */
app.use(express.static(path.join(root + '/public')));
app.use(express.cookieParser());
app.use(express.cookieSession({
    secret: 'keyboard-cat'
}));

/* captcha security */
app.use(captcha({
    url: '/captcha.jpg',
    color: '#465e67',
    background: '#800000'
}));


function session_exists(session) {
    if (user_db.count({
        session_key: session
    })) {
        return true;
    }
    return false;
}


/* Routes */
app.use(require('./routes/api').middleware);
app.use(require('./routes/admin').middleware);
app.use(require('./routes/chat').middleware);
app.use(require('./routes/login').middleware);
app.use(require('./routes/misc').middleware);

app.all('*', function(req,res,next){
  if (!req.connection.encrypted && secure_server !== server)
    res.redirect('https://livechan.net' + req.url);
  else
    next();
});

/* reduce logging during production runs */
if (port == 80)
    Socket.io.set('log level', 1);

/* join a chat room */
Socket.io.sockets.on('connection', function(socket) {
    socket.emit('request_location', "please return a chat room");
    socket.on('subscribe', function(data) {
        socket.join(data);
    });
    socket.on('unsubscribe', function(data) {
        socket.leave(data);
    });
});
