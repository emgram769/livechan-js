var socket = io.connect('/');
var chat = [];
var my_ids = [];

var cool_down_timer = 0;
var cool_down_interval;
var admin_mode = false;
var convo_filter_state = "no-filter";

var window_focus = true;
var window_alert;
var blink;
var unread_chats = 0;

var contribs = [];

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
    if(get_cookie("password_livechan")=="")
        window.location.href='/login?page='+path;
    if($("#body").val()=="")
        $("#body").val("  ");
    $("#comment-form").submit();
    if($("#name").val().indexOf("settryp:") > -1){
        contribs.push($("#name").val().replace(/settryp:+/g, ''))
    }
    if(!admin_mode){
        $("#submit_button").prop("disabled",true);
        clear_fields();
        cool_down_timer = 6;
        clearInterval(cool_down_timer);
        cool_down();
        cool_down_interval = setInterval(cool_down,1000);
    } else {
        clear_fields();
    }
    return false;
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
    insert_text_at_cursor(document.getElementById("body"),'>>'+number+'\n');
}

function add_convo_to_post(text){
    $("#convo").val(text);
    apply_filter($('#convo_filter').val()); 
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
}

function kill_excess(){
    $('.to_die').remove();
}

function notifications(){
    //alert();
    unread_chats++;
    clearInterval(window_alert);
    window_alert = setInterval(function(){
        if (!blink){
            window.document.title = '('+unread_chats+') unread chats';
        } else {
            window.document.title = 'LiveChan';
        }
        blink = !blink;
        
    }, 1500)
}

function make_image(element,url){
    $(element).html("<img height='100px' class='chat_img' src='/"+url+"' onClick='window.open(\"/"+url+"\")'>")
}

function draw_new_chat(data, fast){
    if (window_focus === false) {
        if ($('#convo_filter').val()=='filter') {
            var convo = $('#convo').val() ? $('#convo').val() : "General";
            if (data.convo == convo) {
                notifications();
            }
        } else {
            notifications();
        }
    }
    
    if ($('#chat_'+data.count).length != 0)
        return;
    var extra_class = (data.trip && data.trip == "!KRBtzmcDIw") ? "admin" : "";
    extra_class = (data.trip && (contribs.indexOf(data.trip) >-1)) ? "contrib" : extra_class;
    var trip = data.trip ? "<span class='trip_code "+extra_class+"'>"+data.trip+"</span>" : "";
    var convo = "<span class='chat_convo' onclick='add_convo_to_post(\""+escapeHTML(data.convo)+"\")'>"+escapeHTML(data.convo)+"</span>";

    var name = "<span class='chat_name "+extra_class+"'>"+escapeHTML(data.name)+trip+"</span>"+convo+data.date+"<span class='chat_number' onclick='add_number_to_post("+data.count+")'>"+data.count+"</span><br/>";

    var new_image = data.image ? "<img id='chat_img_"+data.count+"' height='100px' class='chat_img' src='/"+data.image.slice(7)+"' onClick='window.open(\"/"+data.image.slice(7)+"\")'>" : "";

    var new_chat = "<div class='chat' id='chat_"+data.count+"' data-convo='"+data.convo+"' style='opacity:0;'>"+name+new_image+escapeHTML(data.body).replace(/\&gt;\&gt;([0-9]+)/g,"{$1}").replace(/^\&gt;(.*)$/gm, "<span class='greentext'>&gt;$1</span>").replace(/\{([0-9]+)\}/g,"<a href='#' onclick='scroll_to_number($1)' onmouseover='show_text($1,this)' onmouseout='kill_excess()'>&gt;&gt;$1</a>").replace(/\r?\n/g, '<br />')+"</div>";
    
    my_ids.forEach(function(id) {
        new_chat = new_chat.replace("onmouseout='kill_excess()'>&gt;&gt;" + id + "</a>", "onmouseout='kill_excess()'>&gt;&gt;" + id + " (You)</a>");
    }
    
    $(".chats:first").append(new_chat);
    
    if(fast){
        $("#chat_"+data.count).css('opacity','1');
        apply_filter($('#convo_filter').val()); 
        return;
    }
    
    $("#chat_"+data.count).animate({
        opacity:1
    },300, 'swing', function(){
        apply_filter($('#convo_filter').val()); 
    });
    
    // apply hover zoom to image
    if(data.image)
    {
        $(function(){
            $("#chat_img_"+data.count).thumbPopup({
                imgSmallFlag: "",
                imgLargeFlag: "",
               popupCSS: {'max-height': '97%', 'max-width': '75%'}
            });
        });
    }
    return;
    
}

function scroll(){    
    var scr = $('.chats:first')[0].scrollHeight;
    scr+=10;
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

function apply_filter(value){
    var convo = $('#convo').val();
    if(convo == "")
    convo = "General";
    $('.chat').toggleClass('chat_dim', false);
    $('.chat').toggleClass('chat_hidden', false);

    if (value == "highlight"){
        $('.chat').toggleClass(function() {
            if(convo == $(this).data('convo'))
            return '';
            else
            return 'chat_dim';
            }, true);
    } else if (value == "filter"){
        $('.chat').toggleClass(function() {
            if(convo == $(this).data('convo'))
            return '';
            else
            return 'chat_hidden';
            }, true);
    }
}

function draw_chat(){
    for(i in chat) {
        draw_new_chat(chat[i], true);
    }
    //scroll();
}

window.onload = function(){
    var path = window.location.pathname;
    var chat_id = path.slice(path.lastIndexOf('/')+1);
    socket.on('request_location',function(data){
        scroll();
        socket.emit('subscribe', chat_id);
    });
    var title = 'LiveChan';
    window.document.title = title;

    $(window).focus(function() {
        unread_chats = 0;
        window.document.title = title;
        clearInterval(window_alert);
        window_focus = true;
    })
        .blur(function() {
            window_focus = false;
        });

    $("#name").keydown(function(event){
        if(event.keyCode == 13) {
            event.preventDefault();
            return false;
        }
    });

    $("#convo").keydown(function(event){
        if(event.keyCode == 13) {
            event.preventDefault();
            return false;
        }
    });

    $("#body").keyup(function (e) {
        if (!e.shiftKey && e.keyCode == 13 && $("#autosubmit").prop('checked')
        && cool_down_timer<=0) {
            submit_chat();
        }
    });


    $.ajax({
        type: "GET",
        url: "/data/"+chat_id
    }).done(function(data) {
        chat = data;
        draw_chat();
        socket.on('chat', function (d) {
            chat.push(d);
            draw_new_chat(d);
            if($("#autoscroll").prop('checked'))
                scroll();
        });
    });

    if(get_cookie("password_livechan")=="")
        window.location.href='/login?page='+path;


    $('iframe#miframe').load(function() {
        var resp = JSON.parse($("#miframe"
        ).contents()[0].body.childNodes[0].innerHTML);
        if(resp.failure)
            alert(resp.failure);
        else if(resp.id)
            my_ids.push(resp.id);
    });

    $('#convo_filter').change(function(){
        apply_filter($(this).val()); 
    });
    
    $("#autoimages").change(function () {
        if (!$("#autoimages").prop('checked'))
            $('.chat_img').hide('slow');
        else
            $('.chat_img').show('slow');
     });

}
