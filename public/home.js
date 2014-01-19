var socket = io.connect('/');
var chat_id = "all";

function notifications(post_convo) {
    "use strict";
}

function quote(id) {
    "use strict";
    window.location.href = "/chat/" + chat[id].chat + "#q" + id;
}

function apply_filter(posts) {
    "use strict";
}

function show_images() {
    "use strict";
    return false;
}

function insert_post(post) {
    "use strict";
    $('.chats-home:first').prepend(post);
}

function draw_chat(data) {
    "use strict";
    var i;
    for (i = data.length - 1; i >= 0; i--) {
        update_chat(data[i], true);
    }
}

window.onload = function () {
    "use strict";
    socket.on('request_location',function(data){
        socket.emit('subscribe', 'all');
    });

    $.ajax({
        type: "GET",
        url: "/data/all"
    }).done(function (data) {
        draw_chat(data);
        socket.on('chat', function (data) {
            update_chat(data);
        });
    });
};
