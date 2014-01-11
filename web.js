var express = require("express");
var logfmt = require("logfmt");
var http = require('http');
var crypto = require('crypto');
var ipfilter = require('ipfilter');

var format = require('util').format;
var app = express();
var port = process.env.PORT || 5000;
var server = http.createServer(app).listen(port, function(){
    console.log('Express server listening on port %d in %s mode',
            server.address().port, app.settings.env);
});
var io = require('socket.io').listen(server);
var fs = require('fs');

app.use(express.bodyParser({
      uploadDir: 'public/tmp/uploads',
      keepExtensions: true
    }));
app.use(express.limit('5mb'));

fs = require('fs');
fs.readFile('tor_list.txt', 'utf8', function(err,data){
    var tor_list = data.split("\n");
    app.use(ipfilter(tor_list));
    
});

app.use(logfmt.requestLogger());
app.use(express.static(__dirname + '/public'));

chat = [];
hash_list = [];
ips = {};

function demote_ips(){
    for(i in ips){
        if (ips[i] == 0)
            delete ips[i];
        else
            ips[i]--;
    }
}

setInterval(demote_ips,1000);

function get_extension(filename) {
    var i = filename.lastIndexOf('.');
    return (i < 0) ? '' : filename.substr(i+1);
}

function invalid_extension(filename){
    var test=['jpg','jpeg','png','gif','svg'].indexOf(get_extension(filename));
    console.log("INDEX IS",get_extension(filename), test);
    if (test > -1)
        return false;
    return true;
}

function add_to_chat(data){
    if (chat.length>100){
        console.log(chat);
        //if(chat[0].image)
          //  fs.unlink(chat[0].image);
        delete chat[0];
        chat = chat.slice(-100,0);
    }
    chat.push(data);
}

function duplicate_hash(hash){
    if (hash_list.length>10){
        hash_list = [];
    }
    if (hash_list.indexOf(hash)>-1)
        return true;
    return false;
}

function already_exists(body){
    for(i in chat){
        if (chat[i].body == body)
            return true;
    }
    return false;
}

app.get('/', function(req, res) {
    res.sendfile('index.html');
});

app.get('/data', function(req, res) {
    res.json(chat);
});

app.post('/', function(req, res, next) {
    // the uploaded file can be found as `req.files.image` and the
    // title field as `req.body.title`
    
    var data = {};
    var m1 = parseInt(req.body.m1);
    var m2 = parseInt(req.body.m2);
    var sum = parseInt(req.body.sum);
    console.log(m1,m2,sum);
    var a = crypto.createHash('sha1').update((m1+m2)+'test').digest('hex');
    var b = crypto.createHash('sha1').update(sum+'test').digest('hex');
    console.log(a,b);
    
    if(req.connection.remoteAddress in ips) {
        if(ips[req.connection.remoteAddress] >= 4){
           ips[req.connection.remoteAddress] += 1; 
        }
        res.json({success:"SUCCESS"});
        return;
    } else {
        ips[req.connection.remoteAddress] = 15;
    }
    
    if(a != b && duplicate_hash(hash)){
            res.json({success:"SUCCESS"});
            return;
    }
    
    if(req.body.body.length > 200) {
        req.body.body = req.body.body.substring(0,199)+"...";
    }
    
    if(req.body.name.length > 25) {
        req.body.name = req.body.name.substring(0,24)+"...";
    }
    
    if(already_exists(req.body.body)){
        res.json({success:"SUCCESS"});
        return;
    }
    
    if(req.body.body == ""){
        res.json({success:"SUCCESS"});
        return;
    }
    
    data.body = req.body.body;
    data.name = req.body.name ? req.body.name : "Anonymous";
    
    if(req.files.image.size == 0 ||
    invalid_extension(req.files.image.path)) {
        //fs.unlink(req.files.image.path);
        console.log("DELETED");
    } else {
        console.log('image loaded to', req.files.image.path);
        data.image = req.files.image.path;
    }
    data.date = (new Date).toString();
    add_to_chat(data);
    io.sockets.emit('chat', data);
    console.log(data);
    res.json({success:"SUCCESS"});
});

/* socket.io content */
// no actual websockets in heroku
io.configure(function () {
    io.set("transports", ["xhr-polling"]);
    io.set("polling duration", 100);
    //io.set('log level', 1);
});
/*
io.sockets.on('connection', function (socket) {
    return;
});

*/
