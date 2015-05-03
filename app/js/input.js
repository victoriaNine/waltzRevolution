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

	if(keyName == "P") $song.triggerPause();
	if($song.paused || !gamePad) return;

	$("#key"+keyNameFirstLetterUppercase).addClass("pressed");
	var okPerc = [], okNotes = [], okIndex = [], okTiedNotes = [];

	var tiedNote = function(note) {
		if(note.hasTiedNote && note.pressed && note.key == keyName) {
			if(note.tnSongPosition >= BGM.getCurrentPosition()) {
				incrementScore(note.score, true);
				return true;
			}
			else if(note.tnSongPosition + $song.baseNoteLength >= BGM.getCurrentPosition()) {
				return true;
			}
		}
	}

	okTiedNotes = $song.notes.filter(tiedNote);
	if(okTiedNotes.length > 0) return;

	// IT DOESN'T HAVE A TIED NOTE, MAYBE IT'S A REGULAR ONE THEN?
	var regularNote = function(note) {
		var min = note.songPosition - $song.baseNoteLength;
		var max = note.songPosition + $song.baseNoteLength;
		var nextNoteSongPosition = $song.notes[$song.currentNoteIndex].songPosition;

		if(!note.pressed && note.key == keyName && inputDelay <= $song.baseNoteLength
		   && BGM.getCurrentPosition() >= min && BGM.getCurrentPosition() <= max)
		{
			var delta = Math.abs(BGM.getCurrentPosition() - note.songPosition);
			var percentage = Math.ceil(delta * 100 / $song.baseNoteLength);
			okPerc.push(percentage);
			okIndex.push(note.index);

			return true;
		}
	};

	okNotes = $song.notes.filter(regularNote);
	if(okNotes.length == 0) {
		// THEN THERE IS NO NOTE TO PLAY : LOSE POINTS
		decrementHP(10, true);
		return;
	}

	var closestNoteIndex = okIndex.indexOf(Math.min.apply(Math, okIndex));
	var closestNote = $song.notes[okNotes[closestNoteIndex].index];
	closestNote.score = okPerc[closestNoteIndex];

	if(closestNote.score >= 80 && closestNote.score <= 100) {
		closestNote.accuracy = "great";
		$accuracy[0]++;

		incrementHP(15, true);
	}
	else if(closestNote.score >= 50 && closestNote.score <= 79) {
		closestNote.accuracy = "cool";
		$accuracy[1]++;

		incrementHP(10, true);
	}
	else if(closestNote.score >= 30 && closestNote.score <= 49) {
		closestNote.accuracy = "okay";
		$accuracy[2]++;

		incrementHP(5, true);
	}
	else if(closestNote.score >= 1 && closestNote.score <= 29) {
		closestNote.accuracy = "poor";
		$accuracy[3]++;

		decrementHP(5, true);
	}

	incrementScore(closestNote.score, true);
	closestNote.pressed = true;

	if(closestNote.accuracy == "great" || closestNote.accuracy == "cool") {
		$combo++;
	}
	else if($combo > 1) {
		$comboArray.push($combo);
		$combo = 0;
	}

	updateProgress();
}


//===============================
// FAILED TO INPUT IN TIME
function missedNote(note) {
//===============================
	note.accuracy = "miss";
	$accuracy[4]++;

	if($combo > 1) {
		$comboArray.push($combo);
		$combo = 0;
	}

	decrementHP(15, true);
}