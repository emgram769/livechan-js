var https = require('https');
var express = require('express');
var fs = require('fs');
var config = require('../config');
var path = require('path');
var crypto = require('crypto');
var Canvas = require('canvas')
  , canvas = new Canvas(2500,1500)
  , ctx = canvas.getContext('2d');

var port = process.env.PORT || 5000;
var binary_file = port == 5000 ? "../public/draw.jpg" : "../public/draw"+port+".jpg";

try {
	var old_image = new Canvas.Image;
	old_image.src = binary_file;
	ctx.drawImage(old_image, 0, 0);
} catch (e) {
	console.log(e);
}

var root = path.join(__dirname, '..');
var salt_file = path.join(root, config.salt_file);
var ca_file = path.join(root, config.ssl.ca);
var key_file = path.join(root, config.ssl.key);
var cert_file = path.join(root, config.ssl.cert);

var app = express();


var secure_server;
    var options = {
        ca:   fs.readFileSync(ca_file),
        key:  fs.readFileSync(key_file),
        cert: fs.readFileSync(cert_file)
    };
    secure_server = https.createServer(options, app).listen(port, function() {
        console.log('Express secure_server listening on port %d',
                    secure_server.address().port);
    });

var io = require('socket.io').listen(secure_server);

var max_length = 5000;
var curr_image = "";
var image_size = 200.0;
var user_dict = {};
var max_quota = 8000;
var quota_interval = 100;
var clear_vote = 0;
var max_clear_vote = 20;
var voted = [];

function draw_pt(p) {
    ctx.beginPath();
    ctx.moveTo(p.prevX, p.prevY);
    ctx.lineTo(p.currX, p.currY);
    var r = p.r ? p.r : '0';
	var g = p.g ? p.g : '0';
    var b = p.b ? p.b : '0';
	ctx.strokeStyle = "rgba("+r+", "+g+", "+b+", 0.5)";
    //ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.closePath();
}

function draw_char(c, color) {
	var text_width = c.c.length * 14.45;
	ctx.fillStyle = "#FFFFFF";
	ctx.clearRect(c.currTextX, c.currTextY+5, text_width, -23);
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
	var gain = (Date.now() - user_dict[id][0]) * 5 + user_dict[id][1];
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
	for (i in data) {
		if (data[i] && data[i].type){
		try {
		switch (data[i].type) {
			case "word":
				if (can_send = can_send && check_quota(100*data[i].c.length, socket.id))
					draw_char(data[i]);
				break;
			case "stroke":
				var size = Math.abs(data[i].prevX-data[i].currX)+Math.abs(data[i].prevY-data[i].currY)
				if (can_send = can_send && check_quota(size, socket.id))
					draw_pt(data[i]);
				break;
			case "image":
				if (can_send = can_send && check_quota(4000, socket.id)) {
					draw_image(data[i]);
				}
				/*if (user_dict[socket.id][0] + 10000 < Date.now()){
					user_dict[socket.id][0] = Date.now();
				} else {
					console.log("too soon!");
					return;
				}*/
					
				break;
			case "vote":
				if (voted.indexOf(socket.handshake.address.address)>-1) {
					console.log("already voted", socket.id, socket.handshake.address.address);
					break;
				}
				voted.push(socket.handshake.address.address);
				clear_vote+=-1+2*(data[i].clear > 0);
				if (clear_vote > max_clear_vote){
					clear_screen();
				}
				break;
			case "notification":
				if (!data[i].password)
					break;
				var hash = crypto.createHash('sha1').update(data[i].password).digest('base64');
				if (hash == "smDUroieLIDqhiIHKEf51VHPXn8=") {
					console.log(data[i].message);
				} else {
					can_send = false;
				}
				break;
			case "force_clear":
				if (!data[i].password)
					break;
				var hash = crypto.createHash('sha1').update(data[i].password).digest('base64');
				if (hash == "smDUroieLIDqhiIHKEf51VHPXn8=") {
					clear_screen();
				} else {
					can_send = false;
				}
				break;
			default:
				can_send = false;
				break;
		}} catch(e) {
			console.log(e);
		}
		}
	}
	if (can_send) {
		socket.broadcast.emit('server', data);
	} else {
		console.log("limit was reached on id: ", socket.id, socket.handshake.address);
	}
	flag = true;
}

function clear_screen() {
	clear_vote = 0;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	io.sockets.emit('server', [{type:"clear_screen"}]);
	io.sockets.emit('server', [{type:"init_vote", clear:clear_vote}]);
	draw_to_binary();
	delete voted;
	voted = [];
}

function draw_to_binary(){
		/*if (!flag) {
            setTimeout(draw_to_binary,5000);
			return;
        }*/
		/*ctx.fillStyle = "rgba(255,255,255,"+0.01+")";
		ctx.fillRect(0, 0, canvas.width, canvas.height);*/
		curr_image = canvas.toDataURL();
		
		function decodeBase64Image(dataString) {
		  var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
		    response = {};
		
		  if (matches.length !== 3) {
		    return new Error('Invalid input string');
		  }
		
		  response.type = matches[1];
		  response.data = new Buffer(matches[2], 'base64');
		
		  return response;
		}
		var imageBuffer = decodeBase64Image(curr_image);
		
		fs.writeFile(binary_file, imageBuffer.data, function(err) {
		    if(err) {
		        console.log(err);
		    } else {
		        //console.log("The file was saved!");
		        setTimeout(draw_to_binary,10000);
            }
		}); 
		flag = false;
}

//setInterval(draw_to_binary, 5000); // refreshes the image and dims it
draw_to_binary();

var clearX = 0;
var clearY = 10;

function clear_block_generator(){
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

setInterval(clear_block_generator, 500);

io.set('log level', 1);
io.sockets.on('connection', function (socket) {
  //socket.emit('init_draw', {image: curr_image});
  user_dict[socket.id] = [Date.now(), max_quota];
  socket.emit('server', [{type:"init_vote", clear:clear_vote}]);
  console.log("User joined for a total of %d", io.sockets.clients().length);
  var user_count = io.sockets.clients().length;
  io.sockets.emit('server', [{type:"user_count", count:user_count}]);
  socket.on('client', function (data) {
    try {
    	draw_canvas(data, socket);
    } catch (e) {
	    console.log(e);
    }
  });
  socket.on('disconnect', function(){
	  delete user_dict[socket.id];
	  var user_count = io.sockets.clients().length;
	  io.sockets.emit('server', [{type:"user_count", count:user_count}]);
  })
});
