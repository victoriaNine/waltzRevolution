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

var $audioEngine;
var autoMuteSound = false;
var $game;

var audioVisualizer = document.getElementById("audioVisualizer");
var c = audioVisualizer.getContext("2d");


//===============================
// MAIN INITIALIZATION
$(document).ready(function() {
//===============================
	if(mobilecheck()) $("html").addClass("isMobile");
	if(phonecheck()) $("html").addClass("isPhone");
	if(tabletcheck()) $("html").addClass("isTablet");

	$("#notes").attr("width", parseFloat($("#notes").css("width"))).attr("height", parseFloat($("#notes").css("height")));
	$(audioVisualizer).attr("width", window.innerWidth).attr("height", window.innerHeight);

	if(navigator.appName == 'Microsoft Internet Explorer') {
        var agent = navigator.userAgent;

        if(agent.match(/MSIE ([0-9]{1,}[\.0-9]{0,})/) != null) {
            var version = parseFloat(RegExp.$1);
            $("html").addClass("ie"+version);
        }
    };

    $audioEngine = AudioEngine.getInstance();
    toMainMenu();

    /*var loadedFiles = 0;
	var totalFiles = loadingArray.length;
	var loadedPercentage = function() {
		return Math.ceil(loadedFiles * 100 / totalFiles);
	}*/
});

$(window).resize(function() {
	$(audioVisualizer).attr("width", window.innerWidth).attr("height", window.innerHeight);
});

function toMainMenu() {
	if($("#screen_play").hasClass("active")) $("#screen_play").removeClass("active");

	$audioEngine.BGM.setFile("junction_loop");
	$audioEngine.BGM.addSource("audio/bgm/junction_loop.mp3", function() {
		checkFocus(function() {
			$audioEngine.BGM.play();
			drawAudioVisualizer();

			$(window).on("blur", $audioEngine.BGM.pause).on("focus", $audioEngine.BGM.resume);

			$("#screen_mainMenu").addClass("active");

			enterMenu().add(toggleAudioVisualizer(true), .4);
		});
	});
}

function toGameScreen() {
	leaveMenu().add(toggleAudioVisualizer(false));

	$audioEngine.BGM.setCrossfade(0, function() {
		$(window).off("blur", $audioEngine.BGM.pause).off("focus", $audioEngine.BGM.resume);

		$("#screen_play").addClass("active");
		newGame();
	});

	$("#screen_mainMenu").removeClass("active");
}

function showHighScores() {
	var highScores = getLocalStorage("highScores") || [[], [], [], [], [], [], [], [], [], []];

	for(var i = 0; i < highScores.length; i++) {
		if(highScores[i].length == 0) break;

		var label = $("#screen_highScores .row").eq(i).find(".label");
		var points = $("<span class=\"points orange\">").html(highScores[i][0]+"pts");
		var percent = $("<span class=\"percent orange\">").html(highScores[i][1]+"%");
		var rank = $("<span class=\"rank\">").html(highScores[i][2]);

		var date_data = new Date(highScores[i][4]);
		var date_string = date_data.getFullYear()+".";
		date_string += date_data.getMonth()+1 > 9 ? (date_data.getMonth()+1)+"." : "0"+(date_data.getMonth()+1)+".";
		date_string += date_data.getDate() > 9 ? date_data.getDate() : "0"+date_data.getDate();
		date_string += " @ ";
		date_string += date_data.getHours() > 9 ? date_data.getHours()+":" : "0"+date_data.getHours()+":";
		date_string += date_data.getMinutes() > 9 ? date_data.getMinutes() : "0"+date_data.getMinutes();

		var date = $("<span class=\"date beige\">").html(date_string);

		var stars_data = highScores[i][3];
		var stars = $("<div class=\"stars\"><i class=\"fa fa-star\"></i><i class=\"fa fa-star\"></i><i class=\"fa fa-star\"></i><i class=\"fa fa-star\"></i><i class=\"fa fa-star\"></i></div>");

		for(var j = 0; j < stars_data; j++)
   			stars.find("i").eq(j).addClass("on");

   		$("#screen_highScores .row").eq(i).empty().append(label, date, points, percent, stars, rank);
	}

	$("#screen_highScores").addClass("active");
	toggleTitle(true);
}

function newGame() {
	// INTRO ANIMATIONS HERE
	// TweenMax.from($("#loading img"), .75, {opacity:0});
	// TweenMax.from($("#loading img+span"), .75, {opacity:0, repeat:-1, yoyo:true});
	// TweenMax.from($("#loading .info"), .75, {bottom:"-100px", opacity:0, ease:Bounce.easeOut});

	$game = Game.getInstance("js/waltz.json");
}

function loadGame() {
	$(document).on("soundLoaded", function() {
		$audioEngine.loadedFiles++;
		loadedFiles++;

		$(document).trigger("fileLoaded");
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
			mobilecheck() ? launchGameMobile() : launchGame();
			 $(window).off("focus", waitForFocus);
		};

		if(document["hasFocus"]()) mobilecheck() ? launchGameMobile() : launchGame();
		else $(window).on("focus", waitForFocus);
	});
}

function checkFocus(callback) {
	var waitForFocus = function() {
		callback();
		$(window).off("focus", waitForFocus);
	};

	if(document["hasFocus"]()) callback();
	else $(window).on("focus", waitForFocus);
}

function launchGame() {
	// REMOVE LOADING SCREEN HERE
	//TweenMax.to($("#loading"), 1, {opacity:0,
		//onComplete:function() {
			$(document).off("soundLoaded allSoundsLoaded fileLoaded allFilesLoaded");	
			// $("body").find("#loading").remove();

			//$requestScreen = "Menu";
			//switchScreen();

			
		//}
	//});
}

function launchGameMobile() {
	// MOBILE DEVICES : BGM LAUNCH ANIMATION HERE
	//TweenMax.to($("#loading img+span"), .75, {opacity:0, 
		//onComplete: function() {
			// $("#loading img+span").html("Tap to launch the experience");
			// TweenMax.to($("#loading img+span"), .75, {opacity:1});

			var startSong = function() {
				$game.song.start();
				$("body").off(eventtype, startSong);

				launchGame();
			};

			$("body").on(eventtype, startSong);
		//}
	//});
}

function drawAudioVisualizer() {
	requestAnimationFrame(drawAudioVisualizer);

    c.clearRect(0, 0, window.innerWidth, window.innerHeight);
    var dataArray = new Uint8Array($audioEngine.BGM.analyserNode.frequencyBinCount);
    $audioEngine.BGM.analyserNode.getByteFrequencyData(dataArray);

    // p = array for AnalyserNode-s
    // p.bgm = AnalyserNode used for the bgm

    /*switch (p.bgm.getByteFrequencyData(e), d) {
        case 0: // oscilloscope
            t(e);
            break;
        case 1: // dots
            a(e);
            break;
        case 2: // diagonal lines
            n(e);
            break;
        case 3: // horizontal lines
        	o(e)*/
            waveform(dataArray);
            oscilloscope(dataArray);
    //}
}

function oscilloscope(dataArray) {
    var nbEQband = 75;
    var bandWidth = Math.round(parseFloat($(window).width()) / nbEQband);
    
    var zoom = 1;
    var maxHeight = 255 * zoom;
    var top = $(window).height();

    c.save();
    c.beginPath();

	c.fillStyle = "#161515";
	c.strokeStyle = "#161515";
    c.lineTo(0, top);

    for (var i = 0; i <= nbEQband; i++)
    	c.lineTo(i * bandWidth, top - dataArray[i] * zoom);

    c.lineTo(parseFloat($(window).width()), top - dataArray[nbEQband] * zoom);
    c.lineTo(parseFloat($(window).width()), top);
    c.fill();
    c.stroke();

    c.closePath();
    c.restore();
}

function waveform(dataArray) {
    var nbEQband = 75;
    var bandWidth = Math.round(parseFloat($(window).width()) / nbEQband);

    var zoom = 1;
    var maxHeight = 255 * zoom;
    var top = $(window).height() - maxHeight / 4;

    c.save();
	c.fillStyle = "#D55320";

    for (var i = 0; i <= nbEQband; i++)
    	c.fillRect(i * bandWidth, top - dataArray[i], 2, 2);

    c.restore();
}

function n(dataArray) {
    var nbEQband = 75;
    var bandWidth = Math.round(parseFloat($(window).width()) / nbEQband);

    c.save();
    c.lineWidth = 1;

    for (var i = 0; i <= nbEQband; t++) {
    	c.moveTo(i * bandWidth + dataArray[i], dataArray[i]);
    	c.lineTo(-dataArray[i] + 500, -i * a - dataArray[i] + 500);
    }

    c.stroke();
	c.restore();
}

function o(dataArray) {
    var nbEQband = 100;

    c.save();
    c.lineWidth = 1;

    for (var i = 0; i <= nbEQband; i++) {
    	c.moveTo(1e3 * dataArray[i], 2 * dataArray[i]);
    	c.lineTo(1e3 * -dataArray[i], -1 * dataArray[i]);
    }

    c.stroke();
	c.restore();
}


//===============================
// LOCAL STORAGE
//===============================
function setLocalStorage(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function getLocalStorage(key)        { return JSON.parse(localStorage.getItem(key)); }


//===============================
// GUI INTERACTION
//===============================

$(".bt_play").on(eventtype, function() {
	toGameScreen();
});

$(".bt_highScores").on(eventtype, function() {
	showHighScores();
});

$(".bt_howToPlay").on(eventtype, function() {
	$("#screen_howToPlay").addClass("active");
	toggleTitle(true);

	$(window).on("keydown", howToPlay_onKeydown).on("keyup", howToPlay_onKeyup);
});

var howToPlay_onKeydown = function(e) {
	e.preventDefault();

	if(e.which == 38) $("#screen_howToPlay .keyUp").addClass("pressed");
	if(e.which == 39) $("#screen_howToPlay .keyRight").addClass("pressed");
	if(e.which == 37) $("#screen_howToPlay .keyLeft").addClass("pressed");
	if(e.which == 40) $("#screen_howToPlay .keyDown").addClass("pressed");
	if(e.which == 32) $("#screen_howToPlay .keySpace").addClass("pressed");
	if(e.which == 80) $("#screen_howToPlay .keyPause").addClass("pressed");
}

var howToPlay_onKeyup = function(e) {
	e.preventDefault();

	if(e.which == 38) $("#screen_howToPlay .keyUp").removeClass("pressed");
	if(e.which == 39) $("#screen_howToPlay .keyRight").removeClass("pressed");
	if(e.which == 37) $("#screen_howToPlay .keyLeft").removeClass("pressed");
	if(e.which == 40) $("#screen_howToPlay .keyDown").removeClass("pressed");
	if(e.which == 32) $("#screen_howToPlay .keySpace").removeClass("pressed");
	if(e.which == 80) $("#screen_howToPlay .keyPause").removeClass("pressed");
}

$(".bt_credits").on(eventtype, function() {
	$("#screen_credits").addClass("active");
	toggleTitle(true);
});

$(".bt_resume").on(eventtype, function() {
	if($game) {
		leaveMenu();
		$game.song.resume();
	}
});

$(".bt_retry").on(eventtype, function() {
	if($game) {
		leaveMenu();
		$(".overlay.active").removeClass("active");

		$game.retry();
	}
});

$(".bt_mainMenu").on(eventtype, function() {
	if($game) {
		leaveMenu();
		$(".overlay.active").removeClass("active");

		$game.quit();
	}
});

$(".bt_back").on(eventtype, function() {
	if($("#screen_howToPlay").hasClass("active")) {
		$(window).off("keydown", howToPlay_onKeydown).off("keyup", howToPlay_onKeyup);
	}

	toggleTitle(false);
	$(".overlay.active").removeClass("active");
});

function toggleTitle(state) {
	var tween;
	var screenType = $.find(".overlay.active").length > 0 ? ".overlay" : ".screen";

	$(screenType+".active h1").removeAttr("style");
	if(state) tween = TweenMax.fromTo($(screenType+".active h1"), .6, { opacity:0, letterSpacing:"8px", transform:"scaleX(1.2)" }, { opacity:1, letterSpacing:"0px", transform:"scaleX(1)", ease:Power4.easeOut });
	else tween = TweenMax.fromTo($(screenType+".active h1"), .6, { opacity:1, letterSpacing:"0px", transform:"scaleX(1)" }, { opacity:0, letterSpacing:"8px", transform:"scaleX(1.2)", ease:Power4.easeOut });

	return tween;
}

function toggleNav(state) {
	var tween;
	var screenType = $.find(".overlay.active").length > 0 ? ".overlay" : ".screen";

	$(screenType+".active .nav li").removeAttr("style");
	if(state) tween = TweenMax.staggerFrom($(screenType+".active .nav li"), .4, { opacity:0, top:"20px", ease:Power4.easeOut }, .1);
	else tween = TweenMax.staggerTo($(screenType+".active .nav li"), .4, { opacity:0, top:"20px", ease:Power4.easeOut }, -.1);

	return tween;
}

function toggleAudioVisualizer(state) {
	var tween;

	$("#audioVisualizer").removeAttr("style");
	if(state) tween = TweenMax.from("#audioVisualizer", .6, { opacity:0, top:"40px", ease:Power4.easeOut });
	else tween = TweenMax.to("#audioVisualizer", .6, { opacity:0, top:"40px", ease:Power4.easeOut });

	return tween;
}

function enterMenu() {
	var timeline = new TimelineMax();
    timeline.add(toggleTitle(true));
    timeline.add(toggleNav(true), "-=.4");

    return timeline;
}

function leaveMenu() {
	var timeline = new TimelineMax();
    timeline.add(toggleNav(false));
    timeline.add(toggleTitle(false), "-=.4");

    return timeline;
}


//===============================
// MOBILE DETECTION
// http://stackoverflow.com/a/11381730/989439
//===============================
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