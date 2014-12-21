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
var fs = require('fs');
var http = require('http');
var https = require('https');
var format = require('util').format;
var path = require('path');

var captcha = require('captcha');
var express = require('express');
var logfmt = require('logfmt');
var mongoose = require('mongoose');
var socketio = require('socket.io');
var tripcode = require('tripcode');

var config = require('../config');
var Socket = require('./socket');
var socket_stream = require('socket.io-stream');
var chat_db = require('./models/chat');
var user_db = require('./models/user');

var root = path.join(__dirname, '..');
var salt_file = path.join(root, config.salt_file);
var ca_file = path.join(root, config.ssl.ca);
var key_file = path.join(root, config.ssl.key);
var cert_file = path.join(root, config.ssl.cert);

/* read secure tripcode salt */
fs.readFile(salt_file, 'utf8', function(err, data) {
    if (!err) {
        config.securetrip_salt = data;
    }
});

/* initialize app */
var app = express();
var port = process.env.PORT || 5080;
var secure_port = 443;
if (port != 80) secure_port = 5443;

/* listen now */
var insecure_server = http.createServer(app).listen(port, function() {
    console.log('Express server (insecure) listening on port %d in %s mode',
        insecure_server.address().port, app.settings.env);
});

var server;
if (fs.existsSync(key_file) && fs.existsSync(cert_file) && false) {
    var options = {
        key: fs.readFileSync(key_file),
        cert: fs.readFileSync(cert_file)
    };
    if (fs.existsSync(ca_file)) {
        options.ca = fs.readFileSync(ca_file);
    }
    server = https.createServer(options, app).listen(secure_port, function() {
        console.log('Express server (secure) listening on port %d in %s mode',
            server.address().port,
            app.settings.env);
    });
} else {
    console.log('Missing certificate or private key');
    console.log('Running with insecure server');
    server = insecure_server;
}

Socket.io = socketio.listen(server);

/* set up db */
var db_addr = process.env.DB || 'livechan_db';
mongoose.connect('mongodb://localhost/' + db_addr);

/* 5mb limit */
app.use(express.limit('5mb'));

/* for saving images */
app.use(express.bodyParser({
    uploadDir: path.join(root, 'public/tmp/uploads'),
    keepExtensions: true
}));

/* logging only during development */
if (port == 180) {
    app.use(logfmt.requestLogger());
}

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


app.all('*', function(req, res, next) {
    if (!req.connection.encrypted && server !== insecure_server)
        res.redirect('https://' + req.host + (secure_port == 443 ? '' : ':' + secure_port) + req.url);
    else
        next();
});

/* Routes */
app.use(require('./routes/api').middleware);
app.use(require('./routes/admin').middleware);
app.use(require('./routes/chat').middleware);
app.use(require('./routes/login').middleware);
app.use(require('./routes/youtube').middleware);
app.use(require('./routes/misc').middleware);


/* reduce logging */
Socket.io.set('log level', 1);

/* join a chat room */
Socket.io.sockets.on('connection', function(socket) {
    socket.emit('request_location', "please return a chat room");
    socket.on('subscribe', function(data) {
        socket.join(data);
        Socket.io.sockets.in(data).emit('user_count', Socket.io.sockets.clients(data).length);
    });
    socket.on('unsubscribe', function(data) {
        socket.leave(data);
        Socket.io.sockets.in(data).emit('user_count', Socket.io.sockets.clients(data).length);
    });
    socket_stream(socket).on('upload', function(stream, data) {
        var filename = 'public/tmp/uploads2/' + path.basename(data.name);
        stream.pipe(fs.createWriteStream(filename));
    });
});

var ircServer = require('./utils/irc.js');
ircServer.start();