function Game(songFile) {
	this.songFile = songFile;
	this.song;

	this.HP = 500;
	this.maxHP = 1000;

	this.score = 0;
	this.progress = 0;
	this.rank;
	this.stars = 0;

	this.accuracy = [0, 0, 0, 0, 0] // great, nice, cool, poor, miss
	this.points = [0, 0, 0, 0] // great, nice, cool, poor
	this.totalNotes;
	this.comboArray = [];
	this.combo = 0;

	this.noInput = false;
	this.keyMap = {
		32: {name: "space", pressed: false, when:0, gamePad : true},
		37: {name: "left", pressed: false, when:0, gamePad : true},
		38: {name: "up", pressed: false, when:0, gamePad : true},
		39: {name: "right", pressed: false, when:0, gamePad : true},
		40: {name: "down", pressed: false, when:0, gamePad : true},
		80: {name: "P", pressed: false, when:0}
	};

	this.isGameOver = false;
	this.ready = false;

	this.intro = new TimelineMax({ paused:true });
	this.intro.staggerFrom(["#life", "#progress"], .4, { opacity:0, top:"20px", ease:Power4.easeOut, clearProps: "all" }, .2);
	this.intro.from("#lifeSphere", .4, { opacity:0, transform:"scale(1.25)", ease:Power4.easeOut, clearProps: "all" }, 0);
	this.intro.from("#progressBar", 1, { opacity:0, width:"0", ease:Power4.easeOut, clearProps: "all" });
	this.intro.from("#score", .4, { opacity:0, top:"20px", ease:Power4.easeOut, clearProps: "all" }, "-=.2");

	this.loadSong();
}

Game.prototype.loadSong = function() {
	var game = this;

	this.song = new Song(this.songFile, function() {
		game.initValues();

		var fileName = this.url.slice(this.url.lastIndexOf("/")+1, this.url.lastIndexOf("."));
		$audioEngine.BGM.setFile(fileName);
		$audioEngine.BGM.addSource(this.fileURL, game.launch);
	});
}

Game.prototype.initValues = function() {
	$("#songInfo .title").html(this.song.title);
	$("#songInfo .artist").html(this.song.artist);
	$("#progressBar .marker").removeClass("passed");

	this.totalNotes = this.song.notes.length;

	this.updateScore();
	this.updateHP();
	this.updateProgress();

	this.intro.play();
}

Game.prototype.start = function() {
	$("#screen_play").addClass("ready");
	this.addListeners();

	if(!mobilecheck()) this.song.start();
	this.ready = true;
}

Game.prototype.launch = function() {
	checkFocus(function() {
		$game.start();

		drawAudioVisualizer();
		toggleAudioVisualizer(true);
	});
}

Game.prototype.stop = function() {
	cancelAnimationFrame(draw);
	$("#screen_play").removeClass("ready");

	if(!this.isGameOver) {
		this.isGameOver = true;
		$audioEngine.BGM.hasEnded = true;

		this.removeListeners();
	}

	Game.instance = null;
}

Game.prototype.retry = function() {
	this.stop();
	newGame();
}

Game.prototype.quit = function() {
	this.stop();
	toMainMenu();
}

Game.instance = null;

Game.getInstance = function(songFile) {  
  if (this.instance == null) {  
      this.instance = new Game(songFile);  
  }  
  
  return this.instance;  
} 

//===============================
// EVENT LISTENERS
// Keyboard input, touch events, window resize
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

	game.onResize = function() {
		$("#notes").attr("width", parseFloat($("#notes").css("width"))).attr("height", parseFloat($("#notes").css("height")));
		requestAnimationFrame(draw);
	}

	game.onBlur = function() {
		if(game.ready && !game.song.paused) game.song.pause();
	}

	game.onTouchevent = function(e) {
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
	}

	$(window).keydown(this.onKeydown).keyup(this.onKeyup).resize(this.onResize).blur(this.onBlur);
	$("#keys .keyUp, #keys .keyRight, #keys .keyLeft, #keys .keyDown, #keys .keySpace").on('touchstart touchend', this.onTouchevent);
}


Game.prototype.removeListeners = function() {
	$(window).off("keydown", this.onKeydown).off("keyup", this.onKeyup).off("resize", this.onResize).off("blur", this.onBlur);
	$("#keys .keyUp, #keys .keyRight, #keys .keyLeft, #keys .keyDown, #keys .keySpace").off('touchstart touchend', this.onTouchevent);
}


//===============================
// INPUT ACCURACY DETECTION
Game.prototype.detectInputAccuracy = function(key) {
//===============================
	var keyName = key.name;
	var keyNameFirstLetterUppercase = keyName.replace(keyName.charAt(0), keyName.charAt(0).toUpperCase());
	var gamePad = key.gamePad;
	var inputDelay = (new Date().getTime() - key.when) / 1000;


	if(keyName == "P") $game.song.triggerPause();
	if($game.noInput || !gamePad) return;

	$("#keys .key"+keyNameFirstLetterUppercase).addClass("pressed");
	var okPerc = [], okNotes = [], okIndex = [], okTiedNotes = [];

	var tiedNote = function(note) {
		if(note.hasTiedNote && note.pressed && note.key == keyName) {
			if(note.tnSongPosition >= $audioEngine.BGM.currentPosition()) {
				var noteAmount = (note.tnSongPosition - note.songPosition) / $game.song.baseNoteLength;
				$game.incrementScore(Math.ceil(note.score / noteAmount), true);
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

			$audioEngine.SFX.play("input");

			return true;
		}
	};

	okNotes = $game.song.notes.filter(regularNote);
	if(okNotes.length == 0) {
		// THEN THERE IS NO NOTE TO PLAY : LOSE POINTS
		$game.decrementHP(10, true);
		return;
	}

	var closestNoteIndex = okIndex.indexOf(Math.min.apply(Math, okIndex));
	var closestNote = $game.song.notes[okNotes[closestNoteIndex].index];
	closestNote.score = okPerc[closestNoteIndex];

	if(closestNote.score >= 80 && closestNote.score <= 100) {
		closestNote.accuracy = "great";
		$game.accuracy[0]++;
		$game.points[0] += closestNote.score;

		$game.incrementHP(15, true);
	}
	else if(closestNote.score >= 50 && closestNote.score <= 79) {
		closestNote.accuracy = "cool";
		$game.accuracy[1]++;
		$game.points[1] += closestNote.score;

		$game.incrementHP(10, true);
	}
	else if(closestNote.score >= 30 && closestNote.score <= 49) {
		closestNote.accuracy = "okay";
		$game.accuracy[2]++;
		$game.points[2] += closestNote.score;

		$game.incrementHP(5, true);
	}
	else if(closestNote.score >= 1 && closestNote.score <= 29) {
		closestNote.accuracy = "poor";
		$game.accuracy[3]++;
		$game.points[3] += closestNote.score;

		$game.decrementHP(5, true);
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

	this.decrementHP(15, true);
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

	TweenMax.to($({someValue: currentValue}), .4, {someValue: this.score, ease:Power3.easeInOut,
		onUpdate:function(tween) {
			$("#score .value").html(Math.ceil(tween.target[0].someValue));
		},
		onUpdateParams:["{self}"]
	});
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
Game.prototype.updateProgress = function() {
	var progress = (this.accuracy[0] + this.accuracy[1]) * 100 / this.totalNotes;
	var currentValue = parseFloat($("#progress .value").html()) || 0;

	TweenMax.to($({someValue: currentValue}), .4, {someValue: progress, ease:Power3.easeInOut,
		onUpdate:function(tween) {
			$("#progress .value").html((tween.target[0].someValue).toFixed(1)+"%");
		},
		onUpdateParams:["{self}"]
	});

	TweenMax.to($("#progressBar .bar"), .4, {width: progress+"%", ease:Power3.easeInOut});

	this.progress = progress.toFixed(1);
	if(this.progress >= 60 && !$("#progressBar .p60").hasClass("passed")) $("#progressBar .p60").addClass("passed");
	if(this.progress >= 75 && !$("#progressBar .p75").hasClass("passed")) $("#progressBar .p75").addClass("passed");
	if(this.progress >= 90 && !$("#progressBar .p90").hasClass("passed")) $("#progressBar .p90").addClass("passed");
}


//===============================
// PARTY COMPLETED
//===============================
Game.prototype.gameComplete = function() {
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
	cancelAnimationFrame(draw);
	$game.removeListeners();

	$game.song.pause(true);
	$audioEngine.BGM.hasEnded = true;

	if($game.progress == 100) {
		$game.rank = "perfect"; // S
		$game.stars = 5;
	}
	else if($game.progress >= 90 && $game.progress <= 99) {
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

	$("#results_totalNotes").find(".nb").html($game.totalNotes);
	$("#results_maxCombo").find(".nb").html(maxCombo);

	var percentGreat = ($game.accuracy[0] * 100 / $game.totalNotes).toFixed(1);
	$("#results_great").find(".nb").html($game.accuracy[0]);
	$("#results_great").find(".points").html($game.points[0]+"pts");
	$("#results_great").find(".percent").html(percentGreat+"%");

	var percentNice = ($game.accuracy[1] * 100 / $game.totalNotes).toFixed(1);
	$("#results_nice").find(".nb").html($game.accuracy[1]);
	$("#results_nice").find(".points").html($game.points[1]+"pts");
	$("#results_nice").find(".percent").html(percentNice+"%");

	$("#results_cool").find(".nb").html($game.accuracy[2]);
	$("#results_cool").find(".points").html($game.points[2]+"pts");
	$("#results_poor").find(".nb").html($game.accuracy[3]);
	$("#results_poor").find(".points").html($game.points[3]+"pts");
	$("#results_miss").find(".nb").html($game.accuracy[4]);

	$("#results_totalCompletion").find(".percent").html($game.progress+"%");

	$("#results_score").find(".newRecord").removeClass("visible");
	$("#results_score").find(".points").html($game.score+"pts");
	$("#results_highScore").find(".points").html(highScores[0][0]+"pts");
	if(newRecord) $("#results_score").find(".newRecord").addClass("visible");

	$("#screen_results").find(".title").html($game.song.title);
   	$("#screen_results").find(".artist").html("by "+$game.song.artist);


   	var rank = $game.rank.replace($game.rank.charAt(0), $game.rank.charAt(0).toUpperCase());
   	$("#screen_results").find(".rank").html(rank);

   	$("#screen_results .stars i").removeClass("on");
   	for(var i = 0; i < $game.stars; i++)
   		$("#screen_results .stars").find("i").eq(i).addClass("on");

	$("#screen_results").addClass("active");
	enterMenu();
}