'use strict';

var crypto = require('crypto');
var fs = require('fs');

var express = require('express');
var router = new express.Router();

var config = require('../../config');
var chat_db = require('../models/chat');
var user_db = require('../models/user');
var add_to_chat = require('../utils/add-to-chat');

router.get('/ban/:password([a-z0-9]+)/:id([0-9]+)/:board', function(req, res, next) {
    var chat_id = req.params.id;
    var password = req.params.password;
    var type = req.params.text;
    var board = req.params.board;

    var hash_pass = crypto.createHash('sha512').update(config.admin_pw_salt, 'base64').update(password, 'utf8').digest('base64');

    if (hash_pass !== config.admin_pw_hash){
        console.log('ATTEMPTED PASS', password);
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

router.get('/delete/:password([a-z0-9]+)/:id([0-9]+)', function(req, res, next) {
    var chat_id = req.params.id;
    var password = req.params.password;

    var hash_pass = crypto.createHash('sha512').update(config.admin_pw_salt, 'base64').update(password, 'utf8').digest('base64');

    if (hash_pass !== config.admin_pw_hash){
        console.log('ATTEMPTED PASS', password);
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

router.get('/set/:password([a-z0-9]+)/:id([0-9]+)/:text', function (req, res, next) {
    var chat_id = req.params.id;
    var password = req.params.password;
    var text = decodeURI(req.params.text);

    var hash_pass = crypto.createHash('sha512').update(config.admin_pw_salt, 'base64').update(password, 'utf8').digest('base64');

    if (hash_pass !== config.admin_pw_hash){
        console.log('ATTEMPTED PASS', password);
        return res.json({failure: 'wrong password'});
    }

    return add_to_chat({count:chat_id, body: text}, function(e) {
        if (e) return res.json({failure: e.message});
        return res.json({success: "reset " + chat_id});
    });
});

module.exports = router;
