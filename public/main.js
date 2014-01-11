var socket = io.connect('/');
var chat = [];

function escapeHTML( string )
{
    var pre = document.createElement('pre');
    var text = document.createTextNode( string );
    pre.appendChild(text);
    return pre.innerHTML;
}

function draw_new_chat(data){
    var name = "<span class='chat_name'>"+escapeHTML(data.name)+"</span>"+data.date+"<br/>"
    var new_image = data.image ? "<img height='100px' class='chat_img' src='/"+data.image.slice(7)+"' onClick='window.location.href=\"/"+data.image.slice(7)+"\"'>" : "";
    var new_chat = "<div class='chat'>"+name+new_image+escapeHTML(data.body).replace(/\r?\n/g, '<br />')+"</div>";
    $('.chats:first').append(new_chat);
    $(".chat").html($(".chat").html().replace(/\&gt;(.*)/g, "<span class='greentext'>&gt;$1</span>"));
}

function scroll(clear){
<<<<<<< HEAD
    var scr = $('.chats:first')[0].scrollHeight;
    $(".chats:first").animate({
        scrollTop: scr
    },100,'swing',function(){
        if(clear)
            clear_fields();
    });
=======
    if($("#autoscroll").attr('checked') == "checked") {
        var scr = $('.chats:first')[0].scrollHeight;
        $(".chats:first").animate({
            scrollTop: scr
        },200,'swing',function(){
            if(clear)
                clear_fields();
        });
    }
>>>>>>> 8788340117fa891cb2695df057ca4def83ea03a9
}

function clear_fields(){
    $("#image").val('');
    $("#body").val('');
}

function draw_chat(){
    for(i in chat)
    {
        draw_new_chat(chat[i]);
    }
}

window.onload = function(){
    $.ajax({
        type: "GET",
        url: "/data"
    }).done(function(data) {
        chat = data;
        console.log(data);
        draw_chat();
        scroll();
        socket.on('chat', function (d) {
            console.log(d);
            chat.push(d);
            draw_new_chat(d);
            scroll();
        });
    });
}
