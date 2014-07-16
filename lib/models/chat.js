'use strict';

var mongoose = require('mongoose');

var chat_schema = new mongoose.Schema({
    convo: String,
    convo_id: Number,
    is_convo_op: Boolean,
    body: String,
    name: String,
    count: {
        type: Number,
        unique: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    ip: String,
    identifier: String,
    country: String,
    country_name: String,
    chat: String,
    image: String,
    image_filename: String,
    image_filesize: Number,
    image_width: Number,
    image_height: Number,
    image_transparent: Boolean,
    duration: Number,
    thumb: String,
    trip: String
});

module.exports = mongoose.model('chat_db', chat_schema);
