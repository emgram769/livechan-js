'use strict';

var crypto = require('crypto');
var fs = require('fs');
var tripcode = require('tripcode');

var config = require('../../config');
var chat_db = require('../models/chat');

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

/* format_post:
    - checks for text violations
    - generates tripcode
    calls callback(data) on success
*/
module.exports = function(req, res, next, data, callback) {
    /* TODO: remove this try catch */
    try {
        /* length checks */
        if (!req.body) {
            if (req.files && req.files.image && req.files.image.path) {
                /* delete blank file */
                fs.unlinkSync(req.files.image.path);
            }
            res.json({failure: 'illegitimate_request'});
            return;
        }

        if (req.body.body && req.body.body.length > 2000) {
            req.body.body = req.body.body.substring(0, 1999) + '...';
        }

        if (req.body.body.split('\n').length > 100) {
            req.body.body = req.body.body.split('\n', 100).join('\n');
        }

        /* generate tripcode */
        var trip_index = req.body.name.indexOf('#');
        var trip;

        if (trip_index > -1) {
            trip = req.body.name.substr(trip_index + 1);
            var secure = trip.indexOf('#') === 0;
            if (secure) {
                trip = crypto.createHash('sha1').update(trip.substr(1) +
                       config.securetrip_salt).digest('base64').toString();
            }
            data.trip = (secure ? '!!' : '!') + tripcode(trip);
            req.body.name = req.body.name.slice(0, trip_index);
        }

        /* truncate name */
        if (req.body.name.length > 40) {
            req.body.name = req.body.name.substring(0, 39) + '...';
        }

        if (req.body.convo) {
            if (req.body.convo.length > 40) {
                req.body.convo = req.body.convo.substring(0, 39) + '...';
            }
        } else {
            /* default conversation */
            req.body.convo = 'General';
        }

        /* everything looks good, we can safely add this chat */
        count++;

        data.count = count;
        data.convo = req.body.convo;
        data.body = req.body.body;
        data.name = req.body.name || "Anonymous";
        data.date = (new Date()).toString();
        var user_ip = req.connection.remoteAddress;
        var ip_addr = req.headers["x-forwarded-for"];
        if (ip_addr) {
            var list = ip_addr.split(",");
            user_ip = list[list.length - 1];
        }
        data.ip = user_ip;
        data.chat = req.params.id;

        /* determine if OP of conversation topic */
        if (data.convo && data.convo !== "General") {
            chat_db.findOne({
                convo: data.convo,
                chat: data.chat,
                is_convo_op: true
            }).exec(function(err, convo_ent) {
                if (!convo_ent) {
                    data.is_convo_op = true;
                    data.convo_id = data.count;

                /* cooldown increase */
                } else {
                    data.is_convo_op = false;
                    data.convo_id = convo_ent.count;
                }
                callback(data);
            });
        } else {
            callback(data);
        }

        /* give the client information about the post */
        res.json({
            success: 'success_posting',
            id: data.count
        });

        return;
    } catch(e) {
        if (req.files && req.files.image && req.files.image.path) {
            /* delete blank file */
            fs.unlinkSync(req.files.image.path);
        }
        res.json({failure: 'illegitimate_request'});
    }
};