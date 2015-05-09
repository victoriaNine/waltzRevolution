var keyMap = {
	32: {name: "space", pressed: false, when:0, gamePad : true},
	37: {name: "left", pressed: false, when:0, gamePad : true},
	38: {name: "up", pressed: false, when:0, gamePad : true},
	39: {name: "right", pressed: false, when:0, gamePad : true},
	40: {name: "down", pressed: false, when:0, gamePad : true},
	80: {name: "P", pressed: false, when:0}
};


//===============================
// INPUT ACCURACY DETECTION
function detectInputAccuracy(key) {
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
			if(note.tnSongPosition >= BGM.getCurrentPosition()) {
				var noteAmount = (note.tnSongPosition - note.songPosition) / $game.song.baseNoteLength;
				incrementScore(Math.ceil(note.score / noteAmount), true);
				return true;
			}
			else if(note.tnSongPosition + $game.song.baseNoteLength >= BGM.getCurrentPosition()) {
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
		   && BGM.getCurrentPosition() >= min && BGM.getCurrentPosition() <= max)
		{
			var delta = Math.abs(BGM.getCurrentPosition() - note.songPosition);
			var percentage = 100 - Math.ceil(delta * 100 / $game.song.baseNoteLength);
			okPerc.push(percentage);
			okIndex.push(note.index);

			return true;
		}
	};

	okNotes = $game.song.notes.filter(regularNote);
	if(okNotes.length == 0) {
		// THEN THERE IS NO NOTE TO PLAY : LOSE POINTS
		decrementHP(10, true);
		return;
	}

	var closestNoteIndex = okIndex.indexOf(Math.min.apply(Math, okIndex));
	var closestNote = $game.song.notes[okNotes[closestNoteIndex].index];
	closestNote.score = okPerc[closestNoteIndex];

	if(closestNote.score >= 80 && closestNote.score <= 100) {
		closestNote.accuracy = "great";
		$game.accuracy[0]++;
		$game.points[0] += closestNote.score;

		incrementHP(15, true);
	}
	else if(closestNote.score >= 50 && closestNote.score <= 79) {
		closestNote.accuracy = "cool";
		$game.accuracy[1]++;
		$game.points[1] += closestNote.score;

		incrementHP(10, true);
	}
	else if(closestNote.score >= 30 && closestNote.score <= 49) {
		closestNote.accuracy = "okay";
		$game.accuracy[2]++;
		$game.points[2] += closestNote.score;

		incrementHP(5, true);
	}
	else if(closestNote.score >= 1 && closestNote.score <= 29) {
		closestNote.accuracy = "poor";
		$game.accuracy[3]++;
		$game.points[3] += closestNote.score;

		decrementHP(5, true);
	}

	incrementScore(closestNote.score, true);
	closestNote.pressed = true;

	if(closestNote.accuracy == "great" || closestNote.accuracy == "cool")
		$game.combo++;
	else if($game.combo > 0) {
		$game.comboArray.push($game.combo);
		$game.combo = 0;
	}

	updateProgress();
	showAccuracy(closestNote);
}


//===============================
// FAILED TO INPUT IN TIME
function missedNote(note) {
//===============================
	note.accuracy = "miss";
	$game.accuracy[4]++;

	if($game.combo > 0) {
		$game.comboArray.push($game.combo);
		$game.combo = 0;
	}

	decrementHP(15, true);
	showAccuracy(note);
}