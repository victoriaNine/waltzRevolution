function Game(songFile) {
	this.songFile = songFile;
	this.song;

	this.HP = 500;
	this.maxHP = 1000;

	console.log(this.HP);

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

	this.loadSong();
}

Game.prototype.loadSong = function() {
	var game = this;
	this.song = new Song(this.songFile, function() {
		$audioEngine.BGM.addSource(game.song.fileURL, function() {
			console.log(game);
			game.start();
		});

		game.initValues();
	});

  	this.song.load();
}

Game.prototype.initValues = function() {
	$("#songInfo .title").html(this.song.title);
	$("#songInfo .artist").html(this.song.artist);
	$("#progressBar .markers").removeClass("passed");

	this.totalNotes = this.song.notes.length;

	this.updateScore();
	this.updateHP();
	this.updateProgress();
}

Game.prototype.start = function() {
	this.addListeners();

	if(!mobilecheck()) this.song.start();
	this.ready = true;
}

//===============================
// EVENT LISTENERS
// Keyboard input, touch events, window resize
Game.prototype.addListeners = function() {
//===============================
	var game = this;

	$(window).keydown(function(e) {
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
	}).keyup(function(e) {
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
	}).resize(function() {
		$("#notes").attr("width", parseFloat($("#notes").css("width"))).attr("height", parseFloat($("#notes").css("height")));
		requestAnimationFrame(draw);
	}).on("blur", function() {
		if($audioEngine.ready && game.ready && !game.song.paused)
			game.song.pause();
	});

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

	$(document).on("songEnded", this.gameComplete);
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
				this.incrementScore(Math.ceil(note.score / noteAmount), true);
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

			return true;
		}
	};

	okNotes = $game.song.notes.filter(regularNote);
	if(okNotes.length == 0) {
		// THEN THERE IS NO NOTE TO PLAY : LOSE POINTS
		this.decrementHP(10, true);
		return;
	}

	var closestNoteIndex = okIndex.indexOf(Math.min.apply(Math, okIndex));
	var closestNote = $game.song.notes[okNotes[closestNoteIndex].index];
	closestNote.score = okPerc[closestNoteIndex];

	if(closestNote.score >= 80 && closestNote.score <= 100) {
		closestNote.accuracy = "great";
		$game.accuracy[0]++;
		$game.points[0] += closestNote.score;

		this.incrementHP(15, true);
	}
	else if(closestNote.score >= 50 && closestNote.score <= 79) {
		closestNote.accuracy = "cool";
		$game.accuracy[1]++;
		$game.points[1] += closestNote.score;

		this.incrementHP(10, true);
	}
	else if(closestNote.score >= 30 && closestNote.score <= 49) {
		closestNote.accuracy = "okay";
		$game.accuracy[2]++;
		$game.points[2] += closestNote.score;

		this.incrementHP(5, true);
	}
	else if(closestNote.score >= 1 && closestNote.score <= 29) {
		closestNote.accuracy = "poor";
		$game.accuracy[3]++;
		$game.points[3] += closestNote.score;

		this.decrementHP(5, true);
	}

	this.incrementScore(closestNote.score, true);
	closestNote.pressed = true;

	if(closestNote.accuracy == "great" || closestNote.accuracy == "cool")
		$game.combo++;
	else if($game.combo > 0) {
		$game.comboArray.push($game.combo);
		$game.combo = 0;
	}

	this.updateProgress();
	this.showAccuracy(closestNote);
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
	this.toResults();
}

Game.prototype.gameOver = function() {
	var game = this;
	this.isGameOver = true;

	$audioEngine.BGM.setCrossfade(0);
	TweenMax.to(this.song.staffScroll, 3, {timeScale:0, ease:Power3.easeOut,
		onComplete:function() { game.toResults(); }
	});
}

Game.prototype.toResults = function() {
	this.song.pause(true);
	$audioEngine.BGM.hasEnded = true;

	if(this.progress == 100) {
		this.rank = "perfect"; // S
		this.stars = 5;
	}
	else if(this.progress >= 90 && this.progress <= 99) {
		this.rank = "great"; // A
		this.stars = 4;
	}
	else if(this.progress >= 75 && this.progress <= 89) {
		this.rank = "cool"; // B
		this.stars = 3;
	}
	else if(this.progress >= 60 && this.progress <= 74) {
		this.rank = "okay"; // C
		this.stars = 2;
	}
	else if(this.progress >= 0 && this.progress <= 59) {
		this.rank = "poor"; // D
		this.stars = 1;
	}

	var maxCombo = Math.max.apply(Math, this.comboArray);
	if(isNaN(maxCombo) || !isFinite(maxCombo)) maxCombo = 0;

	var newScore = [this.score, this.progress, this.rank, this.stars, new Date()];
	var highScores = getLocalStorage("highScores") || [[], [], [], [], [], [], [], [], [], []];
	var newRecord = false;

	for(var i = 0; i < highScores.length; i++) {
		if(highScores[i][0] == undefined || this.score > highScores[i][0]) {
			for(var j = highScores.length - 2; j >= i; j--) {
				highScores[j+1] = highScores[j];
			}

			highScores[i] = newScore;
			setLocalStorage("highScores", highScores);
			if(i == 0) newRecord = true;
			break;
		}
	}

	if(this.rank == "poor") $("#screen_results").find("h2").html("stage failed...");
	else $("#screen_results").find("h2").html("stage cleared!");

	$("#results_totalNotes").find(".nb").html(this.totalNotes);
	$("#results_maxCombo").find(".nb").html(maxCombo);

	var percentGreat = (this.accuracy[0] * 100 / this.totalNotes).toFixed(1);
	$("#results_great").find(".nb").html(this.accuracy[0]);
	$("#results_great").find(".points").html(this.points[0]+"pts");
	$("#results_great").find(".percent").html(percentGreat+"%");

	var percentNice = (this.accuracy[1] * 100 / this.totalNotes).toFixed(1);
	$("#results_nice").find(".nb").html(this.accuracy[1]);
	$("#results_nice").find(".points").html(this.points[1]+"pts");
	$("#results_nice").find(".percent").html(percentNice+"%");

	$("#results_cool").find(".nb").html(this.accuracy[2]);
	$("#results_cool").find(".points").html(this.points[2]+"pts");
	$("#results_poor").find(".nb").html(this.accuracy[3]);
	$("#results_poor").find(".points").html(this.points[3]+"pts");
	$("#results_miss").find(".nb").html(this.accuracy[4]);

	$("#results_totalCompletion").find(".percent").html(this.progress+"%");

	$("#results_score").find(".newRecord").removeClass("visible");
	$("#results_score").find(".points").html(this.score+"pts");
	$("#results_highScore").find(".points").html(highScores[0][0]+"pts");
	if(newRecord) $("#results_score").find(".newRecord").addClass("visible");

	$("#screen_results").find(".title").html(this.song.title);
   	$("#screen_results").find(".artist").html("by "+this.song.artist);


   	var rank = this.rank.replace(this.rank.charAt(0), this.rank.charAt(0).toUpperCase());
   	$("#screen_results").find(".rank").html(rank);

   	$("#screen_results .stars i").removeClass("on");
   	for(var i = 0; i < this.stars; i++)
   		$("#screen_results .stars").find("i").eq(i).addClass("on");

	$("#screen_results").addClass("open");
}