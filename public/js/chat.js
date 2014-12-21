/*
    livechan is a live imageboard web application.
    Copyright (C) 2014 livechan Team

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>. 
*/
// for tabs
var all_chats = {};

var chat = {};
var future_ids = {};
var quote_links_to = {};
var convos = ["General"];
var convo_map = {};
var highlighted_convos = ["General"];
var start_press; // for long press detection
var longpress = 400;

var admins = ["Status","!!rr1C6aJjtk", "!!hSdTJ81KjY", "!!/3R6pgOFdo"]; // first trip here is used for server status posts
var devs = ["!/b/suPrEmE", "!!3xVuTKubFw", "!!8Trs3SaoJ2"];
/* if you look at source you are essentially helping out, so have some blue colored trips! --> bluerules, testing */
var default_contribs = ["!!Tia6BuxIxc"];
var bots = ["!!.w5vzYxkv6","!!RG5a8fLuMM"];
var irc = ["!!SxKC741YKw"];
var hidden_trips = ["!7cNl93Dbb6", "!9jPA5pCF9c", "!xeE5csyhAE", "!RQ1r/nUdfw", "!We.UHNdLy."];
var special_trips = bots.concat(irc).concat(hidden_trips);
var my_ids = [];
var contribs = default_contribs;

var window_focus = true;
var window_alert;
var blink;
var unread_chats = 0;
var title = "";
var max_chats = 100;

var chat_id = "";
var linked_post = "";

var special_countries;
var on_chat = function(d) {};

function ajaxTranslate(textToTranslate, fromLanguage, toLanguage, callback) {
	var p = {};
	var apikeys =['98BAFD350ACBE1FE601ABF6274820CC03BAAC1D4', '8E54095330F0B7E7CB73527A50437E6110A64730']; //['9BEE70120363E77B0528A0E24953BFD00F59D58E',
	p.appid = apikeys[Math.floor(Math.random()*apikeys.length)];
	p.to = toLanguage;
	p.from = fromLanguage;
	p.text = textToTranslate;
	$.ajax({
		url: 'https://api.microsofttranslator.com/V2/Ajax.svc/Translate',
		data: p,
		dataType: 'jsonp',
		jsonp: 'oncomplete',
		//jsonpCallback: callback,
		complete: function(request, status) {
			//alert('complete: '+status);
		},
		success: function(data, status) {
			callback(data);
		},
		error: function(request, status, error) {
			console.log('error: status-'+status+',desc-'+error);
		}
	});
} 

function humanFileSize(bytes, si) {
    "use strict";
    var thresh = si ? 1000 : 1024;
    if (bytes < thresh) {
        return bytes + ' B';
    }
    var units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while (bytes >= thresh);
    return bytes.toFixed(1) + ' ' + units[u];
}

function quote_click() {
    scroll_to_post(this.href.match(/\d*$/)[0]);
    return false;
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

function hashString(str) {
  var hash = 0, i, chr, len;
  if (str.length == 0) return hash;
  for (i = 0, len = str.length; i < len; i++) {
    chr   = str.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

function getRandomColor(seed) {
	var palette = ["#FFCCCC", "#FFE0CC", "#FFEACC", "#FFF4CC", "#FFFECC", "#EFFAC8", "#C7F5C4", "#C4F0F4", "#C4DAF4", "#C9C4F4", "#E1C4F4", "#F6C6E6"];
    var letters = '456789ABCD'.split('');
    //var color = '#';
    //for (var i = 0; i < 6; i++ ) {
        color = palette[Math.floor(seededRandom(seed) * palette.length)];
    //}
    return color;
}

document.head = document.head || document.getElementsByTagName('head')[0];

function changeFavicon(src) {
	var link = document.createElement('link'),
	oldLink = document.getElementById('dynamic-favicon');
	link.id = 'dynamic-favicon';
	link.rel = 'shortcut icon';
	link.href = src;
	if (oldLink) {
		document.head.removeChild(oldLink);
	}
	document.head.appendChild(link);
}

function quote_mouseover() {
    var display = $("#chat_" + $(this).data("dest")).clone();
    display.toggleClass("to_die", true);
    display.css({
        display: 'inline',
        position: 'absolute',
        top: $(this).offset().top - $(this).height()/2,
        left: $(this).offset().left + $(this).width(),
        border: '1px black solid',
        zIndex: 1000
    });
    $('body').append(display);
}

function image_mouseover(obj, event, id) {
    if (!chat[id] || !chat[id].image || chat[id].image_width === undefined || chat[id].image_height === undefined) return;

    // Find window to place fullsize image/video in
    var targetWindow = window;
    frameLeft = 0;
    frameTop = 0;
    try {
        while (targetWindow.parent) {
            var frameOffset = $(targetWindow.frameElement).offset();
            frameLeft += frameOffset.left;
            frameTop += frameOffset.top;
            targetWindow = targetWindow.parent;
        }
    } catch(e) {}
    windowWidth = $(targetWindow).width();
    windowHeight = $(targetWindow).height();

    // Use space to left or right of thumbnail, whichever is larger
    var thumbLeft = frameLeft + $(obj).offset().left;
    var thumbRight = windowWidth - (thumbLeft + $(obj).width());
    var maxWidth, xPosition;
    if (thumbLeft > thumbRight) {
        // display to the left, set position of right side
        displayAlign = "right";
        maxWidth = thumbLeft - 10;
        xPosition = windowWidth - (frameLeft + event.clientX - 10);
    } else {
        // display to the right, set position of left side
        displayAlign = "left";
        maxWidth = thumbRight - 10;
        xPosition = frameLeft + event.clientX + 10;
    }
    if (maxWidth <= 0) return;
    var scale = Math.min(maxWidth/chat[id].image_width, windowHeight/chat[id].image_height, 1);
    var width = Math.round(chat[id].image_width * scale);
    var height = Math.round(chat[id].image_height * scale);
    var yTop = Math.round((windowHeight - height) * (frameTop + event.clientY) / windowHeight);

    var base_name = chat[id].image.match(/[\w\-\.]*$/)[0];

    var extension = base_name.match(/\w*$/)[0];
    if ($.inArray(extension, ["ogv", "webm"]) > -1) {
        if (display === undefined) {
            display = $("<video/>");
        }
        display[0].loop = true;
        var volume = parseFloat($("#volume").val() || 0);
        display[0].volume = volume;
        display[0].muted = (volume == 0);
    } else {
        display = $("<img>");
    }
    display.attr("src", "/tmp/uploads/" + base_name);
    display.css({
        display: 'inline',
        position: 'fixed',
        top: yTop + 'px',
        width: width + 'px',
        height: height + 'px',
        zIndex: 1000,
        'pointer-events': 'none'
    });
    display.css(displayAlign, xPosition);
    $(targetWindow.document.body).append(display);
    if (display.is("video") && display[0].play) display[0].play();
}

function kill_excess() {
    "use strict";
    $('.to_die').remove();
}

function board_link(dest,linked_chat){
    var link = $("<a class='board_link'/>");
    if(!linked_chat) {
        if (dest.split('/')[2]){
            linked_chat = dest.split('/')[2];
            dest = dest.split('/')[1];
        } else {
            linked_chat = "";  
        }
    }
    dest = dest.replace(/\//g,"");
    linked_chat = linked_chat.replace(/\//g,"");
    var link_text = ">>>/" + dest;
    var link_url = "/chat/" + dest;
    if (linked_chat !== "") {
        link_text += "#" + linked_chat;
        link_url += "#" + linked_chat;
        if ($.inArray(parseInt(linked_chat, 10), my_ids)) {
            link_text += " (You)";
        }
    }
    link.text(link_text);
    link.attr("href", link_url);
    link.click(function(e){
           e.stopPropagation();
        set_channel(dest, linked_chat);
        return false;
    });
    return link;
}

function quote_link(dest) {
    "use strict";
    var link = $("<a class='quote_link'/>");
    link.attr("href", "#" + dest);
    link.data("dest", dest);
    link.text(function () {
        return ">>" + dest + (($.inArray(dest, my_ids) > -1) ? " (You)" : "");
    });
    link.click(quote_click);
    link.mouseover(quote_mouseover);
    link.mouseout(kill_excess);
    if (quote_links_to[dest] === undefined) quote_links_to[dest] = [];
    quote_links_to[dest].push(link);
    return link;
}

function remove_hash() { 
    history.pushState("", document.title, window.location.pathname
                                                       + window.location.search);
}

function swap_to_convo(convo){
    if(convo=="") {
        $('#convo_filter').val('no-filter');
        $("#convo").val('');
        highlighted_convos = convos.slice(0);
        $(".sidebar_convo").toggleClass("sidebar_convo_dim",false);
        remove_hash();
    } else {
        $(".sidebar_convo").toggleClass("sidebar_convo_dim",true);
        $(".sidebar_convo[data-convo='"+convo+"']").toggleClass("sidebar_convo_dim",false);

        highlighted_convos = [convo];

        $("#convo").val(convo);
        $('#convo_filter').val('filter');
        var encoded_convos = highlighted_convos.map(function(e){return encodeURIComponent(e)});
        window.location.hash = encoded_convos.join("+#");
    }
    apply_filter();
    scroll();
    return;
}

function add_to_convo(convo){
    //console.log(highlighted_convos,convo);
    $('#convo_filter').val("filter");
    if(convo=="") {
        highlighted_convos = convos.slice(0);
        $(".sidebar_convo").toggleClass("sidebar_convo_dim",false);
        remove_hash();
    } else {
        var convo_index = $.inArray(convo,highlighted_convos);
        if (convo_index > -1){
            highlighted_convos.splice(convo_index,1);
            $(".sidebar_convo[data-convo='"+convo+"']").toggleClass("sidebar_convo_dim",true);
        } else {
            highlighted_convos.push(convo);
            $(".sidebar_convo[data-convo='"+convo+"']").toggleClass("sidebar_convo_dim",false);

        }
        var encoded_convos = highlighted_convos.map(function(e){return encodeURIComponent(e)});
        window.location.hash = encoded_convos.join("+#");

    }
    apply_filter();
    scroll();
    return;
}

function toggle_sidebar(){
    if ($('.sidebar').css("display") === 'none') {
        /* sidebar hidden, show it */
        $('.chats_container').css({width:''});
        $('.create').css({right:''});
        $('.sidebar').css({display:'block'});
        $('.sidebar_banner').css({display:'block'});
        $('#sidebar_hider').text('hide sidebar');
    } else {
        /* sidebar visible, show it */
        $('.chats_container').css({width:'100%'});
        $('.create').css({right:'0'});
        $('.sidebar').css({display:'none'});
        $('.sidebar_banner').css({display:'none'});
        $('#sidebar_hider').text('show sidebar');
    }
}

var convo_hover = false;

function draw_convos(){
    if (convo_hover){
        return;
    }
    $('.sidebar:first').empty();
    
    var div_start = $("<div class='sidebar_convo' style='font-weight:bold'>All</div>");
    div_start.attr("data-convo","All");
    div_start.on( 'mousedown', function( e ) {
        start = new Date().getTime();
    });

    div_start.on( 'mouseleave', function( e ) {
        start = 0;
    });

    div_start.on( 'mouseup', function( e ) {
        if ( new Date().getTime() >= ( start + longpress )  ) {
            //swap_to_convo("");
        } else {
            swap_to_convo("");
            //add_to_convos("");
        }
    });
    $('.sidebar:first').append(div_start);
    var div;
    var all_flag = 0;
    for (var i = 0; i < convos.length && i < 30; i++) {
        div = $("<div class='sidebar_convo'/>");

        var convo = (convos[convos.length - 1 - i]);
        div.attr("data-convo",convo);
        var op = convo_map[convo];

        var convo_html = $("<div/>")
            .attr("data-op", op);
        var convo_body_html = $("<div/>");
        var convo_title_html = $("<span/>");
        var img_cont = $("<img/>");
        img_cont.attr("src", $("#chat_"+op).find('.chat_img_cont').attr("href"));
        var convo_body_picture = "";
        if (img_cont.attr("src")) {
            convo_body_picture = $("<div>");
            convo_body_picture.append(img_cont
                .toggleClass('hidden',true)
                .toggleClass('convo_img',true)
                .css({maxWidth:'100%'}));
        }
        
        var maxHeight = 70;
        convo_body_html
        .append(convo_body_picture)
        .append($("#chat_" + op).find(".chat_body").html())
        .toggleClass('sidebar_convo_body', true);
        
        
        convo_title_html.text(convo).css({
            fontWeight:'bold',
            maxWidth:'100%'
        });
        
        convo_html.append(convo_body_html);
        convo_html.prepend(convo_title_html);
        convo_html.mouseover(function(e){
            convo_hover = true;
            //image_mouseover(this, e, $(this).attr("data-op"));
            //$(this).find('div').animate({maxHeight:1000}, 200);
            if (display)
                display.css(displayAlign, $('.sidebar').width() + 5 + 'px');
        }).mouseout(function(event){
            convo_hover = false;
            //$(this).find('div').animate({maxHeight:maxHeight+'px'},200, function(){
	        //    draw_convos();
            //});
			if (display === undefined) return;
            if (display.is("video")) {
                if (display[0].pause) display[0].pause();
                display.css("display", "none");
            } else {
                display.remove();
                display = undefined;
            }
        });

        div.append(convo_html);
    


        if($.inArray(convo,highlighted_convos)>-1){
            div.toggleClass("sidebar_convo_dim",false);
        } else {
            all_flag++;
            div.toggleClass("sidebar_convo_dim",true);
        }
        
        div.on( 'mousedown', function( e ) {
            start = new Date().getTime();
        });

        div.on( 'mouseleave', function( e ) {
            start = 0;
        });

        div.on( 'mouseup', function( e ) {
            if ( new Date().getTime() >= ( start + longpress )  ) {
                add_to_convo($(this).attr("data-convo"));
            } else {
                //add_to_convos($(this).text());
                swap_to_convo($(this).attr("data-convo"));
            }
        });
        
        $('.sidebar:first').append(div);
    }
    if (all_flag){
        div_start.toggleClass("sidebar_convo_dim",true);
    }

}

// Fullsize (if space allows) image/video displayed on hover
// made global to prevent breaking on new chats
var display;
var windowWidth, windowHeight; // dimensions of window containing full image/video
var frameLeft, frameTop;       // offset of subframe containing chat
var displayAlign;              // CSS position attribute to set: "left" or "right"
    
// Generate blank post element
function generate_post(id) {
    "use strict";
    var post = $(
        "<article class='chat'>" +
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
        "</article>"
    );
    post.attr("id", "chat_" + id);
   
    post.find(".delete_part")
        .click(function() {
            if (!window.confirm("Are you sure you want to delete this post?"))
                return;
            mod_delete_post(id, admin_pass);
        });
        
    post.find(".warn_part")
        .click(function() {
            if (!window.confirm("Are you sure you want to warn this poster?"))
                return;
            mod_warn_poster(id, admin_pass);
        });
        
    post.find(".move_part")
        .click(function() {
            if (!window.confirm("Are you sure you want to move this post?"))
                return;
            mod_move_post(id, admin_pass);
        });   
             
    post.find(".ban_part")
        .click(function() {
            if (!window.confirm("Are you sure you want to ban this poster?"))
                return;
            mod_ban_poster(id, chat_id, admin_pass);
        });
        
    post.find(".chat_label")
        .click(function() {
            set_channel(chat[id].chat, chat[id].count);
            return false;
        });

    post.find(".chat_convo")
        .mouseover(quote_mouseover)
        .mouseout(kill_excess)
        .click(function (e) {
            e.stopPropagation();
            $("#convo").val(chat[id].convo);
            apply_filter();
        });

    post.find(".chat_number")
        .text(id)
           .click(function () {
            if (chat_id === "all") {
                set_channel(chat[id].chat, chat[id].count);
            }
            quote(id);
        });


    if (future_ids[id] !== undefined) {
        post.find(".chat_refs").append(" ", future_ids[id].contents());
    }



    post.find(".chat_img_cont")
        .mouseover(function(event){image_mouseover(this, event, id)})
        .mousemove(function(event) {
            if (display === undefined) return;
            var xCorrected = frameLeft + event.clientX;
            var xPosition = (displayAlign === "left") ? xCorrected + 10 : windowWidth - (xCorrected - 10);
            var yTop = Math.round((windowHeight - display.height()) * (frameTop + event.clientY) / windowHeight);
            display.css(displayAlign, xPosition + 'px');
            display.css("top", yTop + 'px');
        })
        .mouseout(function(event) {
            if (display === undefined) return;
            if (display.is("video")) {
                if (display[0].pause) display[0].pause();
                display.css("display", "none");
            } else {
                display.remove();
                display = undefined;
            }
        })
        .on("wheel", function(event) {
            if (display !== undefined && display.is("video") && $("#volume").length !== 0) {
                var volume = parseFloat($("#volume").val());
                if (event.originalEvent.deltaY > 0) volume -= 0.1;
                if (event.originalEvent.deltaY < 0) volume += 0.1;
                if (volume < 0) volume = 0;
                if (volume > 1) volume = 1;
                display[0].volume = volume;
                display[0].muted = (volume == 0);
                $("#volume").val(volume);
                if (window.localStorage) localStorage.volume = volume;
                event.preventDefault();
            }
        })
        .click(function (e) {
            e.stopPropagation();
        });

    return post;
}

/*
Parser object
- text = string to be parsed
*/
function Parser(text) {
    this.text = text;
    this.position = 0;
}

function get_youtube_data(y_id, element){
    $.ajax({
            type: "GET",
            url: location.protocol+'//'+location.host+'/youtube_data/'+y_id,
            dataType: "json",
            success: function (xml) {
                element.text(xml.data.title);
            }
        });
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

/*
Pass in post data, and this function will draw the post on the screen, or update it if it already exists.
first_load will disable fade-in animation, redrawing of convo list, and blinking title.
*/
function update_chat(new_data, first_load) {
    "use strict";
    // Check if this post number already exists
    var id = new_data.count;
    if (id === undefined) return;
    var new_post = (chat[id] === undefined || id == 0);

    // Find post element or create blank one
    var post = new_post ? generate_post(id) : $("#chat_" + id);

    // Find old post data object or create empty one
    if (new_post) chat[id] = {};
    var data = chat[id];

    // Populate post data object and mark new/changed fields
    var changed = {};
    var key = null;
    for (key in new_data) {
        changed[key] = (data[key] !== new_data[key]);
        data[key] = new_data[key];
    }

    // Populate post element with new/changed fields
    if (changed.chat && chat_id === "all") {
        post.find(".chat_label")
            .css("display", "inline")
            .attr("href", "/chat/" + data.chat + "#" + id)
            .text("/" + data.chat);
    }
    
    if (changed.name) {
        post.find(".name_part").text(data.name);
    }
    
    if (changed.identifier) {
    	post.find(".chat_identifier")
        .text(data.identifier.slice(50))
        .css({
	        background:'white'
        });
    }
    
    if (changed.country || (special_trips.indexOf(data.trip)>-1)) {
    	if (data.trip == "!!SxKC741YKw") {
    		var country = $("<img src='/icons/irc.png' style='height:10px;margin-bottom:1px;'/>");
	        country_name = "IRC";
	        post.find(".flag").attr("data-country", country_name);
	        post.find(".flag").prepend(country);
	    } else if (hidden_trips.indexOf(data.trip) > -1) {
	    	switch (data.trip) {
	    	case "!xeE5csyhAE":
	    		var country = $("<img src='/icons/countries/FASC.png'/>");
		        country_name = "Fascist";
		        post.find(".flag").attr("data-country", country_name);
		        post.find(".flag").prepend(country);
		        break;
		    default:
		    	var country = $("<img src='/icons/countries/GAY.png'/>");
		        country_name = "Hidden With Pride";
		        post.find(".flag").attr("data-country", country_name);
		        post.find(".flag").prepend(country);
		        break;
	    	}
    		
    	} else if (bots.indexOf(data.trip) > -1) {
    		var country = $("<img src='/icons/bot.png' style='height:20px;margin-bottom:-3px;'/>");
	        country_name = "anna";
	        post.find(".flag").attr("data-country", country_name);
	        post.find(".flag").prepend(country);
    	} else {
	        var country_name = "";
	        //if (special_countries.indexOf(data.country)>-1) {
	        if (data.country[2] == "-") {
	            var state = $("<img src='/icons/countries/"+data.country+".png'/>");
	            post.find(".flag").prepend(state);
				if (special_countries && data.country in special_countries) {
					country_name += special_countries[data.country]+", ";
				} else {
	            	country_name += data.country.slice(3)+", ";
	            }
	        }
	        var country = $("<img src='/icons/countries/"+data.country.slice(0,2)+".png'/>");
	        country_name += data.country_name ? data.country_name : data.country;
	        post.find(".flag").attr("data-country", country_name);
	        post.find(".flag").prepend(country);
        }
        post.find(".flag").click(function(){
        	var language;
        	if (window.navigator) language = window.navigator.userLanguage || window.navigator.language;
        	if (!language) language = "en";
        	language = language.slice(0,2);
        	ajaxTranslate(post.find(".chat_body").text(), "", language, function(data){
	        	post.find(".chat_body").append($("<span>").text(data).prepend($("<br>")));
        	});	
        	post.find(".flag").unbind("click");
        })
    }
    if (changed.trip) {
        var special = ($.inArray(data.trip, special_trips)>-1);
        var contrib = ($.inArray(data.trip, contribs) > -1);
        var admin = ($.inArray(data.trip, admins) > -1);
        var dev = ($.inArray(data.trip, devs) > -1);
        post.find(".trip_code")
						.text(data.trip)
            .toggleClass("hidden", special || admin || dev || contrib);
        var addend = dev ? " ## Developer" : "";
        addend = admin ? " ## Mod" : addend;
        post.find(".chat_name")
            .toggleClass("contrib", contrib)
            .toggleClass("admin", admin)
            .toggleClass("dev", dev)
            .append(addend);
    }
    if (changed.convo || changed.convo_id) {
        var is_op = (data.convo_id === data.count);
        if (data.convo !== "" && data.convo !== "General" &&
            $.inArray(data.convo, Object.keys(convo_map)) < 0){
            convo_map[data.convo] = data.convo_id;
        }
        post.toggleClass("convo_op", is_op);
        var chat_convo = post.find(".chat_convo");
        chat_convo
		.text(data.convo + (is_op ? " (OP)" : ""))
        .css({
        	background:getRandomColor(hashString(data.convo))
        });
        if (!is_op) chat_convo.data("dest", data.convo_id);
    }
    if (changed.convo || new_post) {
        apply_filter(post);
    }
    if (changed.date) {
        var date = new Date(data.date);
        date = (date == "NaN") ? data.date : date.toLocaleString();
        post.find(".chat_date").text(date);
    }
    if (changed.image || changed.thumb) {
        post.find(".chat_file").css("display", data.image ? "block" : "none");
        var audio_container = post.find(".chat_audio_cont");
        audio_container.empty();
        var img_container = post.find(".chat_img_cont");
        img_container.empty();

        if (data.image) {
            var base_name = data.image.match(/[\w\-\.]*$/)[0];
            var extension = base_name.match(/\w*$/)[0];
            var url_file = "/tmp/uploads/" + base_name;

            post.find(".file_link")
                .attr("href", url_file)
                .text(base_name);

            if (extension === "ogg") {
                audio_container.append($("<audio/>").attr({src: url_file, controls: "controls"}));
            }

            var url_static = null;
            if (data.thumb) {
                url_static = "/tmp/thumb/" + data.thumb.match(/[\w\-\.]*$/)[0];
            } else if ($.inArray(extension, ["jpg", "jpeg", "png"]) > -1) {
                url_static = url_file;
            }
            var url_anim = url_static;
            if (extension === "gif") {
                url_anim = url_file;
            }

            img_container.attr("href", url_file);
            img_container.css("height", (url_static !== null || url_anim !== null) ? 104 : 0);
            if (url_static !== null) {
                img_container.append($("<img class='chat_img thumb_static'>").attr("src", url_static));
            }
            if (url_anim !== null) {
                img_container.append($("<img class='chat_img thumb_anim'>").attr("src", url_anim));
            }
            img_container.find(".chat_img")
                .css("display", "none")
                .attr("alt", "Image #" + data.count);

            if ($("#thumbnail_mode").val() === "static") img_container.find(".thumb_static").css("display", "inline");
            if ($("#thumbnail_mode").val() === "animated") img_container.find(".thumb_anim").css("display", "inline");
        }
    } 
    if (changed.image || changed.image_filesize || changed.image_width || changed.image_height || changed.image_filename) {
        var data_items = [];
        if (data.image_filesize !== undefined) {
            data_items.push(humanFileSize(data.image_filesize, false));
        }
        if (data.image_width !== undefined && data.image_height !== undefined) {
            data_items.push(data.image_width + "x" + data.image_height);
        }
        if (data.duration !== undefined) {
            var minutes = Math.floor(data.duration / 60);
            var seconds = data.duration - 60 * minutes;
            if (minutes > 0) {
                data_items.push(minutes + ":" + ("00" + Math.round(seconds)).slice(-2));
            } else {
                data_items.push(seconds.toPrecision(3) + "s");
            }
        }
        if (data.image_filename !== undefined) {
            data_items.push(data.image_filename);
        }
        if (data_items.length > 0) {
            post.find(".file_data").text("-(" + data_items.join(", ") + ")");
        } else {
            post.find(".file_data").text("");
        }
    }
    if (changed.body) {
        // Remove any old backlinks to this post
        if (quote_links_to[id] !== undefined) {
            $.each(quote_links_to[id], function() {
                if (this.hasClass("back_link")) this.remove();
            });
        }

        // Process body markup
        var ref_ids = [];
        var rules = [
            [/>>>\/([a-z0-9]+)(?:[#\/](\d+))?/g, function(m, o) {
                o.push(board_link(m[1], m[2]));
            }],
            [/(?:\{(\d+)\}|>>(\d+))/g, function(m, o) {
                var ref_id = parseInt(m[1] ? m[1] : m[2], 10);
                if ($.inArray(ref_id, ref_ids) === -1) ref_ids.push(ref_id);
                o.push(quote_link(ref_id));
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
                get_youtube_data(m[1],elem);
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
        var body = new Parser(data.body).parse(rules);
        post.find(".chat_body").empty().append(body);
        
        var for_you = /\(You\)/.test(post.find(".quote_link").text());
        
        if (for_you) {
			post.toggleClass("chat_highlight", true);
		}
		
		if (admin_pass != "" && /(admin|dev(eloper)?)/.test(post.find(".chat_body").text().toLowerCase())) {
			post.toggleClass("chat_highlight", true);
			for_you = true;
		}
		
		if (highlight_regex && highlight_regex.test(post.find(".chat_body").text().toLowerCase())) {
			post.toggleClass("chat_highlight", true);
			for_you = true;
		}

        // Create new backlinks
        $(ref_ids).each(function () {
            var link = quote_link(id);
            link.addClass("back_link");
            var their_refs = $("#chat_" + this + " .chat_refs");
            if (their_refs.length === 0) {
                if (future_ids[this] === undefined) future_ids[this] = $("<output />");
                future_ids[this].append(" ", link);
            } else {
                their_refs.append(" ", link);
            }
        });
    }

    if (new_post) {
        // Place post conversation at top of list
        var convo_index = $.inArray(data.convo, convos);
        if (convo_index < 0) {
            convos.push(data.convo);
            //highlighted_convos.push(data.convo);
        } else {
            convos.splice(convo_index,1);
            convos.push(data.convo);
        }
        if (!first_load) draw_convos();

        // Activate blinking title to notify user of new posts
        if (!first_load) notifications(data.convo, for_you);

        // Insert post into chat (with fade-in animation if not first load)
        if (!first_load) {
            post.css('opacity', '0');
        }
        
        if (!first_load) {
	        var keys = Object.keys(chat);
	        var count_convo = 0;
	        for (var k in keys) {
	        	if (data.convo === chat[keys[k]].convo)
	        		count_convo++;
	        }
	        if ($("#autoscroll").prop('checked')) {
		        while (count_convo > max_chats) {
				    var i = 0;
				    while (data.convo !== chat[keys[i]].convo || chat[keys[i]].convo_id === chat[keys[i]].count) {
				    	i++;
				    }
				    
				    var old_chat = keys[i];
				    $("#chat_"+old_chat).remove();
				    delete chat[old_chat];
					keys = Object.keys(chat);
				    count_convo--;
			    }
		    }
	    }
	    
        
        insert_post(post, data.chat);
        if (!first_load) {
            post.animate({
                opacity: 1
            }, 300, 'swing', function () {
            });
        }
    }
    
    $(".spoiler").toggleClass("spoiled", !$('#spoilers').prop("checked"));
}

function draw_chat(data) {
    "use strict";
    var i;
    for (i = data.length - 1; i >= 0; i--) {
        update_chat(data[i], true);
    }
    setup_convos(entry_hash);
}


/* scroll to bottom of the channel if it is on the page or of all channels on page */
function scroll(channel) {
    "use strict";
    if (chat_id=="home") return;
    if (channel) {
        scr = $(".chats[data-channel='"+channel+"'")[0].scrollHeight;
        return;
    }
    var i;
    for (i = 0; i < $('.chats').length; i++) {
        var scr = $('.chats')[i].scrollHeight;
        scr += 10;
        $('.chats').eq(i).animate({
            scrollTop: scr
        }, 200, 'swing', function () {
        });
    }
}

/* window blinker (DONT CALL THIS DIRECTLY) */
function notifications(post_convo, for_you) {
    "use strict";
    if (window_focus === false && ($('#convo_filter').val() !== 'filter' || post_convo === get_convo())) {
    	if (for_you) {
    		changeFavicon("/favicon-blue.png");
    	}
        unread_chats++;
        clearInterval(window_alert);
        window_alert = setInterval(function () {
            if (!blink) {
                window.document.title = '(' + unread_chats + ') ' + title;
            } else {
                window.document.title = title;
            }
            blink = !blink;

        }, 1500);
    }
}

/* return convo with check for empty */
function get_convo() {
    "use strict";
    var convo = $('#convo').val();
    return (convo === "") ? "General" : convo;
}

/* filters out convos not in the highlighted_convo list */
function apply_filter(posts) {
    "use strict";
    if (posts === undefined) {
        posts = $('.chats_container .chat');
    }
    var convo = get_convo();
//    var value = $('#convo_filter').val();
    posts.toggleClass('chat_dim', false);
    posts.toggleClass('chat_hidden', false);

/*    if (value === "highlight"){
        posts.toggleClass(function () {
            var id = parseInt(this.id.match(/\d+/)[0], 10);
            return ($.inArray(chat[id].convo, highlighted_convos) > -1) ? '' : 'chat_dim';
        }, true);
    } else if (value === "filter"){*/
        posts.toggleClass(function () {
            var id = parseInt(this.id.match(/\d+/)[0], 10);
            return ($.inArray(chat[id].convo, highlighted_convos) > -1) ? '' : 'chat_hidden';
        }, true);
   // }
}

/* adds post to chats div, based on channel if more than one chat */
function insert_post(post, channel) {
    "use strict";
    if ($('.chats').length == 1) {
        post.appendTo($(".chats:first"));
    }
    else {
        post.appendTo($(".chats[data-channel='"+channel+"']"));
    }
    

    var max_attempt = 10;
    
    function expand_post(attempt){
        if (attempt>=max_attempt || post.height()>0) {
            if (post[0].offsetHeight < post[0].scrollHeight) {
                var expand_button = $("<a>[+]</a>");
                expand_button.css({
                   paddingLeft:"5px"
                });
                expand_button.click(function(e){
                    e.stopPropagation();
                    expand_button.parent().parent().toggleClass('chat_full');
                    var new_text = expand_button.text() == "[+]" ? "[-]" : "[+]";
                    expand_button.text(new_text);
                });
                post.find('.chat_header').append(expand_button);
            }  
            clearInterval(post_exists);
            return;
        } else {
            expand_post(attempt+1);
        }
    }
    
    var post_exists = setInterval(function(){
        expand_post(0);
    }, 500); /* DOM takes forever */

    return;
}

/* ALPHA STAGES, this function is unstable and uncalled TODO: make it work */
function split_channel(channel){
    if ($('.chats').length == 2) return;
    $('.chats_connected').toggleClass('chats_half',true);
    $('.chats:first').attr('data-channel', chat_id);
    var new_chats = $('.chats:first').clone();
    new_chats.empty();
    new_chats.css('left','50%');
    new_chats.attr('data-channel', channel);
    $('.chats_container').append(new_chats);
    get_chat_data(channel);
    socket.emit('subscribe', channel);
}

/* pulls the data */
function pull_chats(channel, convo) {
	$.ajax({
        type: "GET",
        url: "/data/" + channel
    }).done(function (data_chat) {
        draw_data = draw_data.concat(data_convo, data_chat);
        draw_data.sort(function(a, b) {return b.count - a.count;});
        draw_chat(draw_data);
        $('.chats').toggleClass('shown', true);
        on_chat = function(d) {
            update_chat(d);
            if($("#autoscroll").prop('checked')) {
                var current_hover = $(".chat_img_cont:hover");
                if (current_hover.length == 0) {
                    scroll();
                } else {
                    function deferred_scroll() {
                        current_hover.off("mouseout", deferred_scroll);
                        scroll();
                    }
                    current_hover.on("mouseout", deferred_scroll);
                }
            }
        };
        setTimeout(function() {
            if (new_post !== "") {
                if ($("#chat_"+linked_post).length) $("#chat_"+linked_post)[0].scrollIntoView();
            } else {
                scroll();
            }
        }, 100);
    });
}

/* sets the channel and starts up the chat */
function set_channel(new_channel, new_post, no_push_state, tab) {
    if (!new_post) new_post = "";

	// save old stuff
	if (tab){
		var tab = $("<span>")
			.click(function(){
				set_channel(new_channel, null, null, true);
			})
			.attr("id", "tab_"+new_channel)
			.toggleClass("chat_tab",true)
			.text(new_channel);
		if (new_channel in all_chats){
			$("#tab_"+new_channel).remove()
		}
		$("#tabs").prepend(tab)

		
		all_chats[chat_id] = {
			sidebar:$('.sidebar').html(),
			convo:$('#convo').html(),
			chats:$('.chats').html(),
			chat:chat,
			convos:convos
		};
		if (all_chats['current_chat']){
			$("#tab_"+all_chats['current_chat']).toggleClass("chat_tab_dim",true);
		} else {
/*			$("#tabs").append(
				$("<span>")
				.click(function(){
					set_channel(chat_id, null, null, true);
				})
				.attr("id", "tab_"+chat_id)
				.toggleClass("chat_tab",true)
				.toggleClass("chat_tab_dim",true)
				.text(chat_id)
			);*/
		}
		
		all_chats['current_chat'] = new_channel;
		
	} else {
	    // unsubscribe from any previous channel
	    if (chat_id && chat_id !== "home") {
	        socket.emit('unsubscribe', chat_id);
	    }
	}

    // clear old stuff
    $('.sidebar').empty();
    $('#convo').val('');
    $('.chats').empty();
    chat = {};
    convos = ["General"];

    // indicate new channel
    $('#board_select').val(new_channel);
    $('#comment-form').attr('action', '/chat/' + new_channel);
    title = "livechan" + (new_channel === "home" ? "" : " - /" + new_channel);
    window.document.title = title;

    // hide form, sidebar on /home, /all pages
    var show_form = (new_channel !== "all" && new_channel !== "home");
    $('.chats_container').toggleClass('chats_container_home', !show_form);
    $('.chats').toggleClass('chats_connected', show_form);
    $('.create, .sidebar, .alert_div').toggleClass('shown', show_form);

    // turn on autoscroll unless linking to post
    $("#autoscroll").prop('checked', new_post === "");

    // enter into history
    if (!no_push_state && history.pushState) {
        var state_data = {channel: new_channel, post: new_post};
        var chat_path = window.location.pathname.replace(/[^\/]*$/, "") + new_channel;
        if (chat_id) {
            history.pushState(state_data, title, chat_path);
        } else {
            history.replaceState(state_data, title, chat_path);
        }
    }

    // set new channel
    chat_id = new_channel;
    linked_post = new_post;

	if (new_channel in all_chats) {	
	    // restore old stuff
	    $('.sidebar').html(all_chats[new_channel].sidebar);
	    $('#convo').val(all_chats[new_channel].convo);
	    $('.chats').html(all_chats[new_channel].chats);
	    chat = all_chats[new_channel].chat;
	    convos = all_chats[new_channel].convos;

	} else if (new_channel !== "home") {
        // subscribe to new channel
        socket.emit('subscribe', new_channel);

        // get posts
        var draw_data = [];
        on_chat = function(data) {
            draw_data.push(data);
        }
        $.ajax({
            type: "GET",
            url: "/data_convo/" + new_channel
        }).done(function (data_convo) {
            $.ajax({
                type: "GET",
                url: "/data/" + new_channel
            }).done(function (data_chat) {
                draw_data = draw_data.concat(data_convo, data_chat);
                draw_data.sort(function(a, b) {return b.count - a.count;});
                draw_chat(draw_data);
                $('.chats').toggleClass('shown', true);
                on_chat = function(d) {
                    update_chat(d);
                    if($("#autoscroll").prop('checked')) {
                        var current_hover = $(".chat_img_cont:hover");
                        if (current_hover.length == 0) {
                            scroll();
                        } else {
                            function deferred_scroll() {
                                current_hover.off("mouseout", deferred_scroll);
                                scroll();
                            }
                            current_hover.on("mouseout", deferred_scroll);
                        }
                    }
                };
                setTimeout(function() {
                    if (new_post !== "") {
                        if ($("#chat_"+linked_post).length) $("#chat_"+linked_post)[0].scrollIntoView();
                    } else {
                        scroll();
                    }
                }, 100);
            });
        });
    } else {
        $('.chats').append($('.home_screen').contents().clone());
        $('.chats').toggleClass('shown', true);
        $('.chats .chat').toggleClass('chat_full',true);
        $('.chats a').click(function() {
            var match = this.href.match(/^\/chat\/([^\/]+)$/);
            if (match) {
                set_channel(match[1]);
                return false;
            }
        });
    }

    if (new_channel !== "home" && new_channel !== "all" && get_cookie("password_livechan") === '') {
        submit_captcha();
    }
}

/* scrolls to a given post */
function scroll_to_post(new_post, no_push_state) {
    // enter into history
    if (!no_push_state && history.pushState) {
        var state_data = {channel: chat_id, post: new_post};
        var chat_path = window.location.pathname.replace(/[^\/]*$/, "") + chat_id;
        if (/^#?$/.test(window.location.hash)) {
            history.pushState(state_data, title, chat_path);
        } else {
            history.replaceState(state_data, title, chat_path);
        }
    }

    linked_post = new_post;
    if (new_post !== "") {
        if ($("#chat_"+new_post).length) $("#chat_"+new_post)[0].scrollIntoView();
    } else {
        scroll();
    }
    $("#autoscroll").prop('checked', new_post === "");
}

var entry_hash;
function setup_convos(string){
    //string = decodeURIComponent(string);
    if (string == null || string.match(/#[^+]+/g) == null) {
        highlighted_convos = ["General"];//convos.slice(0);
        draw_convos();
                apply_filter();
        return;
    }
    var convo_array = string.match(/#[^+]+/g);

    convo_array = convo_array.map(function(elem){return decodeURIComponent(elem.slice(1))});
    swap_to_convo(convo_array[0]);
    for (i in convo_array.slice(1)){
        add_to_convo(convo_array.slice(1)[i]);
    }
    //highlighted_convos = convo_array;
    entry_hash = null;
    draw_convos();
    
}

$(document).ready(function () {
    "use strict";
    
    // setup home * HACKY HACKY HACKY *
/*    if (window.location.pathname === "/chat/home"){
        var all_frame = $("<iframe/>");
        all_frame.attr("src", "/all")
        .attr("class", "all_frame")
        .css({
            border:'none',
            padding:'0',
            margin:'0',
            position:'absolute',
            width:'350px',
            right:'0',
            height:'100%',
            zIndex: '0'
        });
        $('body').prepend(all_frame);
        
        $('.chats_container')
        .css({
        	right:'345px'
        });
    }
    
    if (self!=top && parent.document.location.pathname === "/chat/home"){
        $('.header').remove();
    }*/
    
    //if (window.location.pathname === "/chat/int"){
    	$.getJSON('/json/regioncodes.json', function (data) {
		    special_countries = data;
		});
    //}
  
    // setup scrolling
    $('.chats').scroll(function() {
        var scrolled = $(this).height() + $(this).scrollTop();
        $('#autoscroll').prop("checked", scrolled >= $(this)[0].scrollHeight - 5);
    });

    // setup notifications
    $(window)
        .focus(function () {
            unread_chats = 0;
            changeFavicon("/favicon.png");
            window.document.title = title;
            clearInterval(window_alert);
            window_focus = true;
        })
        .blur(function () {
            window_focus = false;
        });

    // setup history
    $(window).on('popstate', function(event) {
        var state = event.originalEvent.state;
        if (!state) return;
        if (state.channel !== chat_id) {
            set_channel(state.channel, state.post, true);
        } else {
            scroll_to_post(state.post, true);
        }
    });

    // deal with hash changes
    $(window).on("hashchange", function() {
        var matched_link = window.location.hash.match(/^#(\d+)$/);
        if (matched_link) scroll_to_post(matched_link[1]);
    });
    
    entry_hash = window.location.hash;

});
