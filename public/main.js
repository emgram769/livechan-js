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
    var name = "<span class='chat_name'>"+escapeHTML(data.name)+"</span>"+data.date+"<br/>";

    var new_image = data.image ? "<img height='100px' class='chat_img' src='/"+data.image.slice(7)+"' onClick='window.location.href=\"/"+data.image.slice(7)+"\"'>" : "";
    var new_chat = "<div class='chat'>"+name+new_image+escapeHTML(data.body).replace(/^\&gt;(.*)$/gm, "<span class='greentext'>&gt;$1</span>").replace(/\r?\n/g, '<br />')+"</div>";

    $('.chats:first').append(new_chat);
}

function scroll(clear){    
    var scr = $('.chats:first')[0].scrollHeight;
    $(".chats:first").animate({
        scrollTop: scr
    },200,'swing',function(){
        if(clear)
            clear_fields();
    });
}

function clear_fields(){
    $("#image").val('');
    $("#body").val('');
    $("#sum").val('');
    gen_math();
}

function draw_chat(){
    for(i in chat)
    {
        draw_new_chat(chat[i]);
    }
}

function gen_math(){
    $('#m1').val(Math.floor(Math.random()*20))
    $('#m1_').text($('#m1').val());
    $('#m2').val(Math.floor(Math.random()*20))
    $('#m2_').text($('#m2').val());
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
            if($("#autoscroll").prop('checked'))
                scroll();
        });
    });
    gen_math();
}
