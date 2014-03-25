'use strict';

var bcrypt = require('bcrypt');
var fs = require('fs');

var express = require('express');
var router = new express.Router();

var config = require('../../config');
var chat_db = require('../models/chat');
var user_db = require('../models/user');
var add_to_chat = require('../utils/add-to-chat');

router.post('/ban', function(req, res, next) {
    var chat_id = req.body.id;
    var password = req.body.password;
    var board = req.body.board;

    bcrypt.compare(password, config.admin_pw_hash, function(err, matches) {
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
                            banned_rooms: board
                        }
                    }, {multi: true}, function(err){
                        if(!err) {
                            res.json({success: 'banned ' + d[0].ip + ' from ' + board});
                        } else {
                            res.json({failure: 'couldn\'t ban ' + d[0].ip + ' from ' + board});
                        }
                    });
                } else {
                    res.json({failure: 'couldn\'t find ip'});
                }
            }
        );
    });
});

router.post('/delete', function(req, res, next) {
    var chat_id = req.body.id;
    var password = req.body.password;

    bcrypt.compare(password, config.admin_pw_hash, function(err, matches) {
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
                if (e) {
                    return res.json({failure: e.message});
                }
                if(d[0] && d[0].image) {
                    if (d[0].image) fs.unlink(d[0].image, function(e2) {});
                    if (d[0].thumb) fs.unlink(d[0].thumb, function(e2) {});
                }
                add_to_chat({
                    count: chat_id,
                    body: "deleted",
                    convo: "General",
                    name: "deleted",
                    image_filename: "",
                    image: "",
                    thumb: ""
                }, function(e2) {
                    if (e2) return res.json({failure: e2.message});
                    return res.json({success: "deleted " + chat_id});
                });
            }
        );
    });
});

router.post('/set', function (req, res, next) {
    var chat_id = req.body.id;
    var password = req.body.password;
    var text = req.body.text;

    bcrypt.compare(password, config.admin_pw_hash, function(err, matches) {
        if (err) {
            console.log(err);
            return res.json({failure: 'error validating password'});
        }
        if (!matches) {
            console.log('wrong password');
            return res.json({failure: 'wrong password'});
        }

        return add_to_chat({count:chat_id, body: text}, function(e) {
            if (e) return res.json({failure: e.message});
            return res.json({success: "reset " + chat_id});
        });
    });
});

module.exports = router;
