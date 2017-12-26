'use strict';

var mongoose = require('mongoose');

var config = require('../../config');

var user_schema = new mongoose.Schema({
    date: {
        type: Date,
        default: Date.now,
        expires: config.user_session_age
    },
    ip: String,
    session_key: String,
    captcha: String,
    last_post: {
        type: Date,
        default: Date.now
    },

    /* array of rooms the user is banned from */
    banned_rooms: Array,
    ban_offense: String
});

module.exports = mongoose.model('user_db', user_schema);