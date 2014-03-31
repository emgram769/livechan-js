/*
	LiveChan is a live imageboard web application.
    Copyright (C) 2014 LiveChan Team

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

var auto_post = false;
var last_post = "";
var cool_down_timer = 0;
var cool_down_interval;
var admin_mode = false;

var socket = null;

var html5 = false;
try {
    html5 = (window.localStorage !== undefined && window.localStorage !== null);
} catch (e) {
    html5 = false;
}
var submit_beta = false;

var default_theme = "/style.css";

/* stuff to do on load */
$(document).ready(function () {
    "use strict";

    /* set up socket */
    socket = io.connect('/', {secure: (location.protocol === "https:")});
    socket.on('chat', function(data) {on_chat(data);});
    socket.on('refresh', function() {setTimeout(function(){location.reload();},5000)});

	/* key bindings for actions */
    $("#name").keydown(function (event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            return false;
        }
    });

    $("#convo").keydown(function (event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            return false;
        }
    });

    $("#body").keydown(function (e) {
        if (!e.shiftKey && e.keyCode === 13) {
        	var msg = $("#body").val();
            if ($("#autosubmit").prop('checked') && cool_down_timer <= 0 && !$("#submit_button").prop("disabled")
            	|| msg.indexOf('//') !== 0 && msg.indexOf('/') === 0) { /* no delay if command */
                submit_chat();
            } else {
                auto_post = true;
                $("#submit_button").prop("value", "Submit (Auto)");
            }
            return false;
        }
    });

	/* hacky processing request responses */
    $('iframe#miframe').load(function () {
    	var resp;
    	try {
        	resp = JSON.parse($($("#miframe").contents()[0].body).text());
        } catch (e) {
	    	resp =  {failure:$($("#miframe").contents()[0].body).text()};
        }
        if (resp.failure && resp.failure === "session_expiry") {
        	$("#body").val(last_post);
		submit_captcha();
        } else if (resp.failure) {
            div_alert(resp.failure);
            init_cool_down();
        } else if (resp.id && $.inArray(resp.id, my_ids) < 0) {
            clear_fields();
            init_cool_down();
            my_ids.push(resp.id);
            if (html5) {
                localStorage.my_ids = JSON.stringify(my_ids);
            }
            if (quote_links_to[resp.id]) {
                $.each(quote_links_to[resp.id], function() {
                    $(this).text($(this).text() + " (You)");
                });
            }
        } else if (resp.success === "captcha") {
            $("#submit_button").prop("disabled", false);
            $("#alert_div_captcha").remove();
            if (auto_post) {
                submit_chat();
            }
        }
    });
    
    $(document).bind('click', function(e){
	   	$('.settings_nav:first').hide('slow');
    });
    
    $('#settings_button').bind('click', function(e){
    	e.stopPropagation();
	    $('.settings_nav:first').toggle('slow');
	    $('.settings_nav').bind('click', function(e2){
	    	 e2.stopPropagation();
		});

    });

    $('#convo, #convo_filter').change(function () {
        apply_filter();
    });

    $('#theme_select').change(function () {
        get_css($(this).val());
        if (html5) localStorage.theme = $(this).val().replace("null", default_theme);
        setTimeout(scroll, 300);
    });

    $('#spoilers').change(function () {
        if (html5) localStorage.spoilers = $(this).prop("checked");
		$('.spoiler').toggleClass('spoiled', !$(this).prop("checked"));
    });

    $('#volume').change(function () {
        if (html5) localStorage.volume = $(this).val();
    });
    
    $('#board_select').change(function () {
        var board = $(this).val();
        if (board=="")
            return;
        set_channel(board);
    });

    var prev_thumbnail_mode = $("#thumbnail_mode").val();
    $("#thumbnail_mode").change(function () {
        var new_value = $(this).val();
        if (prev_thumbnail_mode === "links-only") {
            $('.chat_img_cont').show('slow', function(){
	            scroll();
            });
            if (new_value === "static") $('.thumb_static').show('slow');
            if (new_value === "animated") $('.thumb_anim').show('slow');
        } else if (new_value === "links-only") {
            $('.chat_img_cont').hide('slow');
            if (prev_thumbnail_mode === "static") $('.thumb_static').hide('slow');
            if (prev_thumbnail_mode === "animated") $('.thumb_anim').hide('slow');
        } else {
            $('.thumb_static').css("display", (new_value === "static") ? "inline" : "none");
            $('.thumb_anim').css("display", (new_value === "animated") ? "inline" : "none");
        }
        prev_thumbnail_mode = new_value;
    });

    set_up_html();

    $('#clearconvo').change(function() {
        if (html5) {
	        if($(this).prop("checked"))
	            localStorage.clearConvo = "true";
	        else
	            localStorage.clearConvo = "false";
        }
	});
});

/* load up css into the page */
function get_css(file) {
    "use strict";
    if ($('#css_new')) {
        $('#css_new').remove();
    }
    var head = document.getElementsByTagName('head')[0];
    var link = document.createElement('link');
    link.id = 'css_new';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = '/css'+file;
    link.media = 'all';
    $('head').append(link);
    if ($('#css_highlight_new')) {
        $('#css_highlight_new').remove();
    }
    var head = document.getElementsByTagName('head')[0];
    var link = document.createElement('link');
    link.id = 'css_highlight_new';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = '/plugins/code_highlight/css'+file;
    link.media = 'all';
    $('head').append(link);
}

function set_up_html(){
	if (html5) {
        /* set up only html5 local storage stuff */
	    if (false || localStorage.reset === "true") {
	        // set to true to reset local storage to defaults
	        localStorage.my_ids = "[0]";
	        localStorage.contribs = "[\"0\"]";
	        localStorage.name = "";
	        localStorage.theme = default_theme;
	        localStorage.clearConvo = "false";
	        localStorage.reset = "false";
	    }
	    my_ids = localStorage.my_ids;
	    if (my_ids) {
	        my_ids = JSON.parse(my_ids);
	    } else {
	        my_ids = [];
	    }
	
	    contribs = localStorage.contribs;
	    if (contribs) {
	        contribs = JSON.parse(contribs);
	    } else {
	        contribs = default_contribs;
	    }
	
	    /*if (!localStorage.theme || localStorage.theme === "null") {
	        localStorage.theme = "/style.css";
	    }*/
	

        if (localStorage.name !== undefined) $("#name").val(localStorage.name);
        if (localStorage.spoilers !== undefined) $("#spoilers").prop("checked", localStorage.spoilers === "true");
        if (localStorage.theme !== undefined) $("#theme_select").val(localStorage.theme);
        if (localStorage.clearConvo !== undefined) $("#clearconvo").prop("checked", localStorage.clearConvo === "true");
        if (localStorage.volume !== undefined) $("#volume").val(localStorage.volume);
        cool_down_timer = localStorage.cool_down_timer ? parseInt(localStorage.cool_down_timer) : 0;
    }

    if (cool_down_timer>0)
    	init_cool_down();
    if (!$("#theme_select").val() || $("#theme_select").val() === "null" || !$("#theme_select").val().replace(/^\s+|\s+$/gm, '')) {
        $("#theme_select").val(default_theme);
    }
    get_css($("#theme_select").val());

    var board = window.location.pathname.match(/[^\/]*$/)[0];
    var matched_link = window.location.hash.match(/^#(\d+)$/);
    set_channel(board, matched_link ? matched_link[1] : "");
}

/* give me captcha TODO: clean this up and make it work better */
function captcha_div() {
    "use strict";
    return '<img src="/captcha.jpg#' + new Date().getTime() + '" alt="Lynx is best browser" /><form action="/login" method="post" target="miframe"><br /><input type="text" name="digits" /></form>';
}

/* gets cookie, use this function instead of document.cookie */
function get_cookie(cname) {
    "use strict";
    var name = cname + "=";
    var ca = document.cookie.split(';');
    var i = 0;
    var c = null;
    for (i = 0; i < ca.length; i++) {
        c = ca[i].replace(/^\s+|\s+$/gm, '');
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

/* alert whatever error was given to you by the server */
function div_alert(message, add_button, div_id) {
    "use strict";
    if (add_button === undefined) {
        add_button = true;
    }
    if (div_id === undefined) {
        div_id = "";
    }
    var alert_div = document.createElement('aside');
    alert_div.setAttribute('class', 'alert_div ' + (chat_id !== 'home' && chat_id !== 'all' ? "shown" : ""));
    alert_div.setAttribute('id', 'alert_div_' + div_id);
    var button_html = "<button class='alert_button' onclick='$(\"#alert_div_" + div_id + "\").remove();'>Close</button>";
    /*if (!add_button) {
        button_html = "";
    }*/
    alert_div.innerHTML = "<article class='alert_message'>" + message.replace(/\r?\n/g, '<br />') + "</article>" + button_html;
    $(alert_div).css({
        position: 'fixed',
        background: 'white',
        width: '300px',
        bottom: '160px',
        left: document.width / 2 - 150,
        border: '1px black solid',
        zIndex: 1000
    });
    $('.chats:first').append(alert_div);
}

/* clear input fields */
function clear_fields() {
    "use strict";
    $("#image").val('');
    $("#body").val('');
    $("#sum").val('');
    if($("#clearconvo").prop("checked")
       && $('#convo_filter').val() !== 'filter') {
    	$("#convo").val('');
    }
}

/* the cool down function (DO NOT CALL THIS DIRECTLY) */
function cool_down() {
    "use strict";
    if (html5) {
    	localStorage.cool_down_timer = cool_down_timer;
	}
    if (cool_down_timer <= 0) {
        clearInterval(cool_down_interval);
        $("#cool_down").text("");
        $("#submit_button").prop("disabled", false);
        if (auto_post) {
            submit_chat();
        }
    } else {
        $("#cool_down").text(cool_down_timer);
        $("#submit_button").prop("disabled", true);
        cool_down_timer--;
    }
}

/* start a cool down, resets the interval, so no worries about calling ti twice */
function init_cool_down(){
	    $("#submit_button").prop("disabled", true);
        clearInterval(cool_down_timer);
        cool_down();
        cool_down_interval = setInterval(cool_down, 1000);
}

/* simply ask for the captcha TODO: this is buggy, needs to be fixed */
function submit_captcha(){
        div_alert(captcha_div(), false, "captcha");
        $("#submit_button").prop("disabled", true);
}

/* initial code for migration to socket.io data transfer */
function submit_chat_beta(){
	var file = $("input:file")[0].files[0];
    var stream = ss.createStream();

    // upload a file to the server.
    ss(socket).emit('upload', stream, {
    	size: file.size,
    	name: file.name, 
    	type: file.type
    });
   
    ss.createBlobReadStream(file).pipe(stream);
}

/* prompt for admin password */
function prompt_password(callback) {
    var pw_div = $("<div style='position: absolute; z-index: 1000; text-align: center; background: white;'>Admin password:<br><input type='password'></div>");
    pw_div.css({
        top: ($(window).height()-pw_div.height())/2 + "px",
        left: ($(window).width()-pw_div.width())/2 + "px"
    });
    var pw_field = pw_div.find('input');
    pw_div.keypress(function(e) {
        if (e.keyCode === 13) { // enter
            pw_div.remove();
            callback(pw_field.val());
        }
    });
    pw_div.keyup(function(e) {
        if (e.keyCode === 27) { // escape
            pw_div.remove();
            callback(null);
        }
    });
    pw_field.blur(function(e) {
        pw_div.remove();
        callback(null);
    });
    $("body").append(pw_div);
    pw_field.focus();
}

/* this is currently a POST request TODO: adapt to socket.io websocket request */
function submit_chat() {
    "use strict";
	
    if($.inArray($("#convo").val(), convos) < 0 && $("#convo").val() !== "")
        cool_down_timer+=14;
	
    last_post = $("#body").val();
    if (get_cookie("password_livechan") === '') {
		submit_captcha();
        $("#submit_button").prop("value", "Submit (Auto)");
        auto_post = true;
        return false;
    }
    
    $("#submit_button").prop("value", "Submit");
    
    auto_post = false;
    
    if (html5) {
        localStorage.name = $("#name").val();
        localStorage.theme = $("#theme_select").val();
    }

    if ($("#body").val() === '') {
        $("#body").val("  ");
    }
    
    var msg = $("#body").val();
    if (msg.indexOf('//') !== 0 && msg.indexOf('/') === 0) {
        var cmdend = msg.indexOf(' ');
        if (cmdend <= 0) {
            cmdend = msg.length;
        }
        var cmd = msg.substring(1, cmdend).replace("\n", '');
        var param = msg.substring(cmdend + 1, msg.length).replace("\n", '');
        $("#body").val('');
        switch (cmd) {
        case "addtryp":
            if (param) {
                contribs.push(param);
                if (html5) {
                    localStorage.contribs = JSON.stringify(contribs);
                }
            } else {
                div_alert("usage: /addtryp !tripcode");
            }
            break;
        case "remtryp":
            if (param) {
                var idx = $.inArray(param, contribs);
                if (idx > -1) {
                    contribs.splice(idx, 1);
                    if (html5) {
                        localStorage.contribs = JSON.stringify(contribs);
                    }
                }
            } else {
                div_alert("usage: /remtryp !tripcode");
            }
            break;
        case "j":
        case "join":
            if (param) {
                window.open('http://' + document.location.host + '/chat/' + param.replace('/', ''));
            } else {
                div_alert("usage: /join /channel");
            }
            break;
        case "s":
        case "switch":
            if (param) {
                set_channel(param.replace('/', ''))
            } else {
                div_alert("usage: /switch /channel");
            }
            break;    
       case "split":
            if (param) {
                split_channel(param.replace('/', ''))
            } else {
                div_alert("usage: /split /channel");
            }
            break;
        case "delete":
            prompt_password(function(password) {
                if (password) {
                    $.ajax({
                        type: "POST",
                        url: '/delete',
                        data: {password: password, id: param}
                    }).done(function (data_delete) {
                        if(data_delete.success)
                            div_alert("success");
                        else 
                            div_alert("failure");
                    });
                }
            });
            break;
        case "set":
            prompt_password(function(password) {
                if (password) {
                    param = param.split('/');
                    $.ajax({
                        type: "POST",
                        url: '/set',
                        data: {password: password, id: param[0], text: param.splice(1).join('/')}
                    }).done(function (data_delete) {
                        if(data_delete.success)
                            div_alert("success");
                        else 
                            div_alert("failure");
                    });
                }
            });
            break;
        case "refresh":
            prompt_password(function(password) {
                if (password) {
                    $.ajax({
                        type: "POST",
                        url: '/refresh',
                        data: {password: password}
                    }).done(function (data_delete) {
                        if(data_delete.success)
                            div_alert("success");
                        else 
                            div_alert("failure");
                    });
                }
            });
            break;
        case "ban":
            prompt_password(function(password) {
                if (password) {
                    param = param.split('/');
                    $.ajax({
                        type: "POST",
                        url: '/ban',
                        data: {password: password, id: param[0], board: param[1]}
                    }).done(function (data_delete) {
                        if(data_delete.success)
                            div_alert(data_delete.success);
                        else 
                            div_alert("failure", data_delete.failure);
                    });
                }
            });
            break;
        case "help":
        default:
            div_alert(
                "/addtryp !tripcode: add emphasis to tripcode\n" +
                "/remtryp !tripcode: remove emphasis from tripcode\n" +
                "/join /channel: join channel\n" +
                "/switch /channel: switch to channel in same window\n" +
                "/help: display this text\n\n" +
                "CONVERSATIONS\n" +
                "==============\n" +
                "On this site threads are known as \"conversations\"\n" +
                "You can change your active conversation from the default \"General\" in the second text box\n" +
                "Setting a conversation allows you filter posts to it by using the dropdown box in the lower right\n\n" +
                "SESSIONS\n" +
                "==============\n" +
                "After logging in by entering a CAPTCHA your session will last for at least 15 minutes\n" +
                "Once your session expires you will be prompted with a new CAPTCHA"
            );
        }
        return;
    }
    if (submit_beta) {
	    submit_chat_beta();
    } else {
    	$("#comment-form").submit();
    }

    if (!admin_mode) {
        cool_down_timer += 7;
	    $("#submit_button").prop("disabled", true);
    }
    
    if (html5) {
        localStorage.cool_down_timer = cool_down_timer;
    }
    
    return false;
}

/* inserts quoted id at the cursor */
function quote(id) {
    "use strict";

    var el = $("#body")[0];
    var text = ">>" + id + "\n";
    var val = el.value,
        endIndex, range;
    if (el.selectionStart !== undefined && el.selectionEnd !== undefined) {
        endIndex = el.selectionEnd;
        el.value = val.slice(0, el.selectionStart) + text + val.slice(endIndex);
        el.selectionStart = el.selectionEnd = endIndex + text.length;
    } else if (document.selection !== undefined && document.selection.createRange !== undefined) {
        el.focus();
        range = document.selection.createRange();
        range.collapse(false);
        range.text = text;
        range.select();
    }

    // set conversation
    if ($.inArray(get_convo(), convos) > -1) {
        $("#convo").val(chat[id].convo);
        apply_filter();
    }
}

