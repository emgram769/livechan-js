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

chat = {};
hash_list = [];
session_list = [];
ips = {};
count = 0;
var boards = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'gif', 'h', 'hr', 'k', 'm', 'o', 'p', 'r', 's', 't', 'u', 'v', 'vg', 'vr', 'w', 'wg', 'i', 'ic', 'r9k', 's4s', 'cm', 'hm', 'lgbt', 'y', '3', 'adv', 'an', 'asp', 'cgl', 'ck', 'co', 'diy', 'fa', 'fit', 'gd', 'hc', 'int', 'jp', 'lit', 'mlp', 'mu', 'n', 'out', 'po', 'pol', 'sci', 'soc', 'sp', 'tg', 'toy', 'trv', 'tv', 'vp', 'wsg', 'x'];

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

function add_to_chat(data,id){
    if (!chat[id])
        chat[id] = [];
    if (chat[id].length>100){
        if(chat[id][0].image)
            fs.unlink(chat[id][0].image);
        delete chat[id][0];
        chat[id] = chat[id].slice(-100,0);
    }
    chat[id].push(data);
}

function session_exists(session){
    if (session_list.indexOf(session)>-1)
        return true;
    return false;
}

function already_exists(body, id){
    for(i in chat[id]){
        if (chat[id][i].body == body){
            ips[chat[id][i].ip]+=600;
            return true;
        }
    }
    return false;
}

app.get('/login', function(req, res){
    res.send('<html><head><link type="text/css" rel="stylesheet" href="style.css"></head><body><div class="center container"><div>Please prove you aren\'t a robot</div><br/><img src="/captcha.jpg"/><form action="/login" method="post"><br/><input type="text" name="digits"/><input type="hidden" name="page" value="'+req.query.page+'"/></form></div></body></html>');
});

app.post('/login', function(req, res){
    if(req.body.digits == req.session.captcha) {
        var info = req.headers['user-agent']+req.connection.remoteAddress+'password';
        var password = crypto.createHash('sha1').update(info).digest('base64').toString();
        console.log("password", password);
        session_list.push(password);
        console.log(session_list);
        res.cookie('password_livechan', password, { maxAge: 900000, httpOnly: false});
        console.log(req);
        res.redirect(req.body.page);
    } else {
        res.send("You mistyped the captcha!");
    }
});

app.get('/', function(req, res) {
    res.sendfile('home.html');
});


app.get('/chat/:id([a-z]+)', function(req, res) {
    if (boards.indexOf(req.params.id) < 0){
        res.send("Does not exist :(");
    }
    res.sendfile('index.html');
});

app.get('/data/:id([a-z]+)', function(req, res) {
    if (boards.indexOf(req.params.id) < 0){
        res.send("Does not exist :(");
    }
    if (!chat[req.params.id]) {
        chat[req.params.id] = [];
    }
    res.json(chat[req.params.id]);
});

app.post('/ban/:id([a-z]+)', function(req, res, next){
    var board = req.params.id;
    var ip = req.query.ip;
    var hash = crypto.createHash('md5').update(req.body.name.substr(req.query.password)).digest('base64').slice(0,10);
    if (hash == "CnB7SkWsyx"){
        console.log(ip);
    }
});

app.post('/chat/:id([a-z]+)', function(req, res, next) {
    if (boards.indexOf(req.params.id) < 0){
        res.send("Does not exist :(");
        return;
    }
    
    console.log("TEXT SENT",req.body.body);
    
    // find should be password to prevent identity fraud 
    var info = req.headers['user-agent']+req.connection.remoteAddress+'password';
    var password = crypto.createHash('sha1').update(info).digest('base64').toString();
    var user_pass = req.cookies['password_livechan'];
        /*
    if(!user_pass || password != user_pass){
        console.log("NO PASSRROD");
        res.redirect('/login');
        return;
    }
    
    // check if it exists 
    if(!session_exists(user_pass)){
        console.log(session_list);
        console.log("NO PASSRROD");
        res.redirect('/login');
        return;
    }
    */
    
    if(req.body.body.length > 400) {
        req.body.body = req.body.body.substring(0,399)+"...";
    }
    
    if(req.body.body.split("\n").length > 7){
        req.body.body = req.body.body.split("\n",7).join("\n");
    }
    
    if(req.body.name.length > 40) {
        req.body.name = req.body.name.substring(0,39)+"...";
    }
    
    /* passed most tests, make data object */
    var data = {};
    var trip_index = req.body.name.indexOf("#");
    
    if(trip_index > -1) {
        data.trip = "!"+crypto.createHash('md5').update(req.body.name.substr(trip_index)).digest('base64').slice(0,10);
        req.body.name = req.body.name.slice(0,trip_index);
    }
    
    if(data.trip != "!CnB7SkWsyx") {
    /* update hash cool down */
    if(user_pass in hash_list) {
        if(hash_list[user_pass] >= 1){
           hash_list[user_pass] += 100; 
        }
        console.log("hash", hash_list[user_pass]);
        res.json({failure:"cool down violation. now "+hash_list[user_pass]+" seconds"});
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
        res.json({failure:"cool down violation. now "+ips[req.connection.remoteAddress]+" seconds"});
        return;
    } else {
        ips[req.connection.remoteAddress] = 15;
    }
    
    
    
    if(already_exists(req.body.body, req.params.id)){
        console.log("exists");
        res.json({failure:"post exists"});
        return;
    }
    
    if(req.body.body == ""){
        console.log("nothing");
        res.json({failure:"nothing submitted"});
        return;
    }
    }
    data.body = req.body.body;
    data.name = req.body.name ? req.body.name : "Anonymous";
    
    if(req.files.image.size == 0 ||
    invalid_extension(req.files.image.path)) {
        fs.unlink(req.files.image.path);
        console.log("DELETED");
    } else {
        console.log('image loaded to', req.files.image.path);
        data.image = req.files.image.path;
    }
    count++;
    data.count = count;
    data.date = (new Date).toString();
    data.ip = req.connection.remoteAddress;
    add_to_chat(data, req.params.id);
    data.ip = 'hidden';
    
    data.chat = req.params.id;
    //console.log(chat);
    
    io.sockets.in(req.params.id).emit('chat', data);
    io.sockets.in('all').emit('chat', data);
    
    res.json({success:"SUCCESS"});
});

/* socket.io content */
// no actual websockets in heroku
io.configure(function () {
    io.set("transports", ["xhr-polling"]);
    io.set("polling duration", 100);
    //io.set('log level', 1);
});

io.sockets.on('connection', function (socket) {
    socket.emit('request_location', "pls");
    socket.on('subscribe', function (data) {
        socket.join(data);
        //console.log("UPDATE", data);
    });
});

