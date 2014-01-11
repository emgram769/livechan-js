var express = require("express");
var logfmt = require("logfmt");
var http = require('http');
var crypto = require('crypto');
var ipfilter = require('ipfilter');
var captcha = require('captcha');

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
app.use(express.cookieParser());
app.use(express.cookieSession({ secret: 'keyboard-cat' }));
app.use(captcha({ url: '/captcha.jpg', color:'#0064cd', background: 'rgb(20,30,200)' }));

chat = [];
hash_list = [];
session_list = [];
ips = {};
count = 0;

function demote_ips(){
    for(i in ips){
        if (ips[i] == 0)
            delete ips[i];
        else
            ips[i]--;
    }
    for(i in hash_list){
        if (hash_list[i] == 0)
            delete hash_list[i];
        else
            hash_list[i]--;
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

function session_exists(session){
    if (session_list.indexOf(session)>-1)
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

app.get('/login', function(req, res){
    res.sendfile('login.html');
});

app.post('/login', function(req, res){
    if(req.body.digits == req.session.captcha) {
        var info = req.headers['user-agent']+req.connection.remoteAddress+'password';
        var password = crypto.createHash('sha1').update(info).digest('base64').toString();
        console.log("password", password);
        session_list.push(password);
        res.cookie('password_livechan', password, { maxAge: 900000, httpOnly: false});
        res.redirect('/');
    } else {
        res.json({failure:"fail"});
    }
});

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
    
    /* find should be password to prevent identity fraud */
    var info = req.headers['user-agent']+req.connection.remoteAddress+'password';
    var password = crypto.createHash('sha1').update(info).digest('base64').toString();
    var user_pass = req.cookies['password_livechan'];
        
    if(!user_pass || password != user_pass){
        console.log("NO PASSRROD");
        res.json({success:"SUCCESS"});
        return;
    }
    
    /* check if it exists */
    if(!session_exists(user_pass)){
        console.log("NO PASSRROD");
        res.json({success:"SUCCESS"});
        return;
    }
    
    /* update hash cool down */
    if(user_pass in hash_list) {
        if(hash_list[user_pass] >= 1){
           hash_list[user_pass] += 100; 
        }
        res.json({success:"SUCCESS"});
        return;
    } else {
        hash_list[user_pass] = 15;
    }
    
    /* update ip cool down */
    if(req.connection.remoteAddress in ips) {
        if(ips[req.connection.remoteAddress] >= 1){
           ips[req.connection.remoteAddress] += 100; 
        }
        console.log("IP", ips[req.connection.remoteAddress]);
        res.json({success:"SUCCESS"});
        return;
    } else {
        ips[req.connection.remoteAddress] = 15;
    }
    
    if(req.body.body.length > 400) {
        req.body.body = req.body.body.substring(0,399)+"...";
    }
    
    if(req.body.name.length > 40) {
        req.body.name = req.body.name.substring(0,39)+"...";
    }
    
    var trip_index = req.body.name.indexOf("#");
    
    if(trip_index > -1) {
        data.trip = "!"+crypto.createHash('md5').update(req.body.name.substr(trip_index)).digest('base64').slice(0,10);
        req.body.name = req.body.name.slice(0,trip_index);
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
    count++;
    data.count = count;
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
