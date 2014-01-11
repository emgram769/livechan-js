var socket = io.connect('/');
var chat = [];
var cool_down_timer;
var cool_down_interval;

function get_cookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++)
    {
        var c = ca[i].trim();
        if (c.indexOf(name)==0) return c.substring(name.length,c.length);
    }
    return "";
}

function escapeHTML( string ) {
    var pre = document.createElement('pre');
    var text = document.createTextNode( string );
    pre.appendChild(text);
    return pre.innerHTML;
}

function submit_chat(){
    scroll(true);
    cool_down_timer = 15;
    if (cool_down_interval)
        clearInterval(cool_down_timer);
    cool_down_interval = setInterval(cool_down,1000);
}

function cool_down(){
    console.log(cool_down_timer);
    if (cool_down_timer <= 0){
        clearInterval(cool_down_interval);
        $("#cool_down").text("");
        $("#submit_button").prop("disabled",false);
    } else {
        $("#cool_down").text(cool_down_timer);
        $("#submit_button").prop("disabled",true);
        cool_down_timer--;
    }
}

function add_number_to_post(number){
    var text = $("#body").val()+('>>'+number);
    $("#body").val(text);
}

function scroll_to_number(number){
    var container = $('.chats:first'),
        scrollTo = $('#chat_'+number);
    $("#autoscroll").prop('checked',false);
    container.scrollTop(
        scrollTo.offset().top - container.offset().top + container.scrollTop()
    );
}

function draw_new_chat(data){
    var trip = data.trip ? "<span class='trip_code'>"+data.trip+"</span>" : "";
    var name = "<span class='chat_name' id='chat_"+data.count+"'>"+escapeHTML(data.name)+trip+"</span>"+data.date+"<span class='chat_number' onclick='add_number_to_post("+data.count+")'>"+data.count+"</span><br/>";

    var new_image = data.image ? "<img height='100px' class='chat_img' src='/"+data.image.slice(7)+"' onClick='window.open(\"/"+data.image.slice(7)+"\")'>" : "";
    /*
    /^\>([a-z0-9]+)\ /gi
    /^\>>([0-9]+)\ /g
    */
    var new_chat = "<div class='chat'>"+name+new_image+escapeHTML(data.body).replace(/\&gt;\&gt;([0-9]+)/g,"{$1}").replace(/^\&gt;(.*)$/gm, "<span class='greentext'>&gt;$1</span>").replace(/\{([0-9]+)\}/g,"<a href='#' onclick='scroll_to_number($1)'>&gt;&gt;$1</a>").replace(/\r?\n/g, '<br />')+"</div>";

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
    if(get_cookie("password_livechan")=="")
        window.location.href='/login';
}
