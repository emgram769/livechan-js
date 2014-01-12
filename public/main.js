var socket = io.connect('/');
var chat = [];
var cool_down_timer = 0;
var cool_down_interval;
var admin_mode = false;

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
    if(!admin_mode){
        $("#submit_button").prop("disabled",true);
        clear_fields();
        cool_down_timer = 15;
        if (cool_down_interval)
            clearInterval(cool_down_timer);
        cool_down_interval = setInterval(cool_down,1000);
        scroll();
    } else {
        clear_fields();
    }
}

function cool_down(){
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

function insert_text_at_cursor(el, text) {
    var val = el.value, endIndex, range;
    if (typeof el.selectionStart != "undefined" && typeof el.selectionEnd != "undefined") {
        endIndex = el.selectionEnd;
        el.value = val.slice(0, el.selectionStart) + text + val.slice(endIndex);
        el.selectionStart = el.selectionEnd = endIndex + text.length;
    } else if (typeof document.selection != "undefined" && typeof document.selection.createRange != "undefined") {
        el.focus();
        range = document.selection.createRange();
        range.collapse(false);
        range.text = text;
        range.select();
    }
}

function add_number_to_post(number){
    insert_text_at_cursor(document.getElementById("body"),'>>'+number);
}

function scroll_to_number(number){
    var container = $('.chats:first'),
        scrollTo = $('#chat_'+number);
    $("#autoscroll").prop('checked',false);
    container.scrollTop(
        scrollTo.offset().top - container.offset().top + container.scrollTop()
    );
}

function show_text(number, el){
    var display = $("#chat_"+number).clone();
    display.toggleClass("to_die",true);
    display.css({
        position:  'fixed',
        top:       $(el).position().top + 10,
        left:      $(el).position().left + 10,
        border:    '1px black solid',
        zIndex:    1000
    });
    $('body').append(display);
    console.log(display);
}

function kill_excess(){
    $('.to_die').remove();
}

function draw_new_chat(data){
    var extra_class = (data.trip && data.trip == "!CnB7SkWsyx") ? "admin" : "";
    var trip = data.trip ? "<span class='trip_code "+extra_class+"'>"+data.trip+"</span>" : "";
    var name = "<span class='chat_name "+extra_class+"'>"+escapeHTML(data.name)+trip+"</span>"+data.date+"<span class='chat_number' onclick='add_number_to_post("+data.count+")'>"+data.count+"</span><br/>";

    var new_image = data.image ? "<img height='100px' class='chat_img' src='/"+data.image.slice(7)+"' onClick='window.open(\"/"+data.image.slice(7)+"\")'>" : "";
    /*
    /^\>([a-z0-9]+)\ /gi
    /^\>>([0-9]+)\ /g
    */
    var new_chat = "<div class='chat' id='chat_"+data.count+"'>"+name+new_image+escapeHTML(data.body).replace(/\&gt;\&gt;([0-9]+)/g,"{$1}").replace(/^\&gt;(.*)$/gm, "<span class='greentext'>&gt;$1</span>").replace(/\{([0-9]+)\}/g,"<a href='#' onclick='scroll_to_number($1)' onmouseover='show_text($1,this)' onmouseout='kill_excess()'>&gt;&gt;$1</a>").replace(/\r?\n/g, '<br />')+"</div>";

    $('.chats:first').append(new_chat);
}

function scroll(){    
    var scr = $('.chats:first')[0].scrollHeight;
    $(".chats:first").animate({
        scrollTop: scr
    },200,'swing',function(){            
    });
}

function clear_fields(){
    $("#image").val('');
    $("#body").val('');
    $("#sum").val('');
}

function draw_chat(){
    var i = 0;
    for(; i < chat.length)
    {
        draw_new_chat(chat[i]);
    }
    document.title = "(" + i  + ") 4chan Live";
}

window.onload = function(){
    var path = window.location.pathname;
    var chat_id = path.slice(path.lastIndexOf('/')+1);
    socket.on('request_location',function(data){
        socket.emit('subscribe', chat_id);
    });
    
    $(document).ready(function() {
      $(window).keydown(function(event){
        if(event.keyCode == 13) {
          event.preventDefault();
          return false;
        }
      });
    });
    
    $("#body").keyup(function (e) {
        if (e.keyCode == 13 && $("#autosubmit").prop('checked')
        && cool_down_timer<=0) {
            $("#comment-form").submit();
            submit_chat();
        }
    });
    
    $.ajax({
        type: "GET",
        url: "/data/"+chat_id
    }).done(function(data) {
        chat = data;
        draw_chat();
        scroll();
        socket.on('chat', function (d) {
            chat.push(d);
            draw_new_chat(d);
            if($("#autoscroll").prop('checked'))
                scroll();
        });
    });
    if(get_cookie("password_livechan")=="")
        window.location.href='/login?page='+path;
}
