'use strict';

var config = require('../../config');
var chat_db = require('../models/chat');
var delete_posts = require('./delete-posts');
var send_data = require('./send-data');

/* last post number */
var count;
chat_db.findOne().sort({
    count: -1
}).exec(function (e, d) {
    if (d) {
        count = d.count;
    } else {
        count = 0;
    }
});

module.exports = function(data, callback) {
    /* set post number */
    if (data.count === undefined) {
        count++;
        data.count = count;
        if (data.is_convo_op) data.convo_id = count;
    }

    /* send to clients */
    send_data(data.chat, 'chat', data, config.board_fields);
    send_data('all', 'chat', data, config.all_fields);

    /* store in the db */
    chat_db.update({count: data.count}, data, {upsert: true}, function(err) {
        if (err) {
            console.log("chat save error", err);
            return callback(new Error('database_update_error'));
        }
        callback();
        chat_db.find({chat: data.chat, is_convo_op: false})
            .sort({count: -1})
            .skip(200)
            .exec(delete_posts);
        chat_db.find({chat: data.chat, is_convo_op: true})
            .sort({count: -1})
            .skip(50)
            .exec(delete_posts);
    });
};
