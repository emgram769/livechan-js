'use strict';

var chat_db = require('../models/chat');
var delete_posts = require('./delete-posts');
var send_data = require('./send-data');

/* database fields to transmit */
var ALL_FIELDS = 'chat name body convo convo_id count date trip';
var BOARD_FIELDS = ALL_FIELDS + 'image image_filename image_filesize image_width image_height thumb';

module.exports = function(data) {
    send_data(data.chat, 'chat', data, BOARD_FIELDS);
    send_data('all', 'chat', data, ALL_FIELDS);

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