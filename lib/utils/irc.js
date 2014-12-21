var config = require('../../config');
var chat_db = require('../models/chat');
var add_to_chat = require('./add-to-chat.js');

/* IRC stuff */
var Server = require('../../../ircd.js/lib/server.js').Server;

var irc_limit = {};

var irc = function() {

    var server = new Server(function(chatname, send) {
        /*var fields = '';
        var limit = 20;
        fields = config.board_fields;
        chat_db.find({
                chat: chatname.slice(1),
                convo: 'General'
            })
            .sort({
                count: -1
            })
            .select(fields)
            .limit(limit)
            .exec(function(e, d) {
                if (!e) {
                    for (var i = d.length - 1; i >= 0; i--) {
                        var chat = d[i];
                        chat.name = chat.trip ? chat.name + chat.trip : chat.name;
                        chat.name = chat.name ? chat.name : 'Anonymous';
                        chat.name = chat.name.replace(/\ /g, '_');
                        chat.name = chat.name.replace(/\n/g, ' ');
                        chat.name = chat.name.replace(/\r/g, ' ');
                        chat.name = chat.name.replace(/\t/g, ' ');
                        chat.name = chat.name.replace(/!/g, '#');
                        if (chat.image) {
                            var base_name = chat.image.match(/[\w\-\.]*$/)[0];
                            var extension = base_name.match(/\w*$/)[0];
                            var url_file = 'https://livechan.net/tmp/uploads/' + base_name;
                            chat.body = url_file + '\n' + chat.body;
                        }
                        if (chat.name && chat.body) {
                            send(chat.name, chat.body.slice(0, 500));
                        }
                    }
                } else {
                    return;
                }
            });*/
            return;
    }, function(user, target, message){
    	var channel = target.name.slice(1);
    	var ip = user.remoteAddress;
    	var newDate = new Date();
    	if (config.boards.indexOf(channel) < 0) return;
			var speed = newDate - irc_limit[ip];
	    if (irc_limit[ip] && (speed) < 7000) {
	    	user.send(':livechan!livechan@livechan.net', 'PRIVMSG', user.nick, ':wait ' + (7 - (speed/1000)) + ' seconds.');
		   	return;
	    } else {
		    irc_limit[ip] = newDate;
	    }
    	var data = {
    		chat: channel,
				convo: 'General',
				body: message,
    		name: user.nick,
    		ip: ip,
    		identifier: '$2a$10$mAM0oYrjp0bCHFDsGaiB.eRXq0SJiQi55IdqKJOWbBlthisis_IRC',
    		date: newDate,
    		trip: '!!SxKC741YKw'
    	};
	    add_to_chat(data, function(){});
    });

    return {

        start: function() {

            server.file = server.cliParse();
            server.loadConfig(function() {
                server.start();
                server.createDefaultChannels();
            });

        },

        send: function(channel, name, message) {
            server.broadcast('#' + channel, message.slice(0, 500), name);
        }

    }

}

var IRC = new irc();

module.exports = IRC;