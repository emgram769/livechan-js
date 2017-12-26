var stickers = ['folder-name'];
// end of stickers






















$(document).ready(function() {
    if(!localStorage['stickers']) localStorage['stickers']=JSON.stringify([]);
    $(document).on('click', function(){
        $('#stickers').hide();
    });
    $('#sticker_button').on('click', function(e){
        e.stopPropagation();
        list_stickers();
        $('#stickers').show();
        return false;
    });
    $('#sticker_folders').on('click', function(e){
        e.stopPropagation();
        return false;
    });
    var folders = {};
    $(stickers).each(function(i, val){ folders[val.split('-')[0]] = 1; });
    folders = Object.keys(folders);
    $(folders).each(function(i, val){
        $('#sticker_folders').append($('<option />').val(val).text(val));
    });
    $('#sticker_folders').on('change', function(){
        list_stickers();
    });
    // list_stickers();
    $('#user_count').on('mouseover', function(e){
        //$('#lurkers').css({left: $('#user_count').offset().left, top: $('#user_count').offset().top+$('#user_count').height()});
        $('#lurkers').load('/lurkers');
        $('#lurkers').show();
    });
    $('#user_count').on('mouseout', function(e){
        $('#lurkers').hide();
    });
});

function list_stickers(){
    var folder = $('#sticker_folders').val();
    var last_stickers = JSON.parse(localStorage['stickers']);
    $('.sticker').remove();
    $(last_stickers).each(function(i, val){
            $('#last_stickers').append($('<img src="/images/stickers/'+val+'.png" class="sticker" onclick="put_sticker(\''+val+'\')" />'));
    });
    $(stickers).each(function(i, val){
        if(val.split('-')[0] == folder){
            $('#stickers_list').append($('<img src="/images/stickers/'+val+'.png" class="sticker" onclick="put_sticker(\''+val+'\')" />'));
        }
    });
}
function put_sticker(val){
    var last_stickers = JSON.parse(localStorage['stickers']);
    if($.inArray(val, last_stickers)!=-1){
        last_stickers.splice($.inArray(val, last_stickers),1);
    }
    last_stickers.unshift(val);
    if(last_stickers.length>15) last_stickers.pop();
    localStorage['stickers']=JSON.stringify(last_stickers);
    $('#body').val($('#body').val() + '[st]' + val + '[/st]');
    $('#stickers').hide();
    $('#body').focus();
}

function sticker_click(e){
    e.stopPropagation();
    $('#sticker_folders').val(this.src.split('/').pop().split('-').shift());
    list_stickers();
    $('#stickers').show();
    return false;

}
