'use strict';

var express = require('express');
var router = new express.Router();

var config = require('../../config');
var chat_db = require('../models/chat');

router.get('/data:ops((?:_convo)?)/:id([a-z0-9]+):convo((?:_[a-z0-9]+)?)', function (req, res) {
    if (req.params.id !== 'all' && config.boards.indexOf(req.params.id) < 0) {
        return res.send('Does not exist :(');
    }
    var search = {};
    var limit = 0;
    var fields = '';
    if (req.params.id === 'all') {
        limit = 50;
        fields = config.all_fields;
    } else if (req.params.convo) {
    	console.log("WOOOOO!!!!!", req.params.convo);
    	search.convo = req.params.convo.slice(1);
    	search.chat = req.params.id;
        limit = 200;
        fields = config.board_fields;
    } else {
        search.chat = req.params.id;
        limit = 550;
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

module.exports = router;