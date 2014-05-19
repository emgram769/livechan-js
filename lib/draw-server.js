var http = require('http');
var https = require('https');
var express = require('express');
var fs = require('fs');
var config = require('../config');
var path = require('path');
var sys = require('sys');
var exec = require('child_process').exec;
var Canvas = require('canvas')
  , canvas = new Canvas(2500,1500)
  , ctx = canvas.getContext('2d');

var check_password = require('./utils/check-password');

var root = path.join(__dirname, '..');
var port = process.env.PORT || 5000;
var binary_file = "public/draw.jpg";
binary_file = path.join(root, binary_file);

try {
	var old_image = new Canvas.Image;
	old_image.src = binary_file;
	ctx.drawImage(old_image, 0, 0);
} catch (e) {
	console.log(e);
}

var salt_file = path.join(root, config.salt_file);
var ca_file = path.join(root, config.ssl.ca);
var key_file = path.join(root, config.ssl.key);
var cert_file = path.join(root, config.ssl.cert);

var app = express();

var server;
if (fs.existsSync(key_file) && fs.existsSync(cert_file) && false) {
    var options = {
        key:  fs.readFileSync(key_file),
        cert: fs.readFileSync(cert_file)
    };
    if (fs.existsSync(ca_file)) {
        options.ca = fs.readFileSync(ca_file);
    }
    console.log('Running secure server');
    server = https.createServer(options, app);
} else {
    console.log('Missing certificate or private key');
    console.log('Running with insecure server');
    server = http.createServer(app);
}
server.listen(port, function() {
    console.log('Express server listening on port %d',
                server.address().port);
});

var io = require('socket.io').listen(server);

var max_length = 5000;
var curr_image = "";
var image_size = 200.0;
var user_dict = {};
var max_quota = 8000;
var quota_interval = 100;
var clear_vote = 0;
var max_clear_vote = 20;
var voted = {};

function draw_pt(p) {
    var stroke_type = p.stroke_type ? p.stroke_type : "normal";
    var r = p.r ? p.r : '0';
	var g = p.g ? p.g : '0';
    var b = p.b ? p.b : '0';
    ctx.strokeStyle = "rgba("+r+", "+g+", "+b+", 1.0)";
	ctx.lineJoin = ctx.lineCap = 'round';
	
	switch (stroke_type) {
		case "3dim":
			ctx.lineWidth = 3;
			for (var i = 0; i < 10; i++){
				ctx.beginPath();
				ctx.strokeStyle = "rgba("+r+", "+g+", "+b+", "+(1.0-0.1*i)+")";
			    ctx.moveTo(p.prevX+i, p.prevY+i);
			    ctx.lineTo(p.currX+i, p.currY+i);
			    ctx.stroke();
			}
		case "normal":
		default:
		    ctx.lineWidth = 5;
		    ctx.beginPath();
			ctx.moveTo(p.prevX, p.prevY);
			ctx.lineTo(p.currX, p.currY);
			ctx.stroke();
   			break;
	}


    ctx.closePath();
    /*
	ctx.strokeStyle = "rgba("+r+", "+g+", "+b+", 1.0)";
    //ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.closePath();*/
}

function draw_char(c, color) {
	var text_width = c.c.length * 14.45;
	ctx.fillStyle = "#FFFFFF";
	ctx.fillRect(c.currTextX, c.currTextY+5, text_width, -23);
    ctx.font = 'bold 18pt Courier';
    ctx.fillStyle = color ? color : 'black';
    if (c.c[0] == ">")
    	ctx.fillStyle = 'green';
    ctx.fillText(c.c, c.currTextX, c.currTextY);
}

function draw_image(image_data) {
	var load_image = new Canvas.Image();
    load_image.src = image_data.src;
	var scale_factor = load_image.height > load_image.width ? image_size/load_image.height : image_size/load_image.width;
	ctx.drawImage(load_image, image_data.x, image_data.y,
  				scale_factor*load_image.width,
  				scale_factor*load_image.height);  
}

var flag = false
function check_quota(cost, id) {
    if (!user_dict[id])
        return false;
	var gain = (Date.now() - user_dict[id][0]) * 20 / quota_interval + user_dict[id][1];
	var user_quota = gain > max_quota ? max_quota - cost : gain - cost;
	user_dict[id][0] = Date.now();
	user_dict[id][1] = user_quota;
	if (user_dict[id][1] <= 0) {
		console.log("over quota", id);
		user_dict[id][1] -= 4000;
		return false;
	} else {
		return true;
	}
}

function draw_canvas(data, socket){
	var can_send = true;
	var data_out = [];
    var socket_ip = (socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address);
	for (i in data) {
		if (data[i] && data[i].type){
		try {
		switch (data[i].type) {
			case "word":
				if (can_send = can_send && check_quota(100*data[i].c.length,
                        socket_ip)) {
					draw_char(data[i]);
					data_out.push(data[i]);
				}
				break;
			case "stroke":
				var size = 2*(Math.abs(data[i].prevX-data[i].currX)+Math.abs(data[i].prevY-data[i].currY));
				if (can_send = can_send && check_quota(size, 
                        socket_ip)) {
					draw_pt(data[i]);
					data_out.push(data[i]);
				}
				break;
			case "image":
                break;
				if (can_send = can_send && check_quota(4000, 
                        socket_ip)) {
					draw_image(data[i]);
					data_out.push(data[i]);
				}
				/*if (user_dict[socket.id][0] + 10000 < Date.now()){
					user_dict[socket.id][0] = Date.now();
				} else {
					console.log("too soon!");
					return;
				}*/
					
				break;
			case "vote":
				if (typeof(data[i].clear)==="undefined" || !(data[i].clear == 0 || data[i].clear == 1)) {
                    console.log("invalid data clear value", socket.id, socket_ip);
                    break;
                }
                else if (Object.keys(voted).indexOf(socket_ip)>-1
					&& voted[socket_ip] == data[i].clear) {
					console.log("already voted", socket.id, socket_ip);
					break;
				}
				voted[socket_ip] = data[i].clear;
				clear_vote+=-1+2*(data[i].clear > 0);
				if (clear_vote > max_clear_vote){
                    console.log("sreen cleared by", socket_ip);
					clear_screen();
				} else {
					data_out.push(data[i]);
				}
				break;
			case "notification":
				check_password(data[i].password, function(err, matches) {
					if (err) return console.log(err);
					if (!matches) return console.log('wrong password');
					console.log(data[i].message);
					io.sockets.emit('server', [data[i]]);
				});
				break;
			case "force_clear":
				check_password(data[i].password, function(err, matches) {
					if (err) return console.log(err);
					if (!matches) return console.log('wrong password');
					clear_screen();
				});
				break;
		}} catch(e) {
			console.log(e);
		}
		}
	}
	if (data_out.length > 0) {
		socket.broadcast.emit('server', data_out);
	}
	if (!can_send) {
		console.log("limit was reached on id: ", socket.id, socket_ip);
	}
	flag = true;
}

function clear_screen() {
	clear_vote = 0;
	ctx.fillStyle="#FFFFFF";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	io.sockets.emit('server', [{type:"clear_screen"}]);
	io.sockets.emit('server', [{type:"init_vote", clear:clear_vote}]);
	draw_to_binary();
	delete voted;
	voted = {};
}

function puts(error, stdout, stderr) { sys.puts(stdout) }

function draw_to_binary(){
		if (!flag) {
            setTimeout(draw_to_binary, 5000);
			return;
        }

        var tmp_binary = "tmp.jpg";
		var out = fs.createWriteStream(tmp_binary);
		
		var stream = canvas.jpegStream({
		    bufsize: 4096 // output buffer size in bytes, default: 4096
		  , quality: 75 // JPEG quality (0-100) default: 75
		  , progressive: false // true for progressive compression, default: false
		});
		
		stream.on('data', function(chunk){
		  out.write(chunk);
		});
		
		stream.on('end', function(){
		  console.log('saved png');
          var command = "mv "+tmp_binary+" "+binary_file;
          exec(command, puts);

		  setTimeout(draw_to_binary, 15000);
		});

		flag = false;
}

draw_to_binary();

var clearX = 0;
var clearY = 10;

function clearbot(){
	if (clear_vote < (max_clear_vote/2))
		return;
	clearX+=28;
	if (clearX >= canvas.width) {
		clearY+=14;
		if (clearY >= canvas.height)
			clearY = 0;
		clearX = 0;
	}
	var clearBlock = {
		type:"word",
		currTextX:clearX,
		currTextY:clearY,
		c:"   >"
	}
	draw_char(clearBlock);
	io.sockets.emit('server', [clearBlock]);
}

setInterval(clearbot, 500);

io.set('log level', 1);
io.sockets.on('connection', function (socket) {
  //socket.emit('init_draw', {image: curr_image});
  user_dict[(socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address)] = [Date.now(), max_quota];
  socket.emit('server', [{type:"init_vote", clear:clear_vote}]);
  console.log("User joined for a total of %d", Object.keys(user_dict).length);
  max_clear_vote = Math.floor(0.6*io.sockets.clients().length);
  var user_count = Object.keys(user_dict).length;
  io.sockets.emit('server', [{type:"user_count", count:user_count}]);
  socket.on('client', function (data) {
    try {
    	draw_canvas(data, socket);
    } catch (e) {
	    console.log(e);
    }
  });
  socket.on('disconnect', function(){
	  delete user_dict[(socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address)];
	  var user_count = Object.keys(user_dict).length;
	  io.sockets.emit('server', [{type:"user_count", count:user_count}]);
  })
});
