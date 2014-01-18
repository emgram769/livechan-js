var socket = io.connect('/');
var chat = [];

function escapeHTML( string ) {
    var pre = document.createElement('pre');
    var text = document.createTextNode( string );
    pre.appendChild(text);
    return pre.innerHTML;
}

function draw_new_chat(data){
    if (!data)
    return false;
    var extra_class = (data.trip && data.trip == "!CnB7SkWsyx") ? "admin" : "";
    var trip = data.trip ? "<span class='trip_code "+extra_class+"'>"+data.trip+"</span>" : "";

    var date = new Date(data.date).toString();

    var name = "<span class='chat_name "+extra_class+"'>"+escapeHTML(data.name)+trip+"</span>"+date+"<span class='chat_number' onclick='add_number_to_post("+data.count+")'>"+data.count+"</span><br/>";

    var new_image = "";//data.image ? "<img height='100px' class='chat_img' src='/"+data.image.slice(7)+"' onClick='window.open(\"/"+data.image.slice(7)+"\")'>" : "";
    /*
    /^\>([a-z0-9]+)\ /gi
    /^\>>([0-9]+)\ /g
    */
    var new_chat = "<div class='chat' id='chat_"+data.count+"'><span class='chat_label' onclick='window.location.href=\"/chat/"+data.chat+"\"'>/"+data.chat+"/</span>"+name+new_image+escapeHTML(data.body).replace(/\&gt;\&gt;([0-9]+)/g,"{$1}").replace(/^\&gt;(.*)$/gm, "<span class='greentext'>&gt;$1</span>").replace(/\{([0-9]+)\}/g,"<a href='#' onclick='scroll_to_number($1)' onmouseover='show_text($1,this)' onmouseout='kill_excess()'>&gt;&gt;$1</a>").replace(/\r?\n/g, '<br />')+"</div>";

    $('.chats-home:first').append(new_chat);
    $("#chat_"+data.count).linkify();
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
