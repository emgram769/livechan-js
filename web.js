/* required modules */
var express = require("express");
var logfmt = require("logfmt");
var http = require('http');
var crypto = require('crypto');
var ipfilter = require('ipfilter');
var captcha = require('captcha');
var tripcode = require('tripcode');
var fs = require('fs');
var format = require('util').format;
var mongoose = require('mongoose');
var gm = require('gm').subClass({
    imageMagick: true // Necessary for hosted version, remove if you're using graphicmagick
});

/* salt */
var securetrip_salt = "AVEPwfpR4K8PXQaKa4PjXYMGktC2XY4Qt59ZnERsEt5PzAxhyL";

fs.readFile('salt.txt', 'utf8', function (err, data) {
    "use strict";
    if (!err) {
        securetrip_salt = data;
    }
});

/* initialize app */
var app = express();
var port = process.env.PORT || 5000;

/* listen now */
var server = http.createServer(app).listen(port, function () {
    "use strict";
    console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});
var io = require('socket.io').listen(server);

/* set up db */
mongoose.connect('mongodb://localhost/livechan_db');
var Schema = mongoose.Schema;


/* 5mb limit */
app.use(express.limit('5mb'));

/* for saving images */
app.use(express.bodyParser({
    uploadDir: 'public/tmp/uploads',
    keepExtensions: true
}));

/* blocked nodes. this file can include more */
fs.readFile('tor_list.txt', 'utf8', function (err, data) {
    "use strict";
    if (err) {
        return;
    }
    var tor_list = data.split("\n"); // IP per line
    app.use(ipfilter(tor_list));
});

/* logging */
app.use(logfmt.requestLogger());

/* serve public data (/public/*) and get cookies */
app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser());
app.use(express.cookieSession({
    secret: 'keyboard-cat'
}));

/* captcha security */
app.use(captcha({
    url: '/captcha.jpg',
    color: '#0064cd',
    background: 'rgb(20,30,200)'
}));

/* stored data in memory */
var count;
var hash_list = [];
var session_list = [];
var ips = {};
var boards = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'gif', 'h', 'hr', 'k', 'm', 'o', 'p', 'r', 's', 't', 'u', 'v', 'vg', 'vr', 'w', 'wg', 'i', 'ic', 'r9k', 's4s', 'cm', 'hm', 'lgbt', 'y', '3', 'adv', 'an', 'asp', 'cgl', 'ck', 'co', 'diy', 'fa', 'fit', 'gd', 'hc', 'int', 'jp', 'lit', 'mlp', 'mu', 'n', 'out', 'po', 'pol', 'sci', 'soc', 'sp', 'tg', 'toy', 'trv', 'tv', 'vp', 'wsg', 'x', 'dev'];

/* database fields to transmit */
var all_fields = 'chat name body convo convo_id count date trip';
var board_fields = 'chat name body convo convo_id count date image image_filename image_filesize image_width image_height trip';

/* db schema */
var chat_schema = new Schema({
    convo: String,
    convo_id: Number,
    is_convo_op: Boolean,
    body: String,
    name: String,
    count: {
        type: Number,
        unique: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    ip: String,
    chat: String,
    image: String,
    image_filename: String,
    image_filesize: Number,
    image_width: Number,
    image_height: Number,
    trip: String
});

var user_schema = new Schema({
    date: { /* user session expires every 24 hours */
        type: Date,
        default: Date.now,
        expires: '24h'
    },
    ip: String,
    session_key: String,
    last_post: {
        type: Date,
        default: Date.now
    },
    banned_rooms: Array /* list of rooms the user is banned from */
});

var chat_db = mongoose.model('chat_db', chat_schema);
var user_db = mongoose.model('user_db', user_schema);

user_db.remove({}, function (err) {
    "use strict";
    if (err) {
        return;
    }
    console.log('session_db reset');
});

/* set counter to newest post */
chat_db.findOne().sort({
    count: -1
}).exec(function (e, d) {
    "use strict";
    if (d) {
        count = d.count;
    }
});

function demote_ips() {
    "use strict";
    var i = 0;
    for (i in ips) {
        if (ips[i] === 0) {
            delete ips[i];
        } else {
            ips[i]--;
        }
    }
    for (i in hash_list) {
        if (hash_list[i] === 0) {
            delete hash_list[i];
        } else {
            hash_list[i]--;
        }
    }
}

setInterval(demote_ips, 1000);

/* helper functions */
function get_extension(filename) {
    "use strict";
    var i = filename.lastIndexOf('.');
    return (i < 0) ? '' : filename.substr(i + 1).toLowerCase();
}

function invalid_extension(filename) {
    "use strict";
    var test = ['jpg', 'jpeg', 'png', 'gif'].indexOf(get_extension(filename));
    console.log("INDEX IS", get_extension(filename), test);
    if (test > -1) {
        return false;
    }
    return true;
}

function delete_posts(e, ds) {
    "use strict";
    if (e) {
        console.log("chat find error", e);
        return;
    }
    ds.forEach(function(d) {
        if (d.image) fs.unlink(d.image);
        d.remove(function(e2) {console.log("chat removal error",e2);});
    });
}

function send_data(room, event, data, fields) {
    "use strict";
    var fields_array = fields.split(" ");
    var data2 = {};
    for (var key in data) {
        if (fields_array.indexOf(key) > -1) {
            data2[key] = data[key];
        }
    }
    io.sockets.in(room).emit(event, data2);
}

function add_to_chat(data) {
    "use strict";
    send_data(data.chat, 'chat', data, board_fields);
    send_data('all', 'chat', data, all_fields);

    /* store in the db */
    chat_db.update({count: data.count}, data, {upsert: true}, function(err) {
        if (err) {
            console.log("chat save error", err);
            return;
        }
        chat_db.find({chat: data.chat, is_convo_op: false})
            .sort({count: -1})
            .skip(100)
            .exec(delete_posts);
        chat_db.find({chat: data.chat, is_convo_op: true})
            .sort({count: -1})
            .skip(100)
            .exec(delete_posts);
    });
}

function session_exists(session) {
    "use strict";
    if (user_db.count({
        session_key: session
    })) {
        return true;
    }
    return false;
}

/* check_ip_validity:
	- checks if ip is banned
	- checks session validity
	- checks cool down 
	calls callback(req, res, next, callback) on success
*/
function check_ip_validity(req, res, next, callback) {

	/* get IP */
	
	var ip_addr = req.headers["x-forwarded-for"];
    if (ip_addr) {
        var list = ip_addr.split(",");
        req.connection.remoteAddress = list[list.length - 1];
    }
    
    /* lookup IP */
    
    user_db.find({ip:req.connection.remoteAddress})
    	   .exec(function (e, d) {
    	   		if(e) {
	    	   		res.json({ failure: "session_expiry" });
	    	   		return;
    	   		}
                else if(d) {
	                if (req.cookies.password_livechan != d.session_key) {
						res.json({ failure: "session_expiry" });
						return;
	                } else if ((d.last_post.getTime() + 6) > (new Date).now.getTime()) {
						res.json({ failure: "countdown_violation" });
						return;
					} else if (d.banned_rooms.indexOf(req.params.id) > -1) {
						res.json({ failure: "ban_violation" });
						return;
	                } else {
	                	/* update cool down here */
		                callback(req, res, next, callback);
	                }
                } else {
	                res.json({ failure: "unknown_error" });
	    	   		return;
                }
            });
}

/* format_post:
	- checks for image and sets data accordingly
	- checks for text violations
	- generates tripcode
	calls callback(data) on success
*/
function format_post(req, res, next, callback) {

	var data; /* to be stored in db and passed to  */
	
	/* no image uploaded */
	
	if (req.files.image.size === 0 || invalid_extension(req.files.image.path)) {
        fs.unlink(req.files.image.path); /* delete blank file */
        if (/^\s*$/.test(req.body.body)) {
            res.json({ failure: "nothing substantial submitted" });
            return;
        }
    }
    
    /* image uploaded */
    
    else {
        gm(req.files.image.path).size(function (err, dimensions) {
            if (err) {
                console.log("gm size error", err);
                return;
            }
            
            if (dimensions.height > 0 && dimensions.width > 0) {
                data.image = req.files.image.path;
                data.image_filename = req.files.image.originalFilename;
                data.image_filesize = fs.statSync(idata.image).size;
                data.image_width = dimensions.width;
                data.image_height = dimensions.height;
            }
        });
    }
    
    /* length checks */
    
    if (req.body.body.length > 400) {
        req.body.body = req.body.body.substring(0, 399) + "...";
    }

    if (req.body.body.split("\n").length > 7) {
        req.body.body = req.body.body.split("\n", 7).join("\n");
    }

    if (req.body.name.length > 40) {
        req.body.name = req.body.name.substring(0, 39) + "...";
    }

    if (req.body.convo) {
        if (req.body.convo.length > 40) {
            req.body.convo = req.body.convo.substring(0, 39) + "...";
        }
    } else {
        req.body.convo = 'General'; /* default conversation */
    }

	/* generate tripcode */
	
    var trip_index = req.body.name.indexOf("#");
	var trip;
	
    if (trip_index > -1) {
        var trip = req.body.name.substr(trip_index + 1);
        var secure = trip.indexOf("#") === 0;
        if (secure) {
            trip = crypto.createHash('sha1').update(trip.substr(1) + 
            		securetrip_salt).digest('base64').toString();
        }

        data.trip = (secure ? "!!" : "!") + tripcode(trip);
        req.body.name = req.body.name.slice(0, trip_index);
    }
    
    /* everything looks good, we can safely add this chat */
    
    count++; /* counter has been promoted */

    data.count = count;
    data.convo = req.body.convo;
	data.body = req.body.body;
    data.name = req.body.name || "Anonymous";
    data.date = (new Date()).toString();
    data.ip = req.connection.remoteAddress;
    data.chat = req.params.id;
    
    
    /* determine if OP of conversation topic */
    if (data.convo && data.convo !== "General") {
        chat_db.findOne({
            convo: data.convo,
            chat: data.chat,
            is_convo_op: true
        }).exec(function (err, convo_ent) {
            if (!convo_ent) {
                data.is_convo_op = true;
                data.convo_id = data.count;
            } else {
                data.is_convo_op = false;
                data.convo_id = convo_ent.count;
            }
            callback(data);
        });
    } else {
        callback(data);
    }

	/* give the client information about the post */
    res.json({
        success: "success_posting",
        id: data.count
    });
    
    return;
}

function handleChatPost(req, res, next, image) {
    "use strict";
    
    if (boards.indexOf(req.params.id) < 0) {
        res.send("Does not exist :(");
        return;
    }

    var data = {};

    var ip_addr = req.headers["x-forwarded-for"];
    if (ip_addr) {
        var list = ip_addr.split(",");
        req.connection.remoteAddress = list[list.length - 1];
    }

    if (req.files.image.size === 0 || invalid_extension(req.files.image.path)) {
        fs.unlink(req.files.image.path);
        console.log("DELETED");
        if (/^\s*$/.test(req.body.body)) {
            res.json({
                failure: "nothing substantial submitted"
            });
            return;
        }
    } else {
        if (image === null) {
            gm(req.files.image.path).size(function (err, dimensions) {
                if (err) {
                    console.log("gm size error", err);
                    return;
                }
                var idata = {
                    image: "null"
                };
                if (dimensions.height > 0 && dimensions.width > 0) {
                    console.log('image loaded to ', req.files.image.path);
                    idata.image = req.files.image.path;
                    idata.image_filename = req.files.image.originalFilename;
                    idata.image_filesize = fs.statSync(idata.image).size;
                    idata.image_width = dimensions.width;
                    idata.image_height = dimensions.height;
                }
                console.log("FILE SIZE",idata.image_filesize);
                handleChatPost(req, res, next, idata);
            });
            return;
        }
        console.log('image fully loaded to ', req.files.image.path);
        if (image.image && image.image !== null) {
            data.image = image.image;
            data.image_filename = image.image_filename;
            data.image_filesize = image.image_filesize;
            data.image_width = image.image_width;
            data.image_height = image.image_height;
        }
    }

    if (!req.cookies.password_livechan) {
        res.json({
            failure: "session expiry"
        });
        return;
    }

    // find should be password to prevent identity fraud 
    var info = req.headers['user-agent'] + req.connection.remoteAddress + req.cookies.password_livechan.slice(-11);
    var password = crypto.createHash('sha1').update(info).digest('base64').toString();
    var user_pass = req.cookies.password_livechan.slice(0, -11);

    if (req.body.body.length > 400) {
        req.body.body = req.body.body.substring(0, 399) + "...";
    }

    if (req.body.body.split("\n").length > 7) {
        req.body.body = req.body.body.split("\n", 7).join("\n");
    }

    if (req.body.name.length > 40) {
        req.body.name = req.body.name.substring(0, 39) + "...";
    }

    if (req.body.convo) {
        if (req.body.convo.length > 40) {
            req.body.convo = req.body.convo.substring(0, 39) + "...";
        }
        data.convo = req.body.convo;
    } else {
        data.convo = 'General';
    }

    var trip_index = req.body.name.indexOf("#");

    if (trip_index > -1) {
        var trip = req.body.name.substr(trip_index + 1);
        var secure = trip.indexOf("#") === 0;
        if (secure) {
            trip = crypto.createHash('sha1').update(trip.substr(1) + securetrip_salt).digest('base64').toString();
        }

        data.trip = (secure ? "!!" : "!") + tripcode(trip);
        req.body.name = req.body.name.slice(0, trip_index);
    }

    if (data.trip !== "!KRBtzmcDIw") {
        /* update hash cool down */
        if (hash_list[user_pass] !== undefined) {
            if (hash_list[user_pass] >= 1 && hash_list[user_pass] <= 100000) {
                hash_list[user_pass] *= 2;
            }
            console.log("hash", hash_list[user_pass]);
            res.json({
                failure: "sorry a similar hash has been used and you must wait " + hash_list[user_pass] + " seconds due to bandwidth"
            });
            return;
        }
        hash_list[user_pass] = 5; // to do fix cooldowns

        /* update ip cool down */
        if (ips[req.connection.remoteAddress] !== undefined) {
            if (ips[req.connection.remoteAddress] >= 1 && hash_list[user_pass] <= 100000) {
                ips[req.connection.remoteAddress] *= 2;
            }
            console.log("IP", ips[req.connection.remoteAddress]);
            res.json({
                failure: "ip cool down violation. now " + ips[req.connection.remoteAddress] + " seconds"
            });
            return;
        }
        
        ips[req.connection.remoteAddress] = 0;

    }
    data.body = req.body.body;
    data.name = req.body.name || "Anonymous";

    count++;
    data.count = count;
    data.date = (new Date()).toString();
    data.ip = req.connection.remoteAddress;
    data.chat = req.params.id;
    //if (port == 80)
    if (data.convo && data.convo !== "General") {
        chat_db.findOne({
            convo: data.convo,
            chat: data.chat,
            is_convo_op: true
        }).exec(function (err, convo_ent) {
            if (!convo_ent) {
                data.is_convo_op = true;
                data.convo_id = data.count;
            } else {
                data.is_convo_op = false;
                data.convo_id = convo_ent.count;
            }
            add_to_chat(data);
        });
    } else {
        add_to_chat(data);
    }

    res.json({
        success: "SUCCESS",
        id: data.count
    });
}


/* REQUESTS */

app.get('/login', function (req, res) {
    "use strict";
    res.send('<html><head><meta name="viewport" content="width=device-width,user-scalable=no"><link type="text/css" rel="stylesheet" href="style.css"></head><body><div class="center container"><div>Please prove you aren\'t a robot</div><br/><img src="/captcha.jpg"/><form action="/login" method="post"><br/><input type="text" name="digits"/><input type="hidden" name="page" value="' + req.query.page + '"/></form></div></body></html>');
});

app.post('/login', function (req, res) {
    "use strict";
    res.type("text/plain");
    var ip_addr = req.headers["x-forwarded-for"];
    if (ip_addr) {
        var list = ip_addr.split(",");
        req.connection.remoteAddress = list[list.length - 1];
    }

    if (req.body.digits === req.session.captcha) {
        var key = (Math.random() * 1e17).toString(36);
        var info = req.headers['user-agent'] + req.connection.remoteAddress + key;
        var password = crypto.createHash('sha1').update(info).digest('base64').toString();
        console.log("password", password);
        res.cookie('password_livechan', password + key, {
            maxAge: 9000000,
            httpOnly: false
        });

        if (req.body.page) {
            res.redirect(req.body.page);
        } else {
            res.json({
                success: "captcha"
            });
        }

        var data = {
            session_key: password,
            ip: req.connection.remoteAddress
        };

        new user_db(data).save(function () {
            user_db.find().exec(function (e, d) {
                console.log("session found", e, d);
            });
        });

        return;
    }
    if (req.body.page) {
        res.send("You mistyped the captcha!");
    } else {
        res.json({
            failure: "You mistyped the captcha."
        });
    }
});

app.get('/', function (req, res) {
    "use strict";
    res.sendfile('home.html');
});

app.get('/chat/:id([a-z0-9]+)', function (req, res) {
    "use strict";
    if (boards.indexOf(req.params.id) < 0) {
        res.send("Does not exist :(");
        return;
    }
    res.sendfile('index.html');
    return;
});

app.get('/data:ops((?:_convo)?)/:id([a-z0-9]+)', function (req, res) {
    "use strict";
    if (req.params.id !== "all" && boards.indexOf(req.params.id) < 0) {
        res.send("Does not exist :(");
        return;
    }
    var search = {};
    var limit = 0;
    var fields = "";
    if (req.params.id === "all") {
        limit = 20;
        fields = all_fields;
    } else  {
        search.chat = req.params.id;
        limit = 100;
        fields = board_fields;
    }
    if (req.params.ops === "_convo") {
        search.is_chat_op = true;
    }
    chat_db.find(search)
        .sort({
            count: -1
        })
        .select(fields)
        .limit(limit)
        .exec(function (e, d) {
            if (!e) {
                res.json(d);
            } else {
                res.send('db_error');
            }
        });
});

app.post('/ban/:id([a-z0-9]+)', function (req, res, next) {
    "use strict";
    var board = req.params.id;
    var ip = req.query.ip;
    var hash = crypto.createHash('md5').update(req.body.name.substr(req.query.password)).digest('base64').slice(0, 10);
});

app.get('/delete/:id([a-z0-9]+)', function (req, res, next) {
    "use strict";
    var board = req.params.id;
    var ip = req.query.ip;
    var hash = crypto.createHash('md5').update(req.body.name.substr(req.query.password)).digest('base64');
    if (hash === '8lnTmt7BmowWekVPb9wLog==') {
        console.log('works');
    }
});

app.post('/chat/:id([a-z0-9]+)', function (req, res, next) {
    "use strict";
    res.type("text/plain");
    handleChatPost(req, res, next, null);
});

/* join a chat room */
io.sockets.on('connection', function (socket) {
    "use strict";
    socket.emit('request_location', "please return a chat room");
    socket.on('subscribe', function (data) {
        socket.join(data);
    });
});
