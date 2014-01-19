var socket = io.connect('/');
var chat = [];
var future_ids = $("<output />");
var window_focus = true;
var window_alert;
var blink;
var unread_chats = 0;

var admins = ["!/b/suPrEmE", "!KRBtzmcDIw"];
/* if you look at source you are essentially helping out, so have some blue colored trips! --> bluerules, testing */
var default_contribs = ["!7cNl93Dbb6", "!9jPA5pCF9c", "!iRTB7gU5ps"];
var my_ids = [];
var contribs = default_contribs;


function escapeHTML( string ) {
    
   return string.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
   var pre = document.createElement('pre');
    var text = document.createTextNode( string );
    pre.appendChild(text);
    return $('<aside/>').text(string).html();
    return pre.innerHTML;
}

function apply_filter(posts) {
    "use strict";
    if (posts === undefined) {
        posts = $('.chat');
    }
    var convo = get_convo();
    var value = $('#convo_filter').val();
    posts.toggleClass('chat_dim', false);
    posts.toggleClass('chat_hidden', false);

    if (value === "highlight"){
        posts.toggleClass(function () {
            var id = parseInt(this.id.match(/\d+/)[0], 10);
            return (convo === chat[id].convo) ? '' : 'chat_dim';
        }, true);
    } else if (value === "filter"){
        posts.toggleClass(function () {
            var id = parseInt(this.id.match(/\d+/)[0], 10);
            return (convo === chat[id].convo) ? '' : 'chat_hidden';
        }, true);
    }
}



function update_chat(new_data, is_convo, first_load) {
    "use strict";
    var id = new_data.count;
    var new_post = (chat[id] === undefined);
    var post = null;
    if (new_post) {
        chat[id] = new_data;
        post = generate_post(id);
    } else {
        var key = null;
        for (key in new_data) {
            if (chat[id][key] === new_data[key]) {
                delete new_data[key];
            } else {
                chat[id][key] = new_data[key];
            }
        }
        post = $("#chat_" + id);
    }
    if (is_convo) {
        post.addClass("convo_op");
    }

    var data = chat[id];
    if (new_data.name !== undefined) {
        post.find(".name_part").text(data.name);
    }
    if (new_data.trip !== undefined) {
        post.find(".trip_code").text(data.trip);
        var contrib = (contribs.indexOf(data.trip) > -1);
        var admin = (admins.indexOf(data.trip) > -1);
        var name = post.find(".chat_name");
        name.toggleClass("contrib", contrib && !admin);
        name.toggleClass("admin", admin);
    }
    if (new_data.convo !== undefined) {
        var container = post.find(".chat_convo");
        container.text(data.convo + (data.convo_id === data.count ? " (OP)" : ""));
        if (data.convo_id !== data.count) {
            container.data("dest", data.convo_id);
        }
    }
    if (new_data.date !== undefined) {
        var date = (new Date(data.date)).toLocaleString();
        post.find(".chat_date").text(date);
    }
    if (new_data.image !== undefined) {
        var file_info = post.find(".chat_file");
        var img_container = post.find(".chat_img_cont");
        if (data.image) {
            var base_name = data.image.match(/[\w\-\.]*$/)[0];
            var image_url = "/tmp/uploads/" + base_name;

            file_info.html("File: <a class='file_link' target='_blank'/><output class='file_data'/>");
            file_info.find(".file_link").attr("href", image_url).text(base_name);

            img_container.html("<img height='100px' class='chat_img'>");
            var image = img_container.find(".chat_img");
            image.attr("src", image_url);
	    image.attr("alt", "Image #" + data.count);
            if (!$("#autoimages").prop('checked')) {
                image.css('display', 'none');
            }
            image.click(function () {
                window.open(image_url);
            });
            image.thumbPopup({
                imgSmallFlag: "",
                imgLargeFlag: "",
                popupCSS: {
                    'max-height': '97%',
                    'max-width': '75%'
                }
            });
        } else {
            file_info.empty();
            img_container.empty();
        }
    }
    if (new_data.image !== undefined || new_data.image_filesize !== undefined || new_data.image_width !== undefined || new_data.image_height !== undefined || new_data.image_filename !== undefined) {
        var data_items = [];
        if (new_data.image_filesize !== undefined) {
            data_items.push(humanFileSize(new_data.image_filesize, false));
        }
        if (new_data.image_width !== undefined && new_data.image_height !== undefined) {
            data_items.push(new_data.image_width + "x" + new_data.image_height);
        }
        if (new_data.image_filename !== undefined) {
            data_items.push(new_data.image_filename);
        }
        if (data_items.length > 0) {
            post.find(".file_data").text("-(" + data_items.join(", ") + ")");
        } else {
            post.find(".file_data").text("");
        }
    }
    if (new_data.body !== undefined) {
        // Remove any old backlinks to this post
        $([$("body")[0], future_ids[0]]).find(".back_link[data-dest='" + id + "']").remove();

        // Process body markup
        var body_text = data.body.replace(/>>([0-9]+)/g, "{$1}");
        var body_html = escapeHTML(body_text);
        body_html = body_html.replace(/^\&gt;(.*)$/gm, "<output class='greentext'>&gt;$1</output>");
        var ref_ids = [];
        body_html = body_html.replace(/\{([0-9]+)\}/g, function (match_full, ref_id_str) {
            var ref_id = parseInt(ref_id_str, 10);
            if (ref_ids.indexOf(ref_id) === -1) {
                ref_ids.push(ref_id);
            }
            return "<a class='quote_link' href='#' data-src='" + id + "' data-dest='" + ref_id + "'/>";
        });
        body_html = body_html.replace(/\r?\n/g, '<br />');
        var body = post.find(".chat_body");
        body.text(body_html);
        body.linkify({
            target: "_blank"
        });
        setup_quote_links(body.find(".quote_link"));

        // Create new backlinks
        $(ref_ids).each(function () {
            var link = $("<a class='back_link' href='#'/>");
            link.attr({
                "data-src": this,
                "data-dest": id
            });
            setup_quote_links(link);
            var their_refs = $("#chat_" + this + " .chat_refs");
            if (their_refs.length === 0) {
                future_ids.append(link);
            } else {
                their_refs.append(" ", link);
            }
        });
    }
    if (new_post) {
        if (window_focus === false && ($('#convo_filter').val() !== 'filter' || data.convo === get_convo())) {
            notifications();
        }
        apply_filter(post);
        if (first_load) {
            $(".chats-home:first").prepend(post);
            $("#chat_" + id).css('opacity', '1');
        } else {
            $(".chats-home:first").prepend(post);
            $("#chat_" + id).animate({
                opacity: 1
            }, 300, 'swing', function () {
            });
        }
    }
}

function setup_quote_links(links) {
    "use strict";
    links.text(function () {
        var dest_id = parseInt($(this).data("dest"), 10);
        return ">>" + dest_id + ((my_ids.indexOf(dest_id) > -1) ? " (You)" : "");
    });
    links.click(quote_click);
    links.mouseover(quote_mouseover);
    links.mouseout(quote_mouseout);
}

function get_convo() {
    "use strict";
    var convo = $('#convo').val();
    return (convo === "") ? "General" : convo;
}


function quote_click() {
    var container = $('.chats:first'),
        scrollTo = $('#chat_' + $(this).data("dest"));
    $("#autoscroll").prop('checked', false);
    container.scrollTop(
        scrollTo.offset().top - container.offset().top + container.scrollTop()
    );
}

function quote_mouseover() {
    var display = $("#chat_" + $(this).data("dest")).clone();
    display.toggleClass("to_die", true);
    display.css({
        position: 'fixed',
        top: $(this).position().top + 10,
        left: $(this).position().left + 10,
        border: '1px black solid',
        zIndex: 1000
    });
    $('body').append(display);
}

function quote_mouseout() {
    "use strict";
    $('.to_die').remove();
}


function generate_post(id) {
    "use strict";
    var post = $(
        "<article class='chat' style='opacity:0'>" +
            "<header class='chat_header'>" +
                "<output class='chat_name'><output class='name_part'/><output class='trip_code'/></output>" +
                "<output class='chat_convo'/>" +
                "<output class='chat_date'/>" +
                "<output class='chat_number'/>" +
                "<output class='chat_refs'/>" +
            "</header><section class='chat_file'/><output class='chat_img_cont'/><output class='chat_body'/>" +
        "</article>"
    );
    post.attr("id", "chat_" + id);

    var convo = post.find(".chat_convo");
    convo.mouseover(quote_mouseover);
    convo.mouseout(quote_mouseout);
    convo.click(function () {
        $("#convo").val(chat[id].convo);
        apply_filter();
    });

    var number = post.find(".chat_number");
    number.text(id);
    number.click(function () {
        insert_text_at_cursor($("#body")[0], ">>" + id + "\n");
        var cur_convo = $("#convo").val();
        if ((!cur_convo || (cur_convo === '' || cur_convo === "General")) && chat[id].convo && chat[id].convo !== "General" && chat[id].convo !== '') {
            post.find(".chat_convo").click();
        }
    });

    var links = future_ids.find("[data-src='" + id + "']");
    post.find(".chat_refs").append(links);
    links.before(" ");

    return post;
}



function draw_new_chat(data){
    update_chat(data);
    return;
    if (!data)
    return false;
    var extra_class = (data.trip && data.trip == "!CnB7SkWsyx") ? "admin" : "";
    var trip = data.trip ? "<article class='trip_code "+extra_class+"'>"+data.trip+"</article>" : "";

    var date = new Date(data.date).toString();

    var name = "<span class='chat_name "+extra_class+"'>"+escapeHTML(data.name)+trip+"</span>"+date+"<span class='chat_number' onclick='add_number_to_post("+data.count+")'>"+data.count+"</span><br/>";

    var new_image = "";//data.image ? "<img height='100px' class='chat_img' src='/"+data.image.slice(7)+"' onClick='window.open(\"/"+data.image.slice(7)+"\")'>" : "";
    /*
    /^\>([a-z0-9]+)\ /gi
    /^\>>([0-9]+)\ /g
    */
    var new_chat = "<div class='chat' id='chat_"+data.count+"'><span class='chat_label' onclick='window.location.href=\"/chat/"+data.chat+"\"'>/"+data.chat+"/</span>"+name+new_image+escapeHTML(data.body).replace(/\&gt;\&gt;([0-9]+)/g,"{$1}").replace(/^\&gt;(.*)$/gm, "<span class='greentext'>&gt;$1</span>").replace(/\{([0-9]+)\}/g,"<a href='#' onclick='scroll_to_number($1)' onmouseover='show_text($1,this)' onmouseout='kill_excess()'>&gt;&gt;$1</a>").replace(/\r?\n/g, '<br />')+"</div>";

    $('.chats-home:first').append(new_chat);
    $("#chat_"+data.count).linkify({target: "_blank"});
}

function draw_chat(){
    $('.chats-home:first').html('');
    for (i in chat)
    {
        draw_new_chat(chat[i]);
    }
}

function add_chat(data){
    if (chat.length > 5){
        delete chat[0];
        chat = chat.slice(-4,0);
    }
    chat.push(data);
    draw_chat();
}


window.onload = function(){

    $.ajax({
        type: "GET",
        url: "/data/all"
    }).done(function(data) {
        chat = data;
        draw_chat();
    });

    socket.on('request_location',function(data){
        socket.emit('subscribe', 'all');
    });

    socket.on('chat', function (d) {
        chat.push(d);
        draw_chat();
        if($("#autoscroll").prop('checked'))
        scroll();
    });

}
