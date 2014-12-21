var socket = null;
var sections = [];
var currentSection = 0;
var currentChannel;
var convos = ["General"];
var sectionsMaxLength = 4;

$('document').ready(function(){
	socket = io.connect('/', {secure: (location.protocol === "https:")});
	
	// Send updates to every section
    socket.on('chat', function(data){
	    sections.map(function(section){
	    	section.drawChat(data);
	    });
    });
    
    socket.on('alert', function(){});
    socket.on('refresh', function(){setTimeout(function(){location.reload();},5000);});
    socket.on('user_count', function(data){});
    socket.on('disconnect', function(){});
    socket.on('reconnect', function(){});
    
    var channelMatch = window.location.pathname.match(/\/\w+\/(\w+)/);
    currentChannel = channelMatch.length > 1 ? channelMatch[1] : "";
    var section = new sectionProto(currentChannel);
    section.getSubscription(currentChannel, 'General');
	// Get convo list
	$.ajax({
		type: "GET",
		url: "/data_convo/" + currentChannel
	}).done(function (data) {
		for (var i in data) {
			drawConvoList(data[i]);
		}
	});
	submitCaptcha();
});

function drawConvoList(data) {
	if (typeof(data) !== "undefined" && (convos.indexOf(data.convo) < 0)) {
		console.log(data.convo);
		convos.push(data.convo);
	}
	
	$(".chats_convo_bar").empty();
	for (var i in convos) {
		var convo = convos[i];
		(function(convo){
		var convoElement = $("<div>")
			.toggleClass("chat_convo_element", true)
			.toggleClass("chat_convo_highlighted", (sections[currentSection].convos.indexOf(convo) >= 0))
			.css({
				border: "1px solid "+getRandomColor(hashString(convo))
			})
			.click(function(){
				if (sections[currentSection].convos.indexOf(convo) < 0) {
					sections[currentSection].getSubscription(currentChannel, convo);
				}
				drawConvoList();
			});
		var convoHighlight = $("<span>")
			.html("&nbsp;&nbsp")
			.css({
				background: getRandomColor(hashString(convo)),
				float: "left",
				marginRight: "2px"
			});
		convoElement.text(convo).append(convoHighlight);
		$(".chats_convo_bar").append(convoElement);
		
		})(convo);
	}
}

/* Initialize a section */
function sectionProto(channel) {
	this.channel = channel;
	this.convos = [];
	this.chats = [];
	if (sections.length < sectionsMaxLength) {
		sections.push(this);
	} else {
		throw("Too many sections added!");
	}
	this.DOMElement = $('.chat_section:eq('+sections.indexOf(this)+')');
}

sectionProto.prototype.addConvo = function(convo) {
	if (this.convos.indexOf(convo) >= 0) {
		return;
	} else {
		this.convos.push(convo);
		return;
	}
};

sectionProto.prototype.removeConvo = function(convo) {
	if (this.convos.indexOf(convo) >= 0) {
		var index = array.indexOf(convo);
		this.convos.splice(index, 1);
		return;
	} else {
		return;
	}
};

sectionProto.prototype.drawChat = function(chat) {
	if (this.convos.indexOf(chat.convo) < 0) {
		return;
	}
	
	var chatElement = createChatElement(chat);
	
	if (this.chats.length == 0) {
		this.chats.push(chat);
		this.DOMElement.append(chatElement);
	} else if (chat.count > this.chats[this.chats.length - 1]) {
		this.chats.push(chat);
		this.DOMElement.append(chatElement);
	} else {
		var index = binarySearchChats(this.chats, chat);
		this.chats.splice(index, 0, chat);
		if (index >= this.chats.length - 1) {
			this.DOMElement.append(chatElement);
		} else {
			this.DOMElement.children().eq(index).before(chatElement);
		}
	}
	
	this.DOMElement.scrollTop(this.DOMElement[0].scrollHeight);
	
}

sectionProto.prototype.getSubscription = function(channel, convo) {
	var section = this;
	section.addConvo(convo);

    socket.emit('subscribe', channel);
	console.log("/data/" + channel + "_" + encodeURIComponent(convo));
	// Get convo data
	$.ajax({
        type: "GET",
        url: "/data/" + channel + "_" + encodeURIComponent(convo)
    }).done(function (data) {
        for (var i in data) {
	        section.drawChat(data[i]);
        }
    });
}

// Generate blank post element
function generatePost(chat) {
    "use strict";
    var post = $(
      "<article class='chat_element_container'>" +
        "<article class='chat_element'>" +
            "<header class='chat_header'>" +
                "<a class='chat_label' style='display: none;'/>" +
                "<output class='chat_name'><output class='name_part'/><output class='trip_code'/><output class='flag tooltip'/></output>" +
                "<output class='chat_convo'/>" +
                "<output class='chat_date'/>" +
                "<output class='chat_number'/>" +
                "<output class='chat_refs'/>" +
                "<output class='chat_mod_tools'>" +
                    "<code><output class='chat_identifier'></output></code> "+
                	"[<output class='delete_part'>delete</output> - "+
                	"<output class='warn_part'>warn</output> - "+
                	"<output class='move_part'>move</output> - "+
                	"<output class='ban_part'>ban</output>]"+
                "</output>" +
            "</header>" +
            "<section class='chat_file' style='display: none;'>" +
                "File: <a class='file_link' target='_blank'/>" +
                "<output class='file_data'/>" +
            "</section>" +
            "<section class='chat_audio_cont'/>" +
            "<a target='_blank' class='chat_img_cont'/>" +
            "<output class='chat_body'/>" +
        "</article>" +
      "</article>"
    );
    post.attr("id", "chat_" + chat.count);
   
    post.find(".delete_part")
        .click(function() {
            if (!window.confirm("Are you sure you want to delete this post?"))
                return;
            //mod_delete_post(id, admin_pass);
        });
        
    post.find(".warn_part")
        .click(function() {
            if (!window.confirm("Are you sure you want to warn this poster?"))
                return;
            //mod_warn_poster(id, admin_pass);
        });
        
    post.find(".move_part")
        .click(function() {
            if (!window.confirm("Are you sure you want to move this post?"))
                return;
            //mod_move_post(id, admin_pass);
        });   
             
    post.find(".ban_part")
        .click(function() {
            if (!window.confirm("Are you sure you want to ban this poster?"))
                return;
            //mod_ban_poster(id, chat_id, admin_pass);
        });
        

    post.find(".chat_convo")
        .click(function (e) {
            e.stopPropagation();
            $('input[name="convo"]').val(chat.convo);
            //apply_filter();
        });

    post.find(".chat_number")
        .text(chat.count)
        .click(function () {
            //quote(id);
		});

    post.find(".chat_img_cont")
        .mouseover(function(event){
	        
        })
        .mousemove(function(event) {

        })
        .mouseout(function(event) {

        })
        .on("wheel", function(event) {

        })
        .click(function (e) {
            e.stopPropagation();
        });

    return post;
}


function binarySearchChats(chats, chat) {
	var index = 0;
	// TODO: real binary search
	while ((index < chats.length) && (chat.count > chats[index].count)) {
		index++;
	}

	return index;
}

/*
Parser object
- text = string to be parsed
*/
function Parser(text) {
    this.text = text;
    this.position = 0;
}

/*
Parse the text according to the given markup rules.
- rules is an array of markup rules in the form [start_tag, handler] where
    start_tag
      is a regular expression for the start tag
    handler(match_result, output) [with this = the Parser object]
      advances the parser past the body and end tag (if any)
      creates the DOM nodes that the tag represents
      and appends them to output (an array to be passed to jQuery's .append() function)
- end_tag (optional) is a regular expression which causes parsing to stop
*/
Parser.prototype.parse = function(rules, end_tag) {
    "use strict";
    var output = [];
    var end_matched = false;
    if (end_tag) {
        var end_handler = function(m, o) {
            end_matched = true;
        }
        rules = [[end_tag, end_handler]].concat(rules);
    }
    do {
        var match = null;
        var match_pos = this.text.length;
        var handler = null;
        for (var i = 0; i < rules.length; i++) {
            rules[i][0].lastIndex = this.position;
            var result = rules[i][0].exec(this.text);
            if (result !== null && this.position <= result.index && result.index < match_pos) {
                match = result;
                match_pos = result.index;
                handler = rules[i][1];
            }
        }
        var unmatched_text = this.text.substring(this.position, match_pos);
        output.push(document.createTextNode(unmatched_text));
        this.position = match_pos;
        if (match !== null) {
            this.position += match[0].length;
            handler.call(this, match, output);
        }
    } while (match !== null && !end_matched);
    return output;
}

/* Advances past end_tag and returns the unparsed body */
Parser.prototype.no_parse = function(end_tag) {
    "use strict";
    return $(this.parse([], end_tag)[0]).text();
}


function createChatElement(chat) {
	var post = generatePost(chat);
	post.find(".name_part")
		.text(chat.name);
		
	post.find(".chat_identifier")
        .text(chat.identifier.slice(50))
        .css({
	        background:'white'
        });
    if (chat.country) {
    	if (chat.trip == "!!SxKC741YKw") {
    		var country = $("<img src='/icons/irc.png' style='height:10px;margin-bottom:1px;'/>");
	        country_name = "IRC";
	        post.find(".flag").attr("data-country", country_name);
	        post.find(".flag").prepend(country);
	    } else if (chat.trip == "!RQ1r/nUdfw") {
    		var country = $("<img src='/icons/countries/GAY.png'/>");
	        country_name = "Hidden With Pride";
	        post.find(".flag").attr("data-country", country_name);
	        post.find(".flag").prepend(country);
    	} else {
	        var country_name = "";
	        //if (special_countries.indexOf(data.country)>-1) {
	        if (chat.country[2] == "-") {
	            var state = $("<img src='/icons/countries/"+chat.country+".png'/>");
	            post.find(".flag").prepend(state);
				country_name += chat.country.slice(3)+", ";
	        }
	        var country = $("<img src='/icons/countries/"+chat.country.slice(0,2)+".png'/>");
	        country_name += chat.country_name ? chat.country_name : chat.country;
	        post.find(".flag").attr("data-country", country_name);
	        post.find(".flag").prepend(country);
        }
        post.find(".flag").click(function(){

        })
    }
    if (chat.trip) {
        post.find(".trip_code")
			.text(chat.trip);
    }
    if (chat.convo || chat.convo_id) {
        var is_op = (chat.convo_id === chat.count);
        post.toggleClass("convo_op", is_op);
        var chat_convo = post.find(".chat_convo");
        chat_convo
		.text(chat.convo + (is_op ? " (OP)" : ""))
        .css({
        	border: "1px solid "+getRandomColor(hashString(chat.convo))
        });
        if (!is_op) chat_convo.data("dest", chat.convo_id);
    }
    if (chat.convo || new_post) {
    }
    if (chat.date) {
        var date = new Date(chat.date);
        date = (date == "NaN") ? chat.date : date.toLocaleString();
        post.find(".chat_date").text(date);
    }
    
    if (chat.body) {
        // Process body markup
        var ref_ids = [];
        var rules = [
            [/>>>\/([a-z0-9]+)(?:[#\/](\d+))?/g, function(m, o) {
                o.push(board_link(m[1], m[2]));
            }],
            [/(?:\{(\d+)\}|>>(\d+))/g, function(m, o) {
                var ref_id = parseInt(m[1] ? m[1] : m[2], 10);
                if ($.inArray(ref_id, ref_ids) === -1) ref_ids.push(ref_id);
                o.push(ref_id);//o.push(quote_link(ref_id));
            }],
            [/^>+/mg, function(m, o) {
                var body = this.parse(rules, /$/mg);
                o.push($("<output class='greentext'/>").text(m[0]).append(body));
            }],
            [/\r?\n/g, function(m, o) {
                o.push($("<br>"));
            }],
            [/\[code(?: language=([a-z]+))?\](?:\r?\n)?/g, function(m, o) {
                var body = this.no_parse(/\[\/code\]/g);
                try {
                    if (m[1]) {
                        try {
                            o.push($("<pre class='code'/>").html($("<code/>").html(hljs.highlight(m[1], body).value)));
                        } catch(e) {
                            o.push($("<pre class='code'/>").html($("<code/>").html(hljs.highlightAuto(body).value)));
                        }
                    } else {
                        o.push($("<pre class='code'/>").html($("<code/>").html(hljs.highlightAuto(body).value)));
                    }
                } catch(e) {
                    o.push($("<pre class='code'/>").text(body));
                }
            }],
            [/\[plugin\](?:\r?\n)?/g, function(m, o) {
                var body = this.no_parse(/\[\/plugin\]/g);
                var title = body.match(/\[title\]([^]+)\[\/title\]/);
                title = title && title.length >= 2 ? title[1] : 'plugin';
                var script_text = body.match(/\[script\]([^]+)\[\/script\]/);
                script_text = script_text && script_text.length >= 2 ? script_text[1] : '';
                var elem_html = body.match(/\[html\]([^]+)\[\/html\]/);
                elem_html = elem_html && elem_html.length >= 2 ? elem_html[1] : '<div></div>';
				
				
				var plugin_link = $("<a class='chat_plugin_link'/>")
                	.text(title)
                	.data('script_text', script_text)
                	.data('elem_html', elem_html)
                	.click(function(){spawn_plugin(script_text, elem_html)});
				
				var reveal_code = $('<span>')
					.text('[show code]')
					.css({cursor:"pointer", fontSize:'12px'})
					.addClass('link')
					.click(function(event){
						plugin_code.toggleClass('hidden');
						var inner_text = $(this).text() == '[show code]' ? '[hide code]' : '[show code]';
						$(this).text(inner_text);
					});
				
				var plugin_code = $('<div>')
					.text('<script>'+script_text+'</script>\r\n<div>'+elem_html+'</div>');
				plugin_code.toggleClass('hidden', true);
                
                var plugin_object = $('<span>')
                	.append(plugin_link)
                    .append(reveal_code)
                    .append(plugin_code);

                o.push(plugin_object);
            }],
            [/\[spoiler\]/g, function(m, o) {
                var body = this.parse(rules, /\[\/spoiler\]/g);
                o.push($("<span class='spoiler'/>").append(body));
            }],
            [/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(\S+)/g, function(m, o) {
                var main = $("<span/>");
                var url = m[0][0] == 'y' ? "https://"+m[0] : m[0];
                var elem = $("<a target='_blank'/>").attr("href", url).text(m[0]);
                var embed = $("<span>(embed)</span>").css({cursor:"pointer", fontSize:'10px'});
                main.append(elem, " ", embed);
                o.push(main);
                var embedded = false;
                embed.click(function(e) {
                    e.stopPropagation();
                    if (embedded) {
                        main.find("iframe").remove();
                    } else {
                        var yt = $("<iframe width='560' height='315' style='max-width:100%;' frameborder='0' allowfullscreen></iframe>")
                            .attr("src", "https://www.youtube.com/embed/"+m[1]).css({float:"left", marginRight:'5px'});
                        main.append(yt);
                    }
                    embedded = !embedded;
                    embed.text(embedded ? "(unembed)" : "(embed)");
                    var post = main.parents(".chat");
                    post.toggleClass('chat_embed', post.find("iframe").length > 0);
                });
                //get_youtube_data(m[1],elem);
            }],
            [/https?:\/\/\S+()/g, function(m, o) { // stupid extra () is for some syntax highlighters to play nice.
                o.push($("<a target='_blank'/>").attr("href", m[0]).text(m[0]));
            }],
            [/\[b\]/g, function(m, o) {
                var body = this.parse(rules, /\[\/b\]/g);
                o.push($("<span style='font-weight: bold;'/>").append(body));
            }],
            [/\[i\]/g, function(m, o) {
                var body = this.parse(rules, /\[\/i\]/g);
                o.push($("<span style='font-style: italic;'/>").append(body));
            }],
            [/\[u\]/g, function(m, o) {
                var body = this.parse(rules, /\[\/u\]/g);
                o.push($("<span style='text-decoration: underline;'/>").append(body));
            }],
            [/\[s\]/g, function(m, o) {
                var body = this.parse(rules, /\[\/s\]/g);
                o.push($("<span style='text-decoration: line-through;'/>").append(body));
            }],
            [/\[color=([#\w]+)\]/g, function(m, o) {
                var body = this.parse(rules, /\[\/color\]/g);
                if ($('#spoilers').prop("checked")) {
                	o.push($("<span/>").css("color", m[1]).append(body));
                } else {
                	o.push($("<span/>").append(body));
                }
            }],
            [/\[flag\]/g, function(m, o) {
                var body = this.parse(rules, /\[\/flag\]/g);
                if (special_countries) {
                	o.push($("<img/>").attr("src", encodeURI("/icons/countries/"+body[0].data.toUpperCase()+".png")).css({height:"44px"}));
                } else {
                	o.push($("<span>").text(body[0].data.toUpperCase()));
                }
            }],
            [/\[noparse\]/g, function(m, o) {
                var body = this.no_parse(/\[\/noparse\]/g);
                o.push(document.createTextNode(body));
            }]
        ];
        var body = new Parser(chat.body).parse(rules);
        post.find(".chat_body").empty().append(body);
        
    }

    
	return post;
}

function submitCaptcha() {
	var captchaDiv = $("<div class='captcha_div'>");
	var captchaImg = $("<img src='/captcha.jpg' alt='type in the captcha' style='height:100%;float:left'>");
	var captchaSpan = $("<span/>");
	captchaSpan.text("Enter the captcha below to prove you are not a robot.");
	var captchaForm = $("<form method='post' target='ghostframe' action='/login'>");
	var captchaInput = $("<input type='text' name='digits' style='display:inline;'>");
	var captchaSubmit = $("<input type='submit' style='display:inline;'>");

	captchaDiv
		.append(captchaImg)
		.append(captchaSpan)
		.append(captchaForm.append(captchaInput).append(captchaSubmit));
	$(".chat_input").prepend(captchaDiv);
}


/*
 * Utility Functions
 */
function getRandomColor(seed) {
	var palette = ["#FF2000", "#FF4000", "#FF6000", "#FF8000", "#FFA000", "#FFC000", "#FFE000",
				   "#FFFF00", "#E0FF00", "#C0FF00", "#A0FF00", "#80FF00", "#60FF00", "#40FF00",
				   "#20FF00", "#00FF00", "#00FF20", "#00FF40", "#00FF60", "#00FF80", "#00FFA0",
				   "#00FFC0", "#00FFE0", "#00FFFF", "#00E0FF", "#00C0FF", "#00A0FF", "#0080FF",
				   "#0060FF", "#0040FF", "#0020FF", "#0000FF", "#2000FF", "#4000FF", "#6000FF",
				   "#8000FF", "#A000FF", "#C000FF", "#E000FF", "#FF00FF", "#FF00E0", "#FF00C0",
				   "#FF00A0", "#FF0080", "#FF0060", "#FF0040", "#FF0020", "#FF0000"];
    var letters = '456789ABCD'.split('');
    //var color = '#';
    //for (var i = 0; i < 6; i++ ) {
        color = palette[Math.floor(seededRandom(seed) * palette.length)];
    //}
    return color;
}

function hashString(str) {
	var hash = 0, i, chr, len;
	if (str.length == 0) return hash;
	for (i = 0, len = str.length; i < len; i++) {
		chr   = str.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
}

function seededRandom(seed) {
	if (typeof(seed) === "undefined") seed = 0x2F6E2B1;

	// Robert Jenkins’ 32 bit integer hash function
	seed = ((seed + 0x7ED55D16) + (seed << 12))  & 0xFFFFFFFF;
	seed = ((seed ^ 0xC761C23C) ^ (seed >>> 19)) & 0xFFFFFFFF;
	seed = ((seed + 0x165667B1) + (seed << 5))   & 0xFFFFFFFF;
	seed = ((seed + 0xD3A2646C) ^ (seed << 9))   & 0xFFFFFFFF;
	seed = ((seed + 0xFD7046C5) + (seed << 3))   & 0xFFFFFFFF;
	seed = ((seed ^ 0xB55A4F09) ^ (seed >>> 16)) & 0xFFFFFFFF;
	return (seed & 0xFFFFFFF) / 0x10000000;
}


