var $currentScreen,
    $requestScreen,
    $isTransitioning = false;

var support = {animations : Modernizr.cssanimations},
  animEndEventNames = {'WebkitAnimation' : 'webkitAnimationEnd', 'OAnimation' : 'oAnimationEnd', 'msAnimation' : 'MSAnimationEnd', 'animation' : 'animationend'},
  animEndEventName = animEndEventNames[Modernizr.prefixed('animation')],
  onEndAnimation = function(el, callback) {
    var onEndCallbackFn = function(ev) {
      if(support.animations) {
        if(ev.target != this) return;
        this.removeEventListener(animEndEventName, onEndCallbackFn);
      }
      if(callback && typeof callback === 'function') callback.call();
    };
    if(support.animations) el.addEventListener(animEndEventName, onEndCallbackFn);
    else onEndCallbackFn();
  },
  eventtype = mobilecheck() ? 'touchend' : 'click';

var loadingArray = [/*"images/planet.svg",
		            "images/gas.svg",
		            "images/moon.svg",
		            "images/craters.svg",
		            "images/meteor.svg",
		            "images/filters.svg"*/];

var audioEngine;
var autoMuteSound = false;
var initReady = false;

var $song;

$(document).ready(function() {
	if(mobilecheck()) $("html").addClass("isMobile");
	if(phonecheck()) $("html").addClass("isPhone");
	if(tabletcheck()) $("html").addClass("isTablet");

	$("#notes").attr("width", parseFloat($("#notes").css("width"))).attr("height", parseFloat($("#notes").css("height")));

	// INTRO ANIMATIONS HERE
	// TweenMax.from($("#loading img"), .75, {opacity:0});
	// TweenMax.from($("#loading img+span"), .75, {opacity:0, repeat:-1, yoyo:true});
	// TweenMax.from($("#loading .info"), .75, {bottom:"-100px", opacity:0, ease:Bounce.easeOut});

	var loadedFiles = 0;
	var totalFiles = loadingArray.length;
	var loadedPercentage = function() {
		return Math.ceil(loadedFiles * 100 / totalFiles);
	}

	$song = new Song("js/waltz.json", function() {
		audioEngine = new AudioEngine($song.fileURL);
		totalFiles += audioEngine.audioFiles;

		loadGame();
	});
  	$song.load();

  	function loadGame() {
		$(document).on("soundLoaded", function() {
			audioEngine.loadedFiles++;
			loadedFiles++;

			$(document).trigger("fileLoaded");
		});

		$(window).on("blur", function() {
			if(audioEngine.ready && initReady) {
				TweenMax.lagSmoothing(0);

				if(audioEngine.isMuted()) autoMuteSound = true;
				else audioEngine.mute();
			}
		}).on("focus", function() {
			if(audioEngine.ready && initReady) {
				TweenMax.lagSmoothing(1000, 16);

				if(autoMuteSound) autoMuteSound = false;
				else audioEngine.unMute();
			}
		});
		
		for(var i = 0; i < loadingArray.length; i++) {
			$("<div>").load(loadingArray[i], function() {
				loadedFiles++;
				$(document).trigger("fileLoaded");
			});
		}

		$(document).on("fileLoaded", function() {
			// LOADING ANIMATION HERE
			// TweenMax.to($("#loading .loadingBar"), .3, {width:loadedPercentage()+"%", ease:Power4.easeOut});
			if(loadedPercentage() == 100) $(document).trigger("allFilesLoaded");
		});

		$(document).on("allFilesLoaded", function() {
			var waitForFocus = function() {
				mobilecheck() ? initBGM() : initSite();
				 $(window).off("focus", waitForFocus);
			};

			if(document["hasFocus"]()) mobilecheck() ? initSong() : initSite();
			else $(window).on("focus", waitForFocus);
		});
	}

	function initSite() {
		// REMOVE LOADING SCREEN HERE
		//TweenMax.to($("#loading"), 1, {opacity:0,
			//onComplete:function() {
				$(document).off("soundLoaded allSoundsLoaded fileLoaded allFilesLoaded");
				// $("body").find("#loading").remove();

				//$requestScreen = "Menu";
				//switchScreen();

				if(!mobilecheck()) $song.start();
				initReady = true;
			//}
		//});
	}

	function initSong() {
		// MOBILE DEVICES : BGM LAUNCH ANIMATION HERE
		//TweenMax.to($("#loading img+span"), .75, {opacity:0, 
			//onComplete: function() {
				// $("#loading img+span").html("Tap to launch the experience");
				// TweenMax.to($("#loading img+span"), .75, {opacity:1});

				var startSong = function() {
					$song.start();
					$("body").off(eventtype, startSong);

					initSite();
				};

				$("body").on(eventtype, startSong);
			//}
		//});
	}

	if(navigator.appName == 'Microsoft Internet Explorer') {
        var agent = navigator.userAgent;

        if(agent.match(/MSIE ([0-9]{1,}[\.0-9]{0,})/) != null) {
            var version = parseFloat(RegExp.$1);
            $("html").addClass("ie"+version);
        }
    };

	$(window).keydown(function(e) {
		e.preventDefault();

		if(e.which == 38) $("#keyUp").addClass("pressed");
		if(e.which == 39) $("#keyRight").addClass("pressed");
		if(e.which == 37) $("#keyLeft").addClass("pressed");
		if(e.which == 40) $("#keyDown").addClass("pressed");
		if(e.which == 32) $("#keySpace").addClass("pressed");
	}).keyup(function(e) {
		e.preventDefault();

		if(e.which == 38) $("#keyUp").removeClass("pressed");
		if(e.which == 39) $("#keyRight").removeClass("pressed");
		if(e.which == 37) $("#keyLeft").removeClass("pressed");
		if(e.which == 40) $("#keyDown").removeClass("pressed");
		if(e.which == 32) $("#keySpace").removeClass("pressed");
	}).resize(function() {
		$("#notes").attr("width", parseFloat($("#notes").css("width"))).attr("height", parseFloat($("#notes").css("height")));
	});

	$(document).on("songEnded", function() {
		console.log("I am SO done.");
	});
});

// http://stackoverflow.com/a/11381730/989439
function mobilecheck() {
	var check = false;
	(function(a){if(/(android|ipad|playbook|silk|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
}

function phonecheck() {
	var check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
}

function tabletcheck() {
	var check = false;
	if(!phonecheck() && mobilecheck()) check = true;
	return check;
}