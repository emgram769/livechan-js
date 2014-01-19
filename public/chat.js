var chat = {};
var future_ids = $("<span />");

var admins = ["!/b/suPrEmE", "!KRBtzmcDIw"];
/* if you look at source you are essentially helping out, so have some blue colored trips! --> bluerules, testing */
var default_contribs = ["!7cNl93Dbb6", "!9jPA5pCF9c", "!iRTB7gU5ps"];
var my_ids = [];
var contribs = default_contribs;

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

function escapeHTML(str) {
    "use strict";
    var pre = document.createElement('pre');
    var text = document.createTextNode( str );
    pre.appendChild(text);
    return pre.innerHTML;

    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function quote_click() {
    var scrollTo = $('#chat_' + $(this).data("dest"));
    var container = scrollTo.parent();
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

function generate_post(id) {
    "use strict";
    var post = $(
        "<div class='chat' style='opacity:0'>" +
            "<div class='chat_header'>" +
                "<span class='chat_label'/>" +
                "<span class='chat_name'><span class='name_part'/><span class='trip_code'/></span>" +
                "<span class='chat_convo'/>" +
                "<span class='chat_date'/>" +
                "<span class='chat_number'/>" +
                "<span class='chat_refs'/>" +
            "</div><div class='chat_file'/><span class='chat_img_cont'/><span class='chat_body'/>" +
        "</div>"
    );
    post.attr("id", "chat_" + id);

    post.find(".chat_label").click(function() {
        window.location.href = "/chat/" + chat[id].chat;
    });

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
        quote(id);
    });

    var links = future_ids.find("[data-src='" + id + "']");
    post.find(".chat_refs").append(links);
    links.before(" ");

    return post;
}

function update_chat(new_data, first_load) {
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

    var data = chat[id];
    if (new_data.chat !== undefined && chat_id === "all") {
        post.find(".chat_label").text("/" + data.chat + "/");
    }
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
    if (new_data.convo !== undefined || new_data.convo_id !== undefined) {
        var is_op = (data.convo_id === data.count);
        post.toggleClass("convo_op", is_op);
        var container = post.find(".chat_convo");
        container.text(data.convo + (is_op ? " (OP)" : ""));
        if (!is_op) container.data("dest", data.convo_id);
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

            file_info.html("File: <a class='file_link' target='_blank'/><span class='file_data'/>");
            file_info.find(".file_link").attr("href", image_url).text(base_name);

            img_container.html("<img height='100px' class='chat_img'>");
            var image = img_container.find(".chat_img");
            image.attr("src", image_url);
            if (!show_images()) {
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
        notifications(data.convo);
        apply_filter(post);
        insert_post(post);
        if (first_load) {
            $("#chat_" + id).css('opacity', '1');
        } else {
            $("#chat_" + id).animate({
                opacity: 1
            }, 300, 'swing', function () {
            });
        }
    }
}
