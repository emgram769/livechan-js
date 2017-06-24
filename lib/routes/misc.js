'use strict';

var express = require('express');
var router = new express.Router();

router.get('/', function (req, res) {
  res.redirect('/chat/home');
});

/* 404 */
router.get('*', function(req, res){
  res.status(404).sendfile('public/404.html');
});

/* 404 */
router.post('*', function(req, res){
  res.status(404).sendfile('public/404.html');
});

module.exports = router;
