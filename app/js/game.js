//===============================
// GAME CLASS
// - Game engine
function Game(songFile) {
//===============================
	this.songFile = songFile;
	this.song;

	this.maxHP = 1000;
	this.HP = this.maxHP / 2;
	
	this.score = 0;
	this.progress = 0;
	this.rank;
	this.stars = 0;

	this.accuracy = [0, 0, 0, 0, 0] // great, cool, okay, poor, miss
	this.points = [0, 0, 0, 0] // great, cool, okay, poor
	this.totalNotes;
	this.comboArray = [];
	this.combo = 0;

	this.keyMap = {
		32: { name: "space", pressed: false, when:0, gamePad : true },
		37: { name: "left", pressed: false, when:0, gamePad : true },
		38: { name: "up", pressed: false, when:0, gamePad : true },
		39: { name: "right", pressed: false, when:0, gamePad : true },
		40: { name: "down", pressed: false, when:0, gamePad : true },
		80: { name: "P", pressed: false, when:0 }
	};

	this.ready = false;
	this.paused = false;
	this.isCompleted = false;
	this.isGameOver = false;

	this.intro = new TimelineMax({ paused:true, onComplete:function() { $(document).trigger("introComplete") } });
	this.intro.from("#songInfo .title", 1, { opacity:0, left:"-20px", ease:Power4.easeOut });
	this.intro.from("#songInfo .artist", 1, { opacity:0, top:"-20px", ease:Power4.easeOut }, .25);
	this.intro.staggerFrom(["#life", "#progress"], .5, { opacity:0, top:"20px", ease:Power4.easeOut }, .5, 0);
	this.intro.from("#lifeSphere", 1, { opacity:0, transform:"scale(1.25)", ease:Power4.easeOut }, 0);
	this.intro.from("#progressBar", 1, { opacity:0, width:"0", ease:Power4.easeOut }, .75);
	this.intro.from("#score", .5, { opacity:0, top:"20px", ease:Power4.easeOut }, "-=.5");
	this.intro.from("#staff", 1, { opacity:0, right:"-20px", ease:Power4.easeOut });
	this.intro.from("#notes", 1, { opacity:0, ease: RoughEase.ease.config({ template: Power0.easeNone, strength: 1, points: 20, taper: "none", randomize: true, clamp: true }) }, "-=.5");

	this.loadSong();
}

Game.prototype.loadSong = function() {
	var game = this;

	this.song = Song.getInstance(this.songFile, function() {
		if(!$audioEngine.BGM.hasBeenLoaded(this.fileURL)) {
			$("#screen_loading .percent").html(0);
			$("#screen_loading").addClass("active");

			TweenMax.from($("#screen_loading .label"), .75, {opacity:0, repeat:-1, yoyo:true});
			$(document).on("loadingBGM loadingSFX", loadingScreen);
		}
		
		var fileName = this.url.slice(this.url.lastIndexOf("/")+1, this.url.lastIndexOf("."));
		$audioEngine.BGM.setFile(fileName);
		$audioEngine.BGM.addSource(this.fileURL, function() {
			TweenMax.from($("#screen_loading .label"), .75, {opacity:1, clearProps:"all"});

			checkFocus(function() {
				var waitForFadeOut = function() {
					$(window).off(eventtype, waitForFadeOut);
					$("#screen_loading").removeClass("active");

					setTimeout(function() {
						game.initValues();
						game.launch();
					}, 600);
				}

				if($("#screen_loading").hasClass("active")) {
					if(mobileCheck()) $(window).on(eventtype, waitForFadeOut);
					else waitForFadeOut();
				}
				else {
					game.initValues();
					game.launch();
				}
			});
		});
	});
}


//===============================
// LAUNCH, PAUSE, STOP
//===============================
Game.prototype.initValues = function() {
	$("#songInfo .title").html(this.song.title);
	$("#songInfo .artist").html(this.song.artist);
	$("#progressBar .marker").removeClass("passed");

	$("#life .value").html((0).toFixed(1));
	$("#progress .value").html(this.progress.toFixed(1));
	$("#score .value").html(this.score);

	this.totalNotes = this.song.notes.length;

	this.updateScore();
	this.updateHP();
	this.updateProgress();

	this.intro.play();
	$("#screen_play").addClass("active");
}

Game.prototype.start = function() {
	this.addListeners();
	this.ready = true;

	$("#screen_play").addClass("ready");
	this.song.start();
}

Game.prototype.launch = function() {
	var startSong = function() {
		$game.start();

		$audioEngine.BGM.drawAudioVisualizer();
		toggleAudioVisualizer(true);
	}

	var launch = function() {
		$(document).off("introComplete");
		clearProps($game.intro);

		checkFocus(function() { setTimeout(startSong, 1000); });
	}

	if($game.intro.progress() == 1) launch();
	else $(document).on("introComplete", launch);
}

Game.prototype.pause = function(noScreen) {
  if(!$game.paused) {
    $game.song.staffScroll.pause();
    $audioEngine.BGM.pause();

    $game.paused = true;
    $("#screen_play").removeClass("ready");

    if(!noScreen) {
      $("#screen_pause").addClass("active");
      $audioEngine.SFX.play("pauseOpen");
      enterMenu();
    }
  }
}

Game.prototype.resume = function() {
  if($game.paused) {
    var resume = function() {
      $game.song.staffScroll.resume();
      $audioEngine.BGM.resume();

      $game.paused = false;
      $("#screen_play").addClass("ready");
    }

    if($("#screen_pause").hasClass("active")) {
      $("#screen_pause").removeClass("active");
      $audioEngine.SFX.play("pauseClose");
      leaveMenu();

      setTimeout(resume, 600);
    }
    else resume();
  }
}

Game.prototype.togglePause = function() {
  $game.paused ? $game.resume() : $game.pause();
}

Game.prototype.stop = function(callback) {
	$("#screen_play").removeClass("ready active");

	var timeline = new TimelineMax();
	timeline.add(toggleAudioVisualizer(false));
	timeline.to("#notes", 1, { opacity:0, clearProps:"all", ease: RoughEase.ease.config({ template: Power0.easeNone, strength: 1, points: 20, taper: "none", randomize: true, clamp: true }),
		onComplete:function() {
			$audioEngine.BGM.stopRAF();
			$game.song.stopRAF();

			if(!$game.isCompleted || !$game.isGameOver) {
				$audioEngine.BGM.hasEnded = true;
				$game.removeListeners();
			}

			Song.instance = $game.song = Game.instance = $game = null;
			callback();
		}
	}, 0);
}

Game.prototype.retry = function() { $game.stop(newGame); }
Game.prototype.quit = function() { $game.stop(toMainMenu); }


//===============================
// EVENT LISTENERS
// - Keyboard input, touch events, window resize
Game.prototype.addListeners = function() {
//===============================
	var game = this;

	game.onKeydown = function(e) {
		e.preventDefault();

		if(game.isGameOver) return;

		if(game.keyMap[e.which]) {
			if(!game.keyMap[e.which].pressed) {
				game.keyMap[e.which].when = new Date().getTime();
				game.keyMap[e.which].pressed = true;
			}

			for(var key in game.keyMap)
				if(game.keyMap[key].pressed) game.detectInputAccuracy(game.keyMap[key]);
		}
	}

	game.onKeyup = function(e) {
		e.preventDefault();

		if(e.which == 38) $("#keys .keyUp").removeClass("pressed");
		if(e.which == 39) $("#keys .keyRight").removeClass("pressed");
		if(e.which == 37) $("#keys .keyLeft").removeClass("pressed");
		if(e.which == 40) $("#keys .keyDown").removeClass("pressed");
		if(e.which == 32) $("#keys .keySpace").removeClass("pressed");

		if(game.keyMap[e.which]) {
			game.keyMap[e.which].pressed = false;
			game.keyMap[e.which].when = 0;
		}
	}

	game.onTouchevent = function(e) {
		e.preventDefault();

		var type;
		if(e.type == 'touchstart') type = 'keydown';
		if(e.type == 'touchend') type = 'keyup';

		var code;
		if(this.className.match("keyUp")) code = 38;
		if(this.className.match("keyRight")) code = 39;
		if(this.className.match("keyLeft")) code = 37;
		if(this.className.match("keyDown")) code = 40;
		if(this.className.match("keySpace")) code = 32;

		if(!code) return;

		var _e = $.Event(type);
		_e.which = _e.keyCode = code;
		$(window).trigger(_e);
	}

	game.onBlur = function() { if(game.ready && !game.paused) game.pause(); }

	$(window).keydown(this.onKeydown).keyup(this.onKeyup).blur(this.onBlur);
	$("#keys li").on('touchstart touchend', this.onTouchevent);
}


Game.prototype.removeListeners = function() {
	$(window).off("keydown", this.onKeydown).off("keyup", this.onKeyup).off("blur", this.onBlur);
	$("#keys li").off('touchstart touchend', this.onTouchevent);
}


//===============================
// INPUT ACCURACY DETECTION
Game.prototype.detectInputAccuracy = function(key) {
//===============================
	var keyName = key.name;
	var keyNameFirstLetterUppercase = keyName.replace(keyName.charAt(0), keyName.charAt(0).toUpperCase());
	var gamePad = key.gamePad;
	var inputDelay = (new Date().getTime() - key.when) / 1000;
	console.log(key);

	if(keyName == "P") $game.togglePause();
	if($game.paused || !gamePad) return;

	$("#keys .key"+keyNameFirstLetterUppercase).addClass("pressed");
	var okPerc = [], okNotes = [], okIndex = [], okTiedNotes = [];

	var tiedNote = function(note) {
		if(note.hasTiedNote && note.pressed && note.key == keyName) {
			if(note.tnSongPosition >= $audioEngine.BGM.currentPosition()) {
				var noteAmount = (note.tnSongPosition - note.songPosition) / $game.song.baseNoteLength;
				$game.incrementScore(Math.ceil(note.score / noteAmount), true);

				var HPbonus = note.accuracy == "great" ? 10 : note.accuracy == "cool" ? 5 : 1;
				$game.incrementHP(Math.ceil(HPbonus / noteAmount), true);

				$audioEngine.SFX.play("noteInputTied");

				return true;
			}
			else if(note.tnSongPosition + $game.song.baseNoteLength >= $audioEngine.BGM.currentPosition()) {
				return true;
			}
		}
	}

	okTiedNotes = $game.song.notes.filter(tiedNote);
	if(okTiedNotes.length > 0) return;

	// IT DOESN'T HAVE A TIED NOTE, MAYBE IT'S A REGULAR ONE THEN?
	var regularNote = function(note) {
		var min = note.songPosition - $game.song.baseNoteLength;
		var max = note.songPosition + $game.song.baseNoteLength;
		var nextNoteSongPosition = $game.song.notes[$game.song.currentNoteIndex].songPosition;

		if(!note.pressed && note.key == keyName && inputDelay <= $game.song.baseNoteLength
		   && $audioEngine.BGM.currentPosition() >= min && $audioEngine.BGM.currentPosition() <= max)
		{
			var delta = Math.abs($audioEngine.BGM.currentPosition() - note.songPosition);
			var percentage = 100 - Math.ceil(delta * 100 / $game.song.baseNoteLength);
			okPerc.push(percentage);
			okIndex.push(note.index);

			$audioEngine.SFX.play("noteInput");

			return true;
		}
	};

	okNotes = $game.song.notes.filter(regularNote);
	if(okNotes.length == 0) {
		// THEN THERE IS NO NOTE TO PLAY : LOSE POINTS
		$game.decrementHP(15, true);
		return;
	}

	var closestNoteIndex = okIndex.indexOf(Math.min.apply(Math, okIndex));
	var closestNote = $game.song.notes[okNotes[closestNoteIndex].index];
	closestNote.score = okPerc[closestNoteIndex];

	if(closestNote.score >= 80 && closestNote.score <= 100) {
		closestNote.accuracy = "great";
		$game.accuracy[0]++;
		$game.points[0] += closestNote.score;

		$game.incrementHP(10, true);
	}
	else if(closestNote.score >= 50 && closestNote.score <= 79) {
		closestNote.accuracy = "cool";
		$game.accuracy[1]++;
		$game.points[1] += closestNote.score;

		$game.incrementHP(5, true);
	}
	else if(closestNote.score >= 30 && closestNote.score <= 49) {
		closestNote.accuracy = "okay";
		$game.accuracy[2]++;
		$game.points[2] += closestNote.score;
	}
	else if(closestNote.score >= 1 && closestNote.score <= 29) {
		closestNote.accuracy = "poor";
		$game.accuracy[3]++;
		$game.points[3] += closestNote.score;

		$game.decrementHP(10, true);
	}

	$game.incrementScore(closestNote.score, true);
	closestNote.pressed = true;

	if(closestNote.accuracy == "great" || closestNote.accuracy == "cool")
		$game.combo++;
	else if($game.combo > 0) {
		$game.comboArray.push($game.combo);
		$game.combo = 0;
	}

	$game.updateProgress();
	$game.showAccuracy(closestNote);
}


//===============================
// FAILED TO INPUT IN TIME
Game.prototype.missedNote = function(note) {
//===============================
	note.accuracy = "miss";
	this.accuracy[4]++;

	if(this.combo > 0) {
		this.comboArray.push(this.combo);
		this.combo = 0;
	}

	this.decrementHP(20, true);
	this.showAccuracy(note);
}


//===============================
// ACCURACY TOOLTIP
//===============================
Game.prototype.showAccuracy = function(note) {
	var keyName = note.key;
	var keyNameFirstLetterUppercase = keyName.replace(keyName.charAt(0), keyName.charAt(0).toUpperCase());

	var container = $("#accuracy .key"+keyNameFirstLetterUppercase);
	container.html(note.accuracy);
	if(this.combo > 0) {
		container.append("<span class=\"value\"></span>");
		container.find(".value").html(this.combo);
	}

	container.addClass("visible");
	setTimeout(function() { container.removeClass("visible"); }, 1000);
}


//===============================
// SCORE
//===============================
Game.prototype.setScore = function(value, update) { this.score = value; if(update) this.updateScore(); }
Game.prototype.incrementScore = function(value, update) { this.score += value; if(update) this.updateScore(); }
Game.prototype.decrementScore = function(value, update) {
	if(this.score <= 0) return;
	this.score -= (this.score - value <= 0) ? this.score : value;
	if(update) this.updateScore();
}

Game.prototype.updateScore = function() {
	var currentValue = $("#score .value").html() || 0;
	scrollToValue($("#score .value"), currentValue, this.score, false, false, "", true);
}


//===============================
// HP
//===============================
Game.prototype.setHP = function(value, update) { this.HP = value; if(update) this.updateHP(); }

Game.prototype.incrementHP = function(value, update) {
	if(this.HP >= this.maxHP) return;
	this.HP += (this.HP + value >= this.maxHP) ? (this.maxHP - this.HP) : value;
	if(update) this.updateHP();
}

Game.prototype.decrementHP = function(value, update) {
	if(this.HP <= 0) return;
	this.HP -= (this.HP - value <= 0) ? this.HP : value;

	if(this.HP <= 0) this.gameOver();
	if(update) this.updateHP();
}

Game.prototype.updateHP = function() {
	var percentage = this.HP * 100 / this.maxHP;
	var currentValue = parseFloat($("#life .value").html()) || 0;

	if(currentValue > percentage) $("#lifeSphere").addClass("drop");

	scrollToValue($("#life .value"), currentValue, percentage, true, false, "%", true);
	TweenMax.to($("#lifeSphere .bar"), .4, { height: percentage+"%", ease:Power3.easeInOut,
		onComplete:function() {
			if($("#lifeSphere").hasClass("drop")) $("#lifeSphere").removeClass("drop");
		}
	});

	if(percentage <= 25) $("#lifeSphere").addClass("critical");
	else if($("#lifeSphere").hasClass("critical")) $("#lifeSphere").removeClass("critical");
}


//===============================
// PROGRESS
//===============================
Game.prototype.updateProgress = function() {
	var percentGreat = (this.accuracy[0] * 100 / this.totalNotes).toFixed(1);
	var percentCool = (this.accuracy[1] * 100 / this.totalNotes).toFixed(1);
	var progress = parseFloat(percentGreat) + parseFloat(percentCool);

	var currentValue = parseFloat($("#progress .value").html()) || 0;
	scrollToValue($("#progress .value"), currentValue, progress, true, false, "%", true);
	TweenMax.to($("#progressBar .bar"), .4, {width: progress+"%", ease:Power3.easeInOut});

	this.progress = progress;
	if(this.progress >= 60 && !$("#progressBar .p60").hasClass("passed")) $("#progressBar .p60").addClass("passed");
	if(this.progress >= 75 && !$("#progressBar .p75").hasClass("passed")) $("#progressBar .p75").addClass("passed");
	if(this.progress >= 90 && !$("#progressBar .p90").hasClass("passed")) $("#progressBar .p90").addClass("passed");
}


//===============================
// END OF GAME
//===============================
Game.prototype.gameComplete = function() {
	$game.isCompleted = true;
	setTimeout($game.showResults, $game.song.barLength * 1000);
}

Game.prototype.gameOver = function() {
	var game = this;
	this.isGameOver = true;

	$audioEngine.BGM.setCrossfade(0);
	TweenMax.to(this.song.staffScroll, 3, {timeScale:0, ease:Power3.easeOut,
		onComplete:function() {
			game.showResults();
		}
	});
}

Game.prototype.showResults = function() {
	$game.removeListeners();

	$game.pause(true);
	$audioEngine.BGM.hasEnded = true;

	if($game.progress == 100) {
		$game.rank = "perfect"; // S
		$game.stars = 5;
	}
	else if($game.progress >= 90 && $game.progress <= 99.9) {
		$game.rank = "great"; // A
		$game.stars = 4;
	}
	else if($game.progress >= 75 && $game.progress <= 89) {
		$game.rank = "cool"; // B
		$game.stars = 3;
	}
	else if($game.progress >= 60 && $game.progress <= 74) {
		$game.rank = "okay"; // C
		$game.stars = 2;
	}
	else if($game.progress >= 0 && $game.progress <= 59) {
		$game.rank = "poor"; // D
		$game.stars = 1;
	}

	if($game.isGameOver) {
		$game.rank = "drop out"; // E
		$game.stars = 0;
	}

	if($game.combo > 0) {
		$game.comboArray.push($game.combo);
		$game.combo = 0;
	}

	var maxCombo = Math.max.apply(Math, $game.comboArray);
	if(isNaN(maxCombo) || !isFinite(maxCombo)) maxCombo = 0;

	var newScore = [$game.score, $game.progress, $game.rank, $game.stars, new Date()];
	var highScores = getLocalStorage("highScores") || [[], [], [], [], [], [], [], [], [], []];
	var newRecord = false;

	for(var i = 0; i < highScores.length; i++) {
		if(highScores[i][0] == undefined || $game.score > highScores[i][0]) {
			for(var j = highScores.length - 2; j >= i; j--) {
				highScores[j+1] = highScores[j];
			}

			highScores[i] = newScore;
			setLocalStorage("highScores", highScores);
			if(i == 0 && highScores[i][0] > 0) newRecord = true;
			break;
		}
	}

	if($game.stars < 2) $("#screen_results").find("h2").html("stage failed...");
	else $("#screen_results").find("h2").html("stage cleared!");

	$("#screen_results").find(".nb, .points, .percent").empty();
	$("#results_okay .percent, #results_poor .percent, #results_miss .percent, #results_miss .points").html("-");
	$("#results_totalNotes").find(".nb").html($game.totalNotes);

	var percentGreat = ($game.accuracy[0] * 100 / $game.totalNotes).toFixed(1);
	var percentCool = ($game.accuracy[1] * 100 / $game.totalNotes).toFixed(1);

	$("#results_score").find(".newRecord").removeClass("visible");
	$("#results_highScore").find(".points").html(highScores[0][0]+"pts");

	$("#screen_results").find(".title").html($game.song.title);
   	$("#screen_results").find(".artist").html("by "+$game.song.artist);


   	var rank = $game.rank.replace($game.rank.charAt(0), $game.rank.charAt(0).toUpperCase());
   	$("#screen_results").find(".rank").html(rank);

   	$("#screen_results .stars i").removeClass("on");
   	for(var i = 0; i < $game.stars; i++)
   		$("#screen_results .stars").find("i").eq(i).addClass("on");

	$("#screen_results").addClass("active");

	var timeline = new TimelineMax({ paused:true, onComplete:function() { clearProps(this) } });
	timeline.add(toggleTitle(true));
	timeline.add(scrollToValue($("#results_maxCombo .nb"), 0, maxCombo, false, true));

	timeline.add(scrollToValue($("#results_great .nb").fadeIn(), 0, $game.accuracy[0], false, true), "-=.2");
	timeline.add(scrollToValue($("#results_cool .nb"), 0, $game.accuracy[1], false, true), "-=.2");
	timeline.add(scrollToValue($("#results_okay .nb"), 0, $game.accuracy[2], false, true), "-=.2");
	timeline.add(scrollToValue($("#results_poor .nb"), 0, $game.accuracy[3], false, true), "-=.2");
	timeline.add(scrollToValue($("#results_miss .nb"), 0, $game.accuracy[4], false, true), "-=.2");

	timeline.add(scrollToValue($("#results_great .points").fadeIn(), 0, $game.points[0], false, true, "pts"));
	timeline.add(scrollToValue($("#results_cool .points"), 0, $game.points[1], false, true, "pts"), "-=.2");
	timeline.add(scrollToValue($("#results_okay .points"), 0, $game.points[2], false, true, "pts"), "-=.2");
	timeline.add(scrollToValue($("#results_poor .points"), 0, $game.points[3], false, true, "pts"), "-=.2");

	timeline.add(scrollToValue($("#results_great .percent").fadeIn(), 0, percentGreat, true, true, "%"));
	timeline.add(scrollToValue($("#results_cool .percent"), 0, percentCool, true, true, "%"), "-=.2");

	timeline.add(scrollToValue($("#results_totalCompletion .percent"), 0, $game.progress, true, true, "%"));

	timeline.add(scrollToValue($("#results_score .points"), 0, $game.score, false, true, "pts"));
	timeline.call(function() {
		if(newRecord) $("#results_score").find(".newRecord").addClass("visible");
	});

	timeline.staggerFrom($("#screen_results .stars i"), .2, { opacity:0, transform:"scale(2)", ease:Power4.easeOut,
		onComplete:function() { $audioEngine.SFX.play("star"); }
	}, .1);
	timeline.from($("#screen_results .rank"), 1, { opacity:0, right:"-20px", ease:Power4.easeOut,
		onStart:function() { 
			if($game.stars < 2) $audioEngine.SFX.play("stageFailed");
			else newRecord ? $audioEngine.SFX.play("stageCompleteRecord") : $audioEngine.SFX.play("stageComplete");
		}
	}, "+=.2");

	timeline.add(toggleNav(true), "-=.5");

	setTimeout(function() { timeline.play(); }, 300);
}


//===============================
// SINGLETON
Game.getInstance = function(songFile) {
//===============================
  if(this.instance == null) 
  	this.instance = new Game(songFile);
  return this.instance;  
} 

Game.instance = null;