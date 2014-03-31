'use strict';

var fs = require('fs');
var async = require('async');

var express = require('express');
var router = new express.Router();

var config = require('../../config');
var check_ip_validity = require('../utils/check-ip-validity');
var populate_post = require('../utils/populate-post');
var format_image = require('../utils/format-image');
var generate_thumbnail = require('../utils/generate-thumbnail');
var format_post = require('../utils/format-post');
var format_special = require('../utils/format-special');
var add_to_chat = require('../utils/add-to-chat');

router.get('/chat/:id([a-z0-9]+)', function(req, res) {
    if (config.boards.indexOf(req.params.id) < 0 && req.params.id !== 'home') {
        res.send('Board doesn\'t exist :(');
        return;
    }
    res.sendfile('pages/index.html');
});

router.post('/chat/:id([a-z0-9]+)', function(req, res, next) {
    res.type('text/plain');

    /* to be stored in db and passed to clients */
    var data = {};

    async.series([
        function(callback) {
            if (req.params.id !== "all" && config.boards.indexOf(req.params.id) < 0) {
                return callback(new Error('This board does not exist.'));
            } else {
	            switch (req.params.id) {
	            	case "dev":
		            case "int":
		            case "pol":
		            case "sp":
		            	data.special = "country";
		            	return callback();
		            default:
		            	return callback();
	            }
            }
            
        },
        check_ip_validity.bind(null, req),
        populate_post.bind(null, req, data),
        format_image.bind(null, data),
        generate_thumbnail.bind(null, data),
        format_post.bind(null, data),
        format_special.bind(null, req, data),
        add_to_chat.bind(null, data)
    ], function(err) {
        if (err) {
            res.json({failure: err.message});
            /* delete file */
            if (req.files && req.files.image && req.files.image.path) {
                fs.unlink(req.files.image.path, function(e) {
                    if (e) console.log('error deleting image', e);
                });
            }
            /* delete thumbnail */
            if (data.thumb) fs.unlink(data.thumb, function(e) {
                if (e) console.log('error deleting thumbnail', e);
            });
            return;
        }

        /* give the client information about the post */
        res.json({
            success: 'success_posting',
            id: data.count
        });
    });
});

router.get('/draw', function(req, res, next) {
	res.sendfile('pages/draw.html');
});

router.get('/draw/:id([a-z0-9]+)', function(req, res, next) {
	res.sendfile('pages/draw.html');
});

router.get('/:id([a-z0-9]+)', function(req, res) {
    res.redirect('/chat/'+req.params.id);
});

module.exports = router;
