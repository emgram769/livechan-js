/* 
javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://livechan.net/js/iframe_plugin.js';})();
*/
!function(width) {

if (document.contains(document.getElementById('livechan_iframe')))
	return;

var iframe = document.createElement('iframe');
var container = document.createElement('container');
var showhide = document.createElement('button');

container.style.display = "block";
container.style.position = 'fixed';
container.style.right = '0px';
container.style.top = '0px';
container.style.width = width+'px';
container.style.height = '100%';
container.style.zIndex = '10000';
container.id='livechan_container';

showhide.style.position = 'fixed';
showhide.style.height = '100%';
showhide.style.color = 'rgb(197, 200, 198)';
showhide.style.overflow = 'hidden';
showhide.style.right = width+'px';
showhide.style.top = '0px';
showhide.style.border = 'none';
showhide.style.background = 'rgb(29, 31, 33)';
showhide.style.margin = '0';
showhide.style.padding = '0';

document.body.style.marginRight = '400px';

showhide.innerHTML = '><br/>><br/>><br/>><br/>><br/>><br/>><br/>><br/>><br/>><br/>><br/>><br/>><br/>><br/>>';
showhide.onclick = function(){
	var display = document.getElementById('livechan_iframe').style.display;
	if (display == 'none') {
		document.getElementById('livechan_iframe').style.display = 'block';
		container.style.width = width+'px';
		showhide.style.right = width+'px';
		showhide.innerHTML = '><br/>><br/>><br/>><br/>><br/>><br/>><br/>><br/>><br/>><br/>><br/>><br/>><br/>><br/>>';
		document.body.style.marginRight = '400px';

	} else {
		document.getElementById('livechan_iframe').style.display = 'none';
		container.style.width = 0+'px';
		showhide.style.right = 0+'px';
		showhide.innerHTML = '<<br/><<br/><<br/><<br/><<br/><<br/><<br/><<br/><<br/><<br/><<br/><<br/><<br/><<br/><';
		document.body.style.marginRight = '';
	}
};

iframe.style.display = "block";
iframe.style.border = 'none';
iframe.style.height = '100%';
iframe.style.width = width+'px';
iframe.style.float = 'right';
iframe.id='livechan_iframe';

iframe.src = 'https://livechan.net';

container.appendChild(iframe);
container.appendChild(showhide);

document.body.appendChild(container);

}(400);
