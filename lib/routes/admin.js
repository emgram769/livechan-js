'use strict';

var fs = require('fs');

var express = require('express');
var router = new express.Router();

var chat_db = require('../models/chat');
var user_db = require('../models/user');
var add_to_chat = require('../utils/add-to-chat');
var get_user_ip = require('../utils/get-user-ip');
var check_password = require('../utils/check-password');
var Socket = require('../socket');

router.post('/warn', function(req, res, next) {
	try {
	    var chat_id = req.body.id;
	    var password = req.body.password;
	    var reason = req.body.reason;
	
	    check_password(password, function(err, matches) {
	        if (err) {
	            console.log(err);
	            return res.json({failure: 'error validating password'});
	        }
	        if (!matches) {
	            console.log('wrong password');
	            return res.json({failure: 'wrong password'});
	        }
	
	        chat_db.find({count: chat_id},
	            function(e,d){
	                if(d[0] && d[0].ip) {
	                    var found = false;
	                    Socket.io.sockets.clients().forEach(function (socket) {
	                        if(socket.handshake.headers['x-forwarded-for'] != d[0].ip)
	                            return;
	                        socket.emit('alert', reason);
	                        found = true;
	                    });
	                    if(found){
		                    	console.log("WARN: IP: " + d[0].ip + " warning: " + reason + " pw: " + password);
	                        res.json({success: 'sent warning to user'});
	                    } else {
	                        res.json({failure: 'user not connected'});
	                    }
	                } else {
	                    res.json({failure: 'couldn\'t find ip'});
	                }
	            }
	        );
	    });
    } catch (e) {
	    return res.json({failure: e});
    }
});

router.post('/move', function (req, res, next) {
	try {
	    var chat_id = req.body.id;
	    var password = req.body.password;
	    var chat_room = req.body.chat_room;
	
	    check_password(password, function(err, matches) {
	        if (err) {
	            console.log(err);
	            return res.json({failure: 'error validating password'});
	        }
	        if (!matches) {
	            console.log('wrong password');
	            return res.json({failure: 'wrong password'});
	        }
	
	        return add_to_chat({count:chat_id, chat: chat_room}, function(e) {
	            if (e && e.message) return res.json({failure: e.message});
	            else if (e) return res.json({failure: "unknown error occurred"});
	            return res.json({success: "moved " + chat_id});
	        });
	    });
    } catch (e) {
	    return res.json({failure: e});
    }
});

router.post('/ban', function(req, res, next) {
	try {
	    var chat_id = req.body.id;
	    var password = req.body.password;
	    var board = req.body.board;
	
	    check_password(password, function(err, matches) {
	        if (err) {
	            console.log(err);
	            return res.json({failure: 'error validating password'});
	        }
	        if (!matches) {
	            console.log('wrong password');
	            return res.json({failure: 'wrong password'});
	        }
	
	        chat_db.find({count: chat_id},
	            function(e,d){
	                if(d[0] && d[0].ip) {
	                    user_db.update({ip:d[0].ip}, {
	                        $push:{
	                            banned_rooms: board,
	                            ban_offense: d[0].body
	                        }
	                    }, {multi: true}, function(err){
	                        if(!err) {
	                        	  console.log("BAN: IP: " + d[0].ip + " board: " + board + " pw: " + password);
	                            res.json({success: 'banned ' + d[0].ip + ' from ' + board});
	                        } else {
	                        		console.log('couldn\'t ban ' + d[0].ip + ' from ' + board);
	                            res.json({failure: 'couldn\'t ban ' + d[0].ip + ' from ' + board});
	                        }
	                    });
	                } else {
	                    res.json({failure: 'couldn\'t find ip'});
	                }
	            }
	        );
	    });
    } catch (e) {
	  	console.log('Unknown error: Couldn\'t ban ' + d[0].ip + ' from ' + board, e);
	    return res.json({failure: e});
    }
});

router.post('/delete', function(req, res, next) {
	try {
	    var chat_id = req.body.id;
		var password = req.body.password;
	    check_password(password, function(err, matches) {
	        if (err) {
	            console.log(err);
	            return res.json({failure: 'error validating password'});
	        }
	        if (!matches) {
	            console.log('wrong password');
	            return res.json({failure: 'wrong password'});
	        }
	
	        return chat_db.find({count:chat_id},
	            function(e,d){
	                if (e || !d[0]) {
	                	if (e && e.message) {
	                    	return res.json({failure: e.message});
	                	} else {
		                	return res.json({failure: "Unknown error"});
	                	}
	                }
	                if(d[0] && d[0].image) {
	                    if (d[0].image) fs.unlink(d[0].image, function(e2) {});
	                    if (d[0].thumb) fs.unlink(d[0].thumb, function(e2) {});
	                }
	                add_to_chat({
	                	chat: d[0].chat,
	                    count: chat_id,
	                    body: "deleted",
	                    convo: d[0].convo,
	                    image_filename: "",
	                    image: "",
	                    thumb: ""
	                }, function(e2) {
	                    if (e2) {
	                    	console.log(e2);
	                    	return res.json({failure: e2.message});
	                    }
	                    chat_db.remove({count:chat_id}, function(e3) {
	                    	if (e3) {
	                    		console.log(e3);
	                    		return res.json({failure: e3.message});
	                    	}
	                    	console.log("DELETION: id: " + chat_id + " pw: " + password);
	                    	return res.json({success: "deleted " + chat_id});
	                    });
	                });
	            }
	        );
	    });
    } catch (e) {
    	console.log("unknown error", e);
	    return res.json({failure: e});
    }
});

router.post('/set', function (req, res, next) {
	try {
	    var chat_id = req.body.id;
	    var text = req.body.text;
	
		chat_db.find({count: chat_id},
            function(e,d){
                if(d[0] && d[0].ip && d[0].ip == get_user_ip(req)) {
                    return add_to_chat({count:chat_id, body: text}, function(e) {
			            if (e) {
			            	if (e.message) {
								return res.json({failure: e.message});
			            	} else {
								return res.json({failure: "Unknown error"});
			            	}
			            }
			            return res.json({success: "reset " + chat_id});
			        });
                } else {
                    res.json({failure: 'you are not recognized as poster'});
                }
            }
        );
	} catch (e) {
	    return res.json({failure: e});
    }
});

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

router.post('/refresh', function (req, res, next) {
	try {
	    var password = req.body.password;
	
	    check_password(password, function(err, matches) {
	        if (err) {
	            console.log(err);
	            return res.json({failure: 'error validating password'});
	        }
	        if (!matches) {
	            console.log('wrong password');
	            return res.json({failure: 'wrong password'});
	        }
	        Socket.io.sockets.emit('refresh', {refresh:'please refresh'});
	        return res.json({success: 'refreshed'});
	    });
    } catch (e) {
	    return res.json({failure: e});
    }
});

module.exports = router;
