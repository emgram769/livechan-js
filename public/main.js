var chat = [];
var future_ids = [];

var posting = false;
var cool_down_timer = 0;
var cool_down_interval;
var admin_mode = false;
var convo_filter_state = "no-filter";

var window_focus = true;
var window_alert;
var blink;
var unread_chats = 0;

var default_contribs = ["!/b/suPrEmE","!7cNl93Dbb6","!9jPA5pCF9c"];
var my_ids = [];
var contribs = default_contribs;

var html5 = supports_html5_storage();

var socket = io.connect('/');

if(html5)
{
    if(false) // set to true to reset local storage to defaults
    {
        localStorage['my_ids'] = "[0]";
        localStorage['contribs'] = "[\"0\"]";
        localStorage['convo'] = "";
        localStorage['name'] = "";
        localStorage['theme'] = "Main";
    }
    my_ids = localStorage['my_ids'];
    if(my_ids)
        my_ids = JSON.parse(my_ids);
    else
        my_ids = [];
        
    contribs = localStorage['contribs'];
    if(contribs)
        contribs = JSON.parse(contribs);
    else
        contribs = default_contribs;
        
    $(document).ready(function() {
        $("#name").val(localStorage['name']);
        $("#convo").val(localStorage['convo']);
        $("#theme_select").val(localStorage['theme']);
        if(!$("#theme_select").val().trim()) $("#theme_select").val("Main");
        get_css($("#theme_select").val());
    });
}

function supports_html5_storage() {
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
        return false;
    }
}

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

function get_css(file) {
    if($('#css_new')) {
       $('#css_new').remove(); 
    }
    var head  = document.getElementsByTagName('head')[0];
    var link  = document.createElement('link');
    link.id   = 'css_new';
    link.rel  = 'stylesheet';
    link.type = 'text/css';
    link.href = file;
    link.media = 'all';
    head.appendChild(link);
}

function escapeHTML(str) {
    return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
}

function submit_chat(){
    if(get_cookie("password_livechan")=="") {
        var path = window.location.pathname;
        window.location.href='/login?page='+path;
    }
    posting = true;
    if(html5)
    {
        localStorage['name'] = $("#name").val();
        localStorage['convo'] = $("#convo").val().replace("General", "");
        localStorage['theme'] = $("#theme_select").val();
    }
    
    if($("#body").val()=="")
        $("#body").val("  ");
    var msg = $("#body").val();
    if(msg.indexOf('//') != 0 && msg.indexOf('/') == 0)
    {
        var cmdend = msg.indexOf(' ');
        if(cmdend <= 0)
            cmdend = msg.length;
        var cmd = msg.substring(1,cmdend).replace("\n",'');
        var param = msg.substring(cmdend + 1, msg.length).replace("\n",'');
        $("#body").val('');
        switch(cmd)
        {
            case "addtryp":
                if(param)
                {
                    contribs.push(param);
                    if(html5) localStorage['contribs'] = JSON.stringify(contribs);
                }
                else
                    alert("usage: /addtryp !tripcode");
                break;
            case "remtryp":
                if(param)
                {
                    var idx = contribs.indexOf(param);
                    if(idx > -1)
                    {
                        contribs.splice(idx, 1);
                        if(html5) localStorage['contribs'] = JSON.stringify(contribs);
                    }
                }
                else
                    alert("usage: /remtryp !tripcode");
                break;
           case "join":
               if(param)
                    window.open('http://' + document.location.host + '/chat/' + param.replace('/', ''));
               else
                    alert("usage: /join /channel");
               break;
            case "help":
            default:
                alert(
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
    if(posting)
    {
        setTimeout(function(){draw_new_chat(data, fast)}, 150);
        return;
    }
    
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

    var refs = data.count in future_ids ? future_ids[data.count] : "";
    
    var new_image = data.image ? "<img id='chat_img_"+data.count+"' height='100px' class='chat_img' src='/"+data.image.slice(7)+"' onClick='window.open(\"/"+data.image.slice(7)+"\")'>" : "";

    var body = escapeHTML(data.body).replace(/\&gt;\&gt;([0-9]+)/g,"{$1}");
    var res = body.match(/\{([0-9]+)\}/g);
    if(res)
    {
        var done = [];
        res.forEach(function(ref) { var postid = ref.replace('{','').replace('}','');
            if(done.indexOf(postid) > -1) return;
            var idtext = ( my_ids.indexOf(data.count) > -1 ? data.count + " (You)" : data.count);
            var reftext = "<a href='#' onclick='scroll_to_number("+data.count+")' onmouseover='show_text("+data.count+",this)' onmouseout='kill_excess()'>&gt;&gt;"+idtext+"</a> ";
            if(postid == data.count)
                refs += reftext
            else if($('#chat_'+postid+'_refs').length == 0)
                future_ids[postid] = (postid in future_ids ? future_ids[postid] : "") + reftext;
            else
                $('#chat_'+postid+'_refs')[0].innerHTML += reftext;
            done.push(postid);
        });
    }i
    var name = "<div class='chat_header'><span class='chat_name "+extra_class+"'>"+escapeHTML(data.name)+trip+"</span>"+convo+data.date+"<span class='chat_number' onclick='add_number_to_post("+data.count+")'>"+data.count+"</span> <span class='chat_refs' id='chat_"+data.count+"_refs'>"+refs+"</span></div>";

    var new_chat = "<div class='chat' id='chat_"+data.count+"' data-convo='"+escapeHTML(data.convo)+"' style='opacity:0;'>"+name+new_image+escapeHTML(data.body).replace(/\&gt;\&gt;([0-9]+)/g,"{$1}").replace(/^\&gt;(.*)$/gm, "<span class='greentext'>&gt;$1</span>").replace(/\{([0-9]+)\}/g,"<a href='#' onclick='scroll_to_number($1)' onmouseover='show_text($1,this)' onmouseout='kill_excess()'>&gt;&gt;$1</a>").replace(/\r?\n/g, '<br />')+"</div>";

    my_ids.forEach(function(id) {
        new_chat = new_chat.replace("onmouseout='kill_excess()'>&gt;&gt;" + id + "</a>", "onmouseout='kill_excess()'>&gt;&gt;" + id + " (You)</a>");
    });
    
    $(".chats:first").append(new_chat);
    
    // apply hover zoom to image
    if(data.image)
    {
        $("#chat_img_"+data.count).thumbPopup({
            imgSmallFlag: "",
            imgLargeFlag: "",
            popupCSS: {'max-height': '97%', 'max-width': '75%'}
        });
    }
    
    if(fast){
        $("#chat_"+data.count).css('opacity','1');
        apply_filter($('#convo_filter').val()); 
        return;
    }
    apply_filter($('#convo_filter').val()); 
    
    $("#chat_"+data.count).animate({
        opacity:1
    },300, 'swing', function(){
    });
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
        posting = false;
        var resp = JSON.parse($("#miframe"
        ).contents()[0].body.childNodes[0].innerHTML);
        if(resp.failure)
            alert(resp.failure);
        else if(resp.id)
        {
            my_ids.push(resp.id);
            if(html5) localStorage['my_ids'] = JSON.stringify(my_ids);
        }
    });

    $('#convo_filter').change(function(){
        apply_filter($(this).val()); 
    });
    
    $('#theme_select').change(function(){
        get_css($(this).val());
        localStorage['theme'] = $(this).val();
    });
    
    $("#autoimages").change(function () {
        if (!$("#autoimages").prop('checked'))
            $('.chat_img').hide('slow');
        else
            $('.chat_img').show('slow');
     });

}
