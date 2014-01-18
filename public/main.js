var chat = {};
var future_ids = $("<span />");

var auto_post = false;
var posting = false;
var cool_down_timer = 0;
var cool_down_interval;
var admin_mode = false;
var convo_filter_state = "no-filter";

var window_focus = true;
var window_alert;
var blink;
var unread_chats = 0;

var admins = ["!/b/suPrEmE", "!KRBtzmcDIw"];
/* if you look at source you are essentially helping out, so have some blue colored trips! --> bluerules, testing */
var default_contribs = ["!7cNl93Dbb6", "!9jPA5pCF9c"];
var my_ids = [];
var contribs = default_contribs;

var socket = io.connect('/');

var html5 = false;
try {
    html5 = (window.localStorage !== undefined && window.localStorage !== null);
} catch (e) {
    html5 = false;
}

function scroll() {
    "use strict";
    var scr = $('.chats:first')[0].scrollHeight;
    scr += 10;
    $(".chats:first").animate({
        scrollTop: scr
    }, 200, 'swing', function () {

    });
}

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
    link.href = file;
    link.media = 'all';
    head.appendChild(link);
    scroll();
}

if (html5) {
    if (false) {
        // set to true to reset local storage to defaults
        localStorage.my_ids = "[0]";
        localStorage.contribs = "[\"0\"]";
        localStorage.convo = "";
        localStorage.name = "";
        localStorage.theme = "/style.css";
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

    if (localStorage.theme === "null") {
        localStorage.theme = "/style.css";
    }

    $(document).ready(function () {
        "use strict";
        $("#name").val(localStorage.name);
        $("#convo").val(localStorage.convo);
        $("#theme_select").val(localStorage.theme);
        if (!$("#theme_select").val().trim() || $("#theme_select").val() === "null") {
            $("#theme_select").val("/style.css");
        }
        get_css($("#theme_select").val());
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

function captcha_div() {
    "use strict";
    return '<img src="/captcha.jpg#' + new Date().getTime() + '" alt="Lynx is best browser" /><form action="/login" method="post" target="miframe"><br /><input type="text" name="digits" /></form>';
}

function get_cookie(cname) {
    "use strict";
    var name = cname + "=";
    var ca = document.cookie.split(';');
    var i = 0;
    var c = null;
    for (i = 0; i < ca.length; i++) {
        c = ca[i].trim();
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function div_alert(message, add_button, div_id) {
    "use strict";
    if (add_button === undefined) {
        add_button = true;
    }
    if (div_id === undefined) {
        div_id = "";
    }
    var alert_div = document.createElement('div');
    alert_div.setAttribute('class', 'alert_div');
    alert_div.setAttribute('id', 'alert_div_' + div_id);
    var button_html = "<button class='alert_button' onclick='$(\"#alert_div_" + div_id + "\").remove();'>Close</button>";
    if (!add_button) {
        button_html = "";
    }
    alert_div.innerHTML = "<div class='alert_message'>" + message.replace(/\r?\n/g, '<br />') + "</div>" + button_html;
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

function escapeHTML(str) {
    "use strict";
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function clear_fields() {
    "use strict";
    $("#image").val('');
    $("#body").val('');
    $("#sum").val('');
}

function cool_down() {
    "use strict";
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

function submit_chat() {
    "use strict";
    if (get_cookie("password_livechan") === '') {
        div_alert(captcha_div(), false, "captcha");
        $("#submit_button").prop("disabled", true);
        $("#submit_button").prop("value", "Submit (Auto)");
        auto_post = true;
        return false;
        //div_alert("<iframe src='/login?page='+path></iframe>");
    }
    $("#submit_button").prop("value", "Submit");
    auto_post = false;
    posting = true;
    if (html5) {
        localStorage.name = $("#name").val();
        localStorage.convo = $("#convo").val().replace(/^General$/, "");
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
                var idx = contribs.indexOf(param);
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
        case "join":
            if (param) {
                window.open('http://' + document.location.host + '/chat/' + param.replace('/', ''));
            } else {
                div_alert("usage: /join /channel");
            }
            break;
        case "help":
        default:
            div_alert(
                "/addtryp !tripcode: add emphasis to tripcode\n" +
                "/remtryp !tripcode: remove emphasis from tripcode\n" +
                "/join /channel: join channel\n" +
                "/help: display this text\n\n" +
                "CONVERSATIONS\n" +
                "==============\n" +
                "On this site threads are known as \"conversations\"\n" +
                "You can change your active conversation from the default \"General\" in the second text box\n" +
                "Setting a conversation allows you filter posts to it by using the dropdown box in the lower right\n\n" +
                "SESSIONS\n" +
                "==============\n" +
                "After logging in by entering a CAPTCHA your session will last for 15 minutes\n" +
                "Once your session expires posts won't show for other users until you re-login"
            );
        }
        return;
    }
    $("#comment-form").submit();

    if (!admin_mode) {
        $("#submit_button").prop("disabled", true);
        clear_fields();
        cool_down_timer = 6;
        clearInterval(cool_down_timer);
        cool_down();
        cool_down_interval = setInterval(cool_down, 1000);
    } else {
        clear_fields();
    }
    return false;
}

function insert_text_at_cursor(el, text) {
    "use strict";
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
}

function notifications() {
    "use strict";
    unread_chats++;
    clearInterval(window_alert);
    window_alert = setInterval(function () {
        if (!blink) {
            window.document.title = '(' + unread_chats + ') unread chats';
        } else {
            window.document.title = 'LiveChan';
        }
        blink = !blink;

    }, 1500);
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

function generate_post(id) {
    "use strict";
    var post = $(
        "<div class='chat'>" +
            "<div class='chat_header'>" +
                "<span class='chat_name'><span class='name_part'/><span class='trip_code'/></span>" +
                "<span class='chat_convo'/>" +
                "<span class='chat_date'/>" +
                "<span class='chat_number'/>" +
                "<span class='chat_refs'/>" +
            "</div><div class='chat_file'/><span class='chat_img_cont'/><span class='chat_body'/>" +
        "</div>"
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
        var date = new Date(data.date);
        post.find(".chat_date").text(date);
    }
    if (new_data.image !== undefined) {
        var file_info = post.find(".chat_file");
        var img_container = post.find(".chat_img_cont");
        if (data.image) {
            var base_name = data.image.match(/[\w\-\.]*$/)[0];
            var image_url = "/tmp/uploads/" + base_name;

            file_info.html("File: <a class='file_link' target='_blank'/><span class='file_data'/>");
            file_info.find(".file_link").attr("href", image_url).text(base_name);

            img_container.html("<img height='100px' class='chat_img'>");
            var image = img_container.find(".chat_img");
            image.attr("src", image_url);
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
        body_html = body_html.replace(/^\&gt;(.*)$/gm, "<span class='greentext'>&gt;$1</span>");
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
        body.html(body_html);
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
            $(".chats:first").prepend(post);
        } else {
            $("#chat_" + id).css('opacity', '0');
            $(".chats:first").append(post);
            $("#chat_" + id).animate({
                opacity: 1
            }, 300, 'swing', function () {
            });
        }
    }
}

function max_count(obj) {
    "use strict";
    var max = 0;
    var i = null;
    for (i in obj) {
        if (obj[i].count >= max) {
            max = obj[i].count;
        }
    }
    return max;
}

function draw_chat(data, is_convo) {
    "use strict";
    var i = null;
    for (i in data) {
        update_chat(data[i], is_convo, true);
    }
    var max = max_count(chat);
    var too_long = 1000;
    var counter = 0;
    var wait_for_last = setInterval(function () {
        if ($('#chat_' + max).length) {
            clearInterval(wait_for_last);
            scroll();
        } else {
            if (counter++ > too_long) {
                clearInterval(wait_for_last);
            }
        }
    }, 100);
}

window.onload = function () {
    "use strict";
    var path = window.location.pathname;
    var chat_id = path.slice(path.lastIndexOf('/') + 1);
    socket.on('request_location', function (data) {
        socket.emit('subscribe', chat_id);
    });
    var title = 'LiveChan';
    window.document.title = title;

    $(window).focus(function () {
        unread_chats = 0;
        window.document.title = title;
        clearInterval(window_alert);
        window_focus = true;
    })
        .blur(function () {
            window_focus = false;
        });

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
            if ($("#autosubmit").prop('checked') && cool_down_timer <= 0 && !$("#submit_button").prop("disabled")) {
                submit_chat();
            } else {
                auto_post = true;
                $("#submit_button").prop("value", "Submit (Auto)");
            }
            return false;
        }
    });


    $.ajax({
        type: "GET",
        url: "/data/" + chat_id
    }).done(function (data) {
        draw_chat(data, false);
        socket.on('chat', function (data) {
            update_chat(data, false);
            if ($("#autoscroll").prop('checked')) {
                scroll();
            }
        });
        $.ajax({
            type: "GET",
            url: "/data_convo/" + chat_id
        }).done(function (data) {
            draw_chat(data, true);
            socket.on('convo', function (data) {
                update_chat(data, true);
                if ($("#autoscroll").prop('checked')) {
                    scroll();
                }
            });
        });
    });

    if (get_cookie("password_livechan") === '') {
        div_alert(captcha_div(), false, "captcha");
        $("#submit_button").prop("disabled", true);
    }

    $('iframe#miframe').load(function () {
        posting = false;
        var resp = JSON.parse($("#miframe").contents()[0].body.childNodes[0].innerHTML);
        if (resp.failure) {
            div_alert(resp.failure);
        } else if (resp.id) {
            my_ids.push(resp.id);
            if (html5) {
                localStorage.my_ids = JSON.stringify(my_ids);
            }
            var links = $([$("body")[0], future_ids[0]]).find(".quote_link, .back_link").filter("[data-dest='" + resp.id + "']");
            setup_quote_links(links);
        } else if (resp.success === "captcha") {
            $("#submit_button").prop("disabled", false);
            $("#alert_div_captcha").remove();
            if (auto_post) {
                submit_chat();
            }
        }
    });

    $('#convo, #convo_filter').change(function () {
        apply_filter();
    });

    $('#theme_select').change(function () {
        get_css($(this).val());
        localStorage.theme = $(this).val().replace("null", "/style.css");
    });

    $("#autoimages").change(function () {
        if (!$("#autoimages").prop('checked')) {
            $('.chat_img').hide('slow');
        } else {
            $('.chat_img').show('slow');
        }
    });

};
