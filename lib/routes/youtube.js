'use strict';

var https = require('https');
var express = require('express');
var router = new express.Router();
var config = require('../../config');

var cache = {};

router.get('/youtube_data/:id([a-zA-Z0-9_-]{11})', function(req, res) {
    res.set('Content-Type', 'application/json');
    var yt_id = req.params.id;
    if (yt_id in cache) {
        console.log('youtube data in cache', yt_id);
        res.send(cache[yt_id]);
        return;
    }
    console.log('fetching youtube data', yt_id);
    var chunks = [];
    https.get({
        host: 'www.googleapis.com',
        port: 443,
        path: '/youtube/v3/videos?id=' + yt_id + '&key=' + config.youtube_key + '&part=snippet'
    }, function(yt_resp) {
        yt_resp.on('data', function(chunk) {
            chunks.push(chunk);
        }).on('end', function() {
            var yt_data = Buffer.concat(chunks);
            cache[yt_id] = yt_data;
            res.send(yt_data);
        });
    }).on('error', function(e) {
        console.log('error retrieving YouTube data', yt_id, e);
        res.send(504, 'error retrieving YouTube data');
    });
});

module.exports = router;
