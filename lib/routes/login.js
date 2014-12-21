'use strict';

var crypto = require('crypto');

var express = require('express');
var router = new express.Router();

var config = require('../../config');
var user_db = require('../models/user');
var get_user_ip = require('../utils/get-user-ip');


router.get('/login', function(req, res) {
    res.send('<html><head><meta name="viewport" content="width=device-width,user-scalable=no"><link type="text/css" rel="stylesheet" href="style.css"></head><body><div class="center container"><div>Please prove you aren\'t a robot</div><br/><img src="/captcha.jpg"/><form action="/login" method="post"><br/><input type="text" name="digits"/><input type="hidden" name="page" value="' + req.query.page + '"/></form></div></body></html>');
});

router.post('/login', function(req, res) {
    res.type('text/plain');
    var user_ip = get_user_ip(req);

    var secure_text = crypto.createHash('sha1')
                      .update(req.body.digits + config.securetrip_salt)
                      .digest('base64')
                      .toString();

    user_db.find({captcha: req.session.captcha}).exec(function(e,d) {
        if (d.length > 0) {
            res.json({
                failure: 'captcha_used'
            });
        } else {
            if (secure_text === req.session.captcha) {
                var key = (Math.random() * 1e17).toString(36);
                var info = req.headers['user-agent'] + user_ip + key;
                var password = crypto.createHash('sha1')
                               .update(info)
                               .digest('base64')
                               .toString();
                res.cookie('password_livechan', password, {
                    maxAge: 86400000,
                    httpOnly: false
                });

                if (req.body.page) {
                    res.redirect(req.body.page);
                } else {
                    res.json({
                        success: 'captcha'
                    });
                }

                var now = new Date();

                var data = {
                    session_key: password,
                    captcha: req.session.captcha,
                    ip: user_ip,
                    last_post: now.setTime(now.getTime() - 6000)
                };
                new user_db(data).save(function () {
                    /*user_db.find().exec(function (e, d) {
                        console.log("session found", e, d);
                    });*/
                });

                return;
            }

            if (req.body.page) {
                    res.send('You mistyped the captcha!');
            } else {
                res.json({
                    failure: 'You mistyped the captcha.'
                });
            }
        }
    });
});

module.exports = router;
