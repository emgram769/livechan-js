
$(document).ready(function() {

$('#body').on('paste', function(event){

var blob = null;
var items = (event.clipboardData || event.originalEvent.clipboardData).items;
 for (index in items) {
    var item = items[index];
    if (item.kind === 'file') {
      blob = item.getAsFile();
    }
 }
if(!blob) return;
  /*  if(!blob || parseInt(localStorage.cool_down_timer)) return;

        cool_down_timer += 3
        localStorage.cool_down_timer = cool_down_timer;
        $("#submit_button").prop("disabled", true);
        localStorage.cool_down_timer = cool_down_timer;*/
        var fd = new FormData();
        fd.append('image', blob);
        fd.append('name', $('#name')[0].value);
        fd.append('convo', $('#convo')[0].value);
        fd.append('body', $('#body')[0].value);
        $('#body')[0].value='';
        $.ajax({
          url: $('#comment-form')[0].action,
          data: fd,
          processData: false,
          contentType: false,
          type: 'POST'//,
     //     success: function(data){
     //       console.log(data);
      //    }
        }).done(add_pasted);//.done(handle_post_response);
    
  
});

});

function add_pasted(resp){
    resp = JSON.parse(resp);
    my_ids.push(resp.id);
}
