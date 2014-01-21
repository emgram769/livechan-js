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
var board_fields = 'chat name body convo convo_id count date image image_filename image_filesize image_width image_height thumb trip';

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
    thumb: String,
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

/* set counter to newest post */

chat_db.findOne().sort({
    count: -1
}).exec(function (e, d) {
    "use strict";
    if (d) {
        count = d.count;
    }
});

/* helper functions */

function get_extension(filename) {
    "use strict";
    var i = filename.lastIndexOf('.');
    return (i < 0) ? '' : filename.substr(i + 1).toLowerCase();
}

function invalid_extension(filename) {
    "use strict";
    var test = ['jpg', 'jpeg', 'png', 'gif'].indexOf(get_extension(filename));
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
        if (d.thumb) fs.unlink(d.thumb);
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
	calls format_chat(req, res, next, add_to_chat) on success
*/
function check_ip_validity(req, res, next) {

	/* get IP */
	
	var ip_addr = req.headers["x-forwarded-for"];
    if (ip_addr) {
        var list = ip_addr.split(",");
        req.connection.remoteAddress = list[list.length - 1];
    }
    
    /* lookup IP */
    
    user_db.find({ip:req.connection.remoteAddress})
    	   .sort({last_post:-1})
    	   .exec(function (e, d) {
    	   		console.log(d);
    	   		if(e) {
	    	   		res.json({ failure: "session_expiry" });
	    	   		return;
    	   		}
                else if(d[0]) {
	                if (req.cookies.password_livechan != d[0].session_key) {
						res.json({ failure: "session_expiry" });
						return;
	                } else if ((d[0].last_post.getTime() + 5000) > (new Date).getTime()) {
	                	var now = new Date;
		                user_db.update(
								{ _id: d[0]._id },
								{ $set: {last_post: now.setTime(now.getTime() + 10000)}},
								function(){
									res.json({ failure: "countdown_violation" });
									return;
								});						
						return;
					} else if (d[0].banned_rooms.indexOf(req.params.id) > -1) {
						res.json({ failure: "ban_violation" });
						return;
	                } else {
	                	var now = new Date;
	                	user_db.update(
							{ _id: d[0]._id },
							{ $set: {last_post: now}},
							function(){
							
								console.log("formatting image...");
								format_image(req, res, next, add_to_chat);
								
							});
	                	/* update cool down here */
	                }
                } else {
	                res.json({ failure: "session_expiry" });
	    	   		return;
                }
            });
}

/* format_image
	- checks for image and sets data accordingly
	calls generate_thumbnail(req, res, next, data, callback) in case of image
	skips to format_post(req, res, next, data, callback) otherwise
*/	
function format_image(req, res, next, callback) {

	var data = {}; /* to be stored in db and passed to clients */

	/* no image uploaded */
	
	if (req.files.image.size === 0 || invalid_extension(req.files.image.path)) {
	
        fs.unlink(req.files.image.path); /* delete blank file */
        
        if (/^\s*$/.test(req.body.body)) {
        
            res.json({ failure: "nothing substantial submitted" });
            return;
            
        } else {
        
	       	console.log("formatting post...");
			format_post(req, res, next, data, callback)

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
                data.image_filesize = fs.statSync(data.image).size;
                data.image_width = dimensions.width;
                data.image_height = dimensions.height;
            }

			console.log("generating thumbnail...");
			generate_thumbnail(req, res, next, data, callback)

        });
    }

	
}

/* generate_thumbnail
	- generates thumbnail for image
	calls format_post(req, res, next, data, callback) on completion
*/
function generate_thumbnail(req, res, next, data, callback) {
    var scale = Math.min(250/data.image_width, 100/data.image_height, 1);
    var thumb_width = scale * data.image_width;
    var thumb_height = scale * data.image_height;
    data.thumb = "public/tmp/thumb/" + data.image.match(/([\w\-]+)\.\w+$/)[1] + ".jpg";

    gm(data.image)
        .out("-delete", "1--1") // use first frame only; only needed for ImageMagick
        .thumb(thumb_width, thumb_height, data.thumb, function(err) {
            if (err) {
                console.log("thumbnail creation error", err);
                return;
            }
            console.log("formatting post...");
            format_post(req, res, next, data, callback);
        });
}

/* format_post:
	- checks for text violations
	- generates tripcode
	calls callback(data) on success
*/
function format_post(req, res, next, data, callback) {	
	    
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
                /* cool down increase */
            } else {
                data.is_convo_op = false;
                data.convo_id = convo_ent.count;
            }
            callback(data);
        });
    } else {
        callback(data);
    }

	console.log("everything done.");


	/* give the client information about the post */
    res.json({
        success: "success_posting",
        id: data.count
    });
    
    return;
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
        res.cookie('password_livechan', password, {
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
		
		var now = new Date;

        var data = {
            session_key: password,
            ip: req.connection.remoteAddress,
            last_post: now.setTime(now.getTime() - 6000)
        };

        new user_db(data).save(function () {
            /*user_db.find().exec(function (e, d) {
                console.log("session found", e, d);
            });*/
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
    } else {
        search.chat = req.params.id;
        limit = 100;
        fields = board_fields;
    }
    if (req.params.ops === "_convo") {
        search.is_convo_op = true;
        limit = 20;
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
    var hash = crypto.createHash('sha1').update(req.body.name.substr(req.query.password)).digest('base64').slice(0, 10);
});

app.get('/delete/:password([a-z0-9]+)/:id([0-9]+)', function (req, res, next) {
    "use strict";
    var chat_id = req.params.id;
    var password = req.params.password;

	var hash_pass = crypto.createHash('sha1').update(password).digest('base64');
	
	if (hash_pass!="Nqesm9E+3GXfOG0KgJq8YmizCho="){
		console.log("ATTEMPTED PASS", password);
		res.json({failure:"wrong password"});
		return;
	}
	
	chat_db.update(
    	{count:chat_id},
    	{$set:
    		{body:"deleted",
    		convo:"General",
    		name:"deleted",
    		image_filename:""}
    	},function(err){
	    	if(!err) {
		    	chat_db.find({count:chat_id},
		    		function(e,d){
			    		if(d[0] && d[0].image) {
				    		fs.unlink(d[0].image);
				    		fs.unlink(d[0].thumb);
			    		}
			    		d[0].image = "";
						add_to_chat(d[0]);
					})
	    	}
    	});
    
    res.json({success:"deleted "+chat_id});
    
});

app.post('/chat/:id([a-z0-9]+)', function (req, res, next) {
    "use strict";
    res.type("text/plain");
    check_ip_validity(req, res, next);
    return;
});

/* join a chat room */
io.sockets.on('connection', function (socket) {
    "use strict";
    socket.emit('request_location', "please return a chat room");
    socket.on('subscribe', function (data) {
        socket.join(data);
    });
});
