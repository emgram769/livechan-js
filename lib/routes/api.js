'use strict';

var express = require('express');
var router = new express.Router();

var config = require('../../config');
var chat_db = require('../models/chat');

router.get('/data:ops((?:_convo)?)/:id([a-z0-9]+):convo((?:_\\S+)?)', function (req, res) {
    if (req.params.id !== 'all' && config.boards.indexOf(req.params.id) < 0) {
        return res.send('Does not exist :(');
    }
    var search = {};
    var limit = req.query.limit?parseInt(req.query.limit):100;
    if (isNaN(limit) || limit < 1 || limit > 2000) limit=100;
    var fields = '';
    if (req.params.id === 'all') {
        limit = 50;
        fields = config.all_fields;
    } else if (req.params.convo) {
    	search.convo = decodeURI(req.params.convo.slice(1));
    	console.log("\n\n", search.convo, "\n\n");
    	search.chat = req.params.id;
        fields = config.board_fields;
    } else {
        search.chat = req.params.id;
        fields = config.board_fields;
    }
    if (req.params.ops === '_convo') {
        search.is_convo_op = true;
        limit = 15;
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

router.get('/last/:id([a-z0-9]+)', function (req, res) {
    // maybe long polling would work better
    if (config.boards.indexOf(req.params.id) < 0) {
        return res.send('Does not exist :(');
    }
    var search = {chat:req.params.id};
    search.convo = req.query.convo || 'General';
    var limit = parseInt(req.query.limit);
    if (isNaN(limit)) limit = 50;
    var fields = config.board_fields;
    var count = parseInt(req.query.count);
    if (count && !isNaN(count)) search.count = {'$gt': count};

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
module.exports = router;
