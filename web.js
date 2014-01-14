/* required modules */
var express = require("express");
var logfmt = require("logfmt");
var http = require('http');
var crypto = require('crypto');
var ipfilter = require('ipfilter');
var captcha = require('captcha');

/* globals */
var format = require('util').format;
var app = express();
var port = process.env.PORT || 5000;
/* listen now */
var server = http.createServer(app).listen(port, function(){
    console.log('Express server listening on port %d in %s mode',
    server.address().port, app.settings.env);
});
var io = require('socket.io').listen(server);
var fs = require('fs');

/* for saving images */
app.use(express.bodyParser({
    uploadDir: 'public/tmp/uploads',
    keepExtensions: true
    }));

/* 5mb limit */
app.use(express.limit('5mb'));

/* blocked end nodes. this file can include more */
fs = require('fs');
fs.readFile('tor_list.txt', 'utf8', function(err,data){
    var tor_list = data.split("\n");
    app.use(ipfilter(tor_list));

});

/* logging */
app.use(logfmt.requestLogger());

/* serve public stuff and get cookies */
app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser());
app.use(express.cookieSession({ secret: 'keyboard-cat' }));

/* captcha security */
app.use(captcha({ url: '/captcha.jpg', color:'#0064cd', background: 'rgb(20,30,200)' }));

/* stored data in memory */
chat = {};
data_chat = {};
count = 2232;
curr_chat =[];
hash_list = [];
session_list = [];
ips = {};
boards = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'gif', 'h', 'hr', 'k', 'm', 'o', 'p', 'r', 's', 't', 'u', 'v', 'vg', 'vr', 'w', 'wg', 'i', 'ic', 'r9k', 's4s', 'cm', 'hm', 'lgbt', 'y', '3', 'adv', 'an', 'asp', 'cgl', 'ck', 'co', 'diy', 'fa', 'fit', 'gd', 'hc', 'int', 'jp', 'lit', 'mlp', 'mu', 'n', 'out', 'po', 'pol', 'sci', 'soc', 'sp', 'tg', 'toy', 'trv', 'tv', 'vp', 'wsg', 'x', 'dev'];

/* snapshot location. for download when pushing updates */
// TO DO: Set up database to make this legitimate
fs.readFile('public/chats.json', 'utf8', function (err, data) {
  if (err) {
    console.log('Error: ' + err);
    return;
  }
  data = JSON.parse(data);
  chat = data.chat;
  data_chat = data.chat;
  count = data.count;
});

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
    /*fs.writeFile('public/chats.json', JSON.stringify({chat:data_chat, count:count}) , function(){
        //console.log('written');
    });*/
}

setInterval(demote_ips,1000);

function get_extension(filename) {
    var i = filename.lastIndexOf('.');
    return (i < 0) ? '' : filename.substr(i+1);
}

function invalid_extension(filename){
    var test=['jpg','jpeg','png','gif'].indexOf(get_extension(filename));
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
        chat[id] = chat[id].slice(-99);
    }
    if (!data_chat[id])
        data_chat[id] = [];
    if (data_chat[id].length>100){
        delete data_chat[id][0];
        data_chat[id] = data_chat[id].slice(-99);
    }
    if (curr_chat.length>20){
        delete curr_chat[0];
        curr_chat = curr_chat.slice(-19);
    }
    chat[id].push(data);
    if(data.ip)
        data.ip = 'hidden';
    data_chat[id].push(data);
    curr_chat.push(data);
    
    fs.writeFile('public/chats.json', JSON.stringify({chat:data_chat, count:count}) , function(){
    });
}

function session_exists(session){
    if (session_list.indexOf(session)>-1)
    return true;
    return false;
}

function already_exists(body, id){
    for(i in chat[id]){
        if (chat[id][i].body == body && chat[id][i].ip){
            ips[chat[id][i].ip]+=600;
            return true;
        }
    }
    return false;
}

app.get('/login', function(req, res){
    res.send('<html><head><meta name="viewport" content="width=device-width,user-scalable=no"><link type="text/css" rel="stylesheet" href="style.css"></head><body><div class="center container"><div>Please prove you aren\'t a robot</div><br/><img src="/captcha.jpg"/><form action="/login" method="post"><br/><input type="text" name="digits"/><input type="hidden" name="page" value="'+req.query.page+'"/></form></div></body></html>');
});

app.post('/login', function(req, res){
    var ipAddr = req.headers["x-forwarded-for"];
    if (ipAddr){
        var list = ipAddr.split(",");
        req.connection.remoteAddress = list[list.length-1];
    } else {
        req.connection.remoteAddress = req.connection.remoteAddress;
    }
    
    if(req.body.digits == req.session.captcha) {
        var key=(Math.random()*1e17).toString(36);
        var info = req.headers['user-agent']+req.connection.remoteAddress+key;
        var password = crypto.createHash('sha1').update(info).digest('base64').toString();
        console.log("password", password);
        session_list.push(password);
        res.cookie('password_livechan', password+key, { maxAge: 900000, httpOnly: false});
        res.redirect(req.body.page);
        return;
    } else {
        res.send("You mistyped the captcha!");
        return;
    }
});

app.get('/', function(req, res) {
    res.sendfile('home.html');
});


app.get('/chat/:id([a-z0-9]+)', function(req, res) {
    if (boards.indexOf(req.params.id) < 0){
        res.send("Does not exist :(");
        return;
    }
    res.sendfile('index.html');
    return;
});

app.get('/data/:id([a-z0-9]+)', function(req, res) {
    if (req.params.id == "all") {
        res.json(curr_chat);
        return;
    }
    if (boards.indexOf(req.params.id) < 0) {
        res.send("Does not exist :(");
        return;
    }
    if (!data_chat[req.params.id]) {
        data_chat[req.params.id] = [];
    }
    res.json(data_chat[req.params.id]);
});

app.post('/ban/:id([a-z0-9]+)', function(req, res, next){
    var board = req.params.id;
    var ip = req.query.ip;
    var hash = crypto.createHash('md5').update(req.body.name.substr(req.query.password)).digest('base64').slice(0,10);
});

app.get('/delete/:id([a-z0-9]+)', function(req, res, next){
    var board = req.params.id;
    var ip = req.query.ip;
    var hash = crypto.createHash('md5').update(req.body.name.substr(req.query.password)).digest('base64');
    if (hash == '8lnTmt7BmowWekVPb9wLog==')
        console.log('works');
});

app.post('/chat/:id([a-z0-9]+)', function(req, res, next) {
    if (boards.indexOf(req.params.id) < 0){
        res.send("Does not exist :(");
        return;
    }
    
    var data = {};
    
    var ipAddr = req.headers["x-forwarded-for"];
    if (ipAddr){
        var list = ipAddr.split(",");
        req.connection.remoteAddress = list[list.length-1];
    } else {
        req.connection.remoteAddress = req.connection.remoteAddress;
    }
    
    
    if(req.files.image.size == 0 || invalid_extension(req.files.image.path)) {
         fs.unlink(req.files.image.path);
         console.log("DELETED");
     } else {
         console.log('image loaded to', req.files.image.path);
         data.image = req.files.image.path;
     }

     if (!req.cookies['password_livechan']) {
         res.json({failure:"session expiry"});
         return;
     }

    // find should be password to prevent identity fraud 
    var info = req.headers['user-agent']+req.connection.remoteAddress+req.cookies['password_livechan'].slice(-11);
    var password = crypto.createHash('sha1').update(info).digest('base64').toString();
    var user_pass = req.cookies['password_livechan'].slice(0,-11);
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
    

    if (req.body.convo) {
        if(req.body.convo.length > 40) {
            req.body.convo = req.body.convo.substring(0,39)+"...";
        }
        data.convo = req.body.convo;
    }
    else
        data.convo = 'General';

    /* passed most tests, make data object */
    var trip_index = req.body.name.indexOf("#");

    if(trip_index > -1) {
        var tripcode = require('tripcode');
        data.trip = "!"+tripcode(req.body.name.substr(trip_index+1));
        req.body.name = req.body.name.slice(0,trip_index);
    }

    if(data.trip != "!CnB7SkWsyx") {
        /* update hash cool down */
        if(user_pass in hash_list) {
            if(hash_list[user_pass] >= 1 && hash_list[user_pass] <= 100000){
                hash_list[user_pass] *= 2; 
            }
            console.log("hash", hash_list[user_pass]);
            res.json({failure:"sorry a similar hash has been used and you must wait "+hash_list[user_pass]+" seconds due to bandwidth"});
            return;
        } else {
            hash_list[user_pass] = 5; // to do fix cooldowns
        }

        /* update ip cool down */
        if(req.connection.remoteAddress in ips) {
            if(ips[req.connection.remoteAddress] >= 1 && hash_list[user_pass] <= 100000){
                ips[req.connection.remoteAddress] *= 2; 
            }
            console.log("IP", ips[req.connection.remoteAddress]);
            res.json({failure:"ip cool down violation. now "+ips[req.connection.remoteAddress]+" seconds"});
            return;
        } else {
            ips[req.connection.remoteAddress] = 0;
        }


        if(req.body.body != ""){
            if(already_exists(req.body.body, req.params.id) || /^\s+$/.test(req.body.body)){
                console.log("exists");
                res.json({failure:"post exists"});
                return;
            }
        }

    }
    data.body = req.body.body;
    data.name = req.body.name ? req.body.name : "Anonymous";

    count++;
    data.count = count;
    data.date = (new Date).toString();
    data.ip = req.connection.remoteAddress;

    add_to_chat(data, req.params.id);

    data.ip = 'hidden';
    data.chat = req.params.id;

    res.json({success:"SUCCESS", id:data.count});
    
    io.sockets.in(req.params.id).emit('chat', data);
    io.sockets.in('all').emit('chat', data);
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

