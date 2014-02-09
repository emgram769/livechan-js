'use strict';

var crypto = require('crypto');
var tripcode = require('tripcode');

var config = require('../../config');
var chat_db = require('../models/chat');

/* format_post:
    - checks for text violations
    - generates tripcode
    calls callback(err) on completion
*/
module.exports = function(data, callback) {
    /* TODO: remove this try catch */
    try {
        /* length checks */
        if (data.body.length > 2000) {
            data.body = data.body.substring(0, 1999) + '...';
        }

        if (data.body.split('\n').length > 100) {
            data.body = data.body.split('\n', 100).join('\n');
        }

        /* generate tripcode */
        var trip_index = data.name.indexOf('#');
        var trip;

        if (trip_index > -1) {
            trip = data.name.substr(trip_index + 1);
            var secure = trip.indexOf('#') === 0;
            if (secure) {
                trip = crypto.createHash('sha1').update(trip.substr(1) +
                       config.securetrip_salt).digest('base64').toString();
            }
            data.trip = (secure ? '!!' : '!') + tripcode(trip);
            data.name = data.name.slice(0, trip_index);
        }

        /* truncate name */
        if (data.name.length > 40) {
            data.name = data.name.substring(0, 39) + '...';
        }

        /* truncate convo */
        if (data.convo.length > 40) {
            data.convo = data.convo.substring(0, 39) + '...';
        }

        /* determine if OP of conversation topic */
        if (data.convo && data.convo !== "General") {
            return chat_db.findOne({
                convo: data.convo,
                chat: data.chat,
                is_convo_op: true
            }).exec(function(err, convo_ent) {
                if (!convo_ent) {
                    data.is_convo_op = true;
                    /* data.convo_id will be set upon adding to chat */

                /* cooldown increase */
                } else {
                    data.is_convo_op = false;
                    data.convo_id = convo_ent.count;
                }
                return callback();
            });
        } else {
            return callback();
        }
    } catch(e) {
        console.log('post formatting error', e);
        return callback(new Error('illegitimate_request'));
    }
};
