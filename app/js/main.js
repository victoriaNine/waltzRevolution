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

var $HP = 500;
var $maxHP = 1000;

var $score = 0;
var $maxScore;
var $progress = 0;
var $rank;

var $accuracy = [0, 0, 0, 0, 0] // great, nice, cool, poor, miss
var $totalNotes;
var $comboArray = [];
var $combo = 0;

var $gameOver = false;
var $newRecord = false;


//===============================
// MAIN INITIALIZATION
$(document).ready(function() {
//===============================
	if(mobilecheck()) $("html").addClass("isMobile");
	if(phonecheck()) $("html").addClass("isPhone");
	if(tabletcheck()) $("html").addClass("isTablet");

	//$("#highScores .right").html(getLocalStorage("highScores") ? getLocalStorage("highScores")[0] : "-");

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

		/*var tiedNotesBonus = 0;
		$song.notes.filter(function(note) {
			if(note.hasTiedNote) {
				var tnLength = note.tnSongPosition - note.songPosition;
				tiedNotesBonus += Math.ceil((tnLength / $song.baseNoteLength) * 100);

				return true;
			}
		});*/

		$totalNotes = $song.notes.length;
		$maxScore = 100 * $totalNotes; //+ tiedNotesBonus;

		updateScore();
		updateHP();
		updateProgress();

		loadGame();
	});
  	$song.load();

  	function loadGame() {
		$(document).on("soundLoaded", function() {
			audioEngine.loadedFiles++;
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
				mobilecheck() ? initSong() : initSite();
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
				addListeners();
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
});


//===============================
// EVENT LISTENERS
// Keyboard input, touch events, window resize
function addListeners() {
//===============================
	$(window).keydown(function(e) {
		e.preventDefault();

		if($gameOver) return;

		if(keyMap[e.which]) {
			if(!keyMap[e.which].pressed) {
				keyMap[e.which].when = new Date().getTime();
				keyMap[e.which].pressed = true;
			}

			for(var key in keyMap)
				if(keyMap[key].pressed) detectInputAccuracy(keyMap[key]);
		}
	}).keyup(function(e) {
		e.preventDefault();

		if(e.which == 38) $("#keys .keyUp").removeClass("pressed");
		if(e.which == 39) $("#keys .keyRight").removeClass("pressed");
		if(e.which == 37) $("#keys .keyLeft").removeClass("pressed");
		if(e.which == 40) $("#keys .keyDown").removeClass("pressed");
		if(e.which == 32) $("#keys .keySpace").removeClass("pressed");

		if(keyMap[e.which]) {
			keyMap[e.which].pressed = false;
			keyMap[e.which].when = 0;
		}
	}).resize(function() {
		$("#notes").attr("width", parseFloat($("#notes").css("width"))).attr("height", parseFloat($("#notes").css("height")));
		requestAnimationFrame(draw);
	}).on("blur", function() {
		if(audioEngine.ready && initReady && !$song.paused) $song.pause();
	})/*.on("focus", function() {
		if(audioEngine.ready && initReady) {
			if(autoMuteSound) autoMuteSound = false;
			else audioEngine.unMute();
		}
	})*/;

	$("#keys .keyUp, #keys .keyRight, #keys .keyLeft, #keys .keyDown, #keys .keySpace").on('touchstart touchend', function(e) {
		e.preventDefault();

		var type;
		if(e.type == 'touchstart') type = 'keydown';
		if(e.type == 'touchend') type = 'keyup';

		var code;
		if(this.className == "keyUp") code = 38;
		if(this.className == "keyRight") code = 39;
		if(this.className == "keyLeft") code = 37;
		if(this.className == "keyDown") code = 40;
		if(this.className == "keySpace") code = 32;

		var _e = $.Event(type);
		_e.which = _e.keyCode = code;
		$(window).trigger(_e);
	});

	$(document).on("songEnded", gameComplete);
}


//===============================
// ACCURACY TOOLTIP
//===============================
function showAccuracy(note) {
	var keyName = note.key;
	var keyNameFirstLetterUppercase = keyName.replace(keyName.charAt(0), keyName.charAt(0).toUpperCase());

	var container = $("#accuracy .key"+keyNameFirstLetterUppercase);
	container.html(note.accuracy);
	if($combo > 0) {
		container.append("<span class=\"value\"></span>");
		container.find(".value").html($combo);
	}

	container.addClass("visible");
	setTimeout(function() { container.removeClass("visible"); }, 1000);
}


//===============================
// SCORE
//===============================
function setScore(value, update) { $score = value; if(update) updateScore(); }
function incrementScore(value, update) { $score += value; if(update) updateScore(); }
function decrementScore(value, update) {
	if($score <= 0) return;
	$score -= ($score - value <= 0) ? $score : value;
	if(update) updateScore();
}

function updateScore() {
	var currentValue = $("#score .value").html() || 0;

	TweenMax.to($({someValue: currentValue}), .4, {someValue: $score, ease:Power3.easeInOut,
		onUpdate:function(tween) {
			$("#score .value").html(Math.ceil(tween.target[0].someValue));
		},
		onUpdateParams:["{self}"]
	});
}


//===============================
// HP
//===============================
function setHP(value, update) { $HP = value; if(update) updateHP(); }
function incrementHP(value, update) {
	if($HP >= $maxHP) return;
	$HP += ($HP + value >= $maxHP) ? ($maxHP - $HP) : value;
	if(update) updateHP();
}
function decrementHP(value, update) {
	if($HP <= 0) return;
	$HP -= ($HP - value <= 0) ? $HP : value;

	if($HP <= 0) gameOver();
	if(update) updateHP();
}

function updateHP() {
	var percentage = $HP * 100 / $maxHP;
	var currentValue = parseFloat($("#life .value").html()) || 0;

	TweenMax.to($({someValue: currentValue}), .4, {someValue: percentage, ease:Power3.easeInOut,
		onUpdate:function(tween) {
			$("#life .value").html((tween.target[0].someValue).toFixed(1)+"%");
		},
		onUpdateParams:["{self}"]
	});

	TweenMax.to($("#lifeSphere .bar"), .4, {height: percentage+"%", ease:Power3.easeInOut});

	if(percentage <= 25) $("#lifeSphere").addClass("critical");
	else if($("#lifeSphere").hasClass("critical")) $("#lifeSphere").removeClass("critical");
}


//===============================
// PROGRESS
//===============================
function updateProgress() {
	$progress = ($accuracy[0] + $accuracy[1]) * 100 / $totalNotes;
	var currentValue = parseFloat($("#progress .value").html()) || 0;

	TweenMax.to($({someValue: currentValue}), .4, {someValue: $progress, ease:Power3.easeInOut,
		onUpdate:function(tween) {
			$("#progress .value").html((tween.target[0].someValue).toFixed(1)+"%");
		},
		onUpdateParams:["{self}"]
	});

	TweenMax.to($("#progressBar .bar"), .4, {width: $progress+"%", ease:Power3.easeInOut});
	if($progress >= 60 && !$("#progressBar .p60").hasClass("passed")) $("#progressBar .p60").addClass("passed");
	if($progress >= 75 && !$("#progressBar .p75").hasClass("passed")) $("#progressBar .p75").addClass("passed");
	if($progress >= 90 && !$("#progressBar .p90").hasClass("passed")) $("#progressBar .p90").addClass("passed");
}


//===============================
// LOCAL STORAGE
//===============================
function setLocalStorage(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function getLocalStorage(key)        { return JSON.parse(localStorage.getItem(key)); }


//===============================
// PARTY COMPLETED
//===============================
function gameComplete() {
	console.log("I am SO done.");

	toResults();
}

function gameOver() {
	console.log("game over");
	$gameOver = true;

	BGM.setCrossfade(0);
	TweenMax.to($song.staffScroll, 3, {timeScale:0, ease:Power3.easeOut,
		onComplete:function() { toResults(); }
	});
}

function toResults() {
	$song.pause();
	BGM.hasEnded();

	if($progress == 100)
		$rank = "S"; // perfect
	else if($progress >= 90 && $progress <= 99)
		$rank = "A"; // great
	else if($progress >= 75 && $progress <= 89)
		$rank = "B"; // cool
	else if($progress >= 60 && $progress <= 74)
		$rank = "C"; // okay
	else if($progress >= 0 && $progress <= 59)
		$rank = "D"; // poor

	var maxCombo = Math.max.apply(Math, $comboArray);
	var newScore = [$score, $progress, $rank, new Date()];
	var highScores = getLocalStorage("highScores") || [[], [], [], [], [], [], [], [], [], []];

	for(var i = 0; i < highScores.length; i++) {
		if($score > highScores[i][0] || !highScores[i][0]) {
			for(var j = highScores.length - 2; j >= i; j--) {
				highScores[j+1] = highScores[j];
			}

			highScores[i] = newScore;
			$newRecord = true;
			break;
		}
	}

	setLocalStorage("highScores", highScores);
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