'use strict';

var config = require('../../config');
var chat_db = require('../models/chat');
var delete_posts = require('./delete-posts');
var send_data = require('./send-data');

module.exports = function(data) {
    send_data(data.chat, 'chat', data, config.board_fields);
    send_data('all', 'chat', data, config.all_fields);

    /* store in the db */
    chat_db.update({count: data.count}, data, {upsert: true}, function(err) {
        if (err) {
            return console.log("chat save error", err);
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
};