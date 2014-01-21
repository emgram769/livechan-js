// Kyle Peterson
// http://codebit.wordpress.com
(function($) {
	$.fn.thumbPopup = function(options)
	{
		//Combine the passed in options with the default settings
		settings = jQuery.extend({
			popupId: "thumbPopup",
			popupCSS: {'border': '1px solid #000000', 'background': '#FFFFFF'},
			cursorTopOffset: 15,
			cursorLeftOffset: 15,
			loadingHtml: "<span style='padding: 5px;'>Loading</span>"
		}, options);
		popup = $("#" + settings.popupId);
		if(popup.length == 0) {
		    //Create our popup element
		    popup =
		    $("<div />")
		    .css(settings.popupCSS)
		    .attr("id", settings.popupId)
		    .css("position", "absolute")
		    .appendTo("body").hide();
		}
		
		//Attach hover events that manage the popup
		$(this)
		.hover(setPopup)
		.mousemove(updatePopupPosition)
		.mouseout(hidePopup);
		
		function setPopup(event)
		{
			var fullImgURL = $(this).parent().attr("href");
			
			$(this).data("hovered", true);
			
			//Load full image in popup
			$("<img />")
			.css(settings.popupCSS)
			.bind("load", {thumbImage: this}, function(event)
			{
				//Only display the larger image if the thumbnail is still being hovered
				if ($(event.data.thumbImage).data("hovered") == true) {
					$(popup).empty().append(this);
					updatePopupPosition(event);
					$(popup).show();
				}
				$(event.data.thumbImage).data("cached", true);
			})
			.attr("src", fullImgURL);
			
			//If no image has been loaded yet then place a loading message
			if ($(this).data("cached") != true) {
				$(popup).append($(settings.loadingHtml));
				$(popup).show();
			}
			
			updatePopupPosition(event);			
		}
		
		function updatePopupPosition(event)
		{
			var windowSize = getWindowSize();
			var popupSize = getPopupSize();
			if (windowSize.width + windowSize.scrollLeft < event.pageX + popupSize.width + settings.cursorLeftOffset){
				$(popup).css("left", event.pageX - popupSize.width - settings.cursorLeftOffset);
			} else {
				$(popup).css("left", event.pageX + settings.cursorLeftOffset);
			}
			var top = event.pageY - 120;
			//console.log("top1: " + top + " wzHeight: " + windowSize.height + " pHeight: " + popupSize.height);
			if(windowSize.height <= popupSize.height || top <= 0)
				top = 0;
			else if(top + popupSize.height >= windowSize.height)
				top = windowSize.height - popupSize.height;
			$(popup).css("top", top + 'px');
		}
		
		function hidePopup(event)
		{
			$(this).data("hovered", false);
			$(popup).empty().hide();
		}
		function getWindowSize() {
			return {
				scrollLeft: $(window).scrollLeft(),
				scrollTop: $(window).scrollTop(),
				width: $(window).width(),
				height: $(window).height()
			};
		}
		
		function getPopupSize() {
			return {
				width: $(popup).width(),
				height: $(popup).height()
			};
		}

		//Return original selection for chaining
		return this;
	};
})(jQuery);
