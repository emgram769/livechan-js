'use strict';

var fs = require('fs');

var express = require('express');
var router = new express.Router();

var config = require('../../config');
var check_ip_validity = require('../utils/check-ip-validity');

router.get('/chat/:id([a-z0-9]+)', function(req, res) {
    if (config.boards.indexOf(req.params.id) < 0 && req.params.id !== 'home') {
        res.send('Board doesn\'t exist :(');
        return;
    }
    res.sendfile('pages/index.html');
});

router.post('/chat/:id([a-z0-9]+)', function(req, res, next) {
    res.type('text/plain');
    if (req.params.id !== "all" && config.boards.indexOf(req.params.id) < 0) {
        if (req.files && req.files.image && req.files.image.path) {
            /* delete blank file */
            fs.unlink(req.files.image.path);
        }
        res.json({failure: 'This board does not exist.'});
        return;
    }
    check_ip_validity(req, res, next);
});

module.exports = router;