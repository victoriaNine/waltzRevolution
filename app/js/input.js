var keyMap = {
	32: {name: "space", pressed: false, when:0, gamePad : true},
	37: {name: "left", pressed: false, when:0, gamePad : true},
	38: {name: "up", pressed: false, when:0, gamePad : true},
	39: {name: "right", pressed: false, when:0, gamePad : true},
	40: {name: "down", pressed: false, when:0, gamePad : true},
	80: {name: "P", pressed: false, when:0}
};

function detectInputAccuracy(key) {
	var keyName = key.name;
	var keyNameFirstLetterUppercase = keyName.replace(keyName.charAt(0), keyName.charAt(0).toUpperCase());
	var gamePad = key.gamePad;

	if(keyName == "P") $song.triggerPause();
	if($song.paused || !gamePad) return;

	$("#key"+keyNameFirstLetterUppercase).addClass("pressed");
	var okPerc = [], okNotes = [], okIndex = [], okTiedNotes = [];

	var tiedNote = function(note) {
		if(note.hasTiedNote && note.pressed && note.tnSongPosition >= BGM.getCurrentPosition() && note.key == keyName) {
			incrementScore(note.score, true);
			return true;
		}
	}

	okTiedNotes = $song.notes.filter(tiedNote);
	if(okTiedNotes.length > 0) return;
	// IT DOESN'T HAVE A TIED NOTE, MAYBE IT'S A REGULAR ONE THEN?

	var regularNote = function(note) {
		var min = BGM.getCurrentPosition() - $song.baseNoteLength;
		var max = BGM.getCurrentPosition() + $song.baseNoteLength;
		var inputDelay = (new Date().getTime() - key.when) / 1000;

		if(note.songPosition >= min && note.songPosition <= max && note.key == keyName && inputDelay <= $song.baseNoteLength) {
			var delta = Math.abs(BGM.getCurrentPosition() - note.songPosition);
			var percentage = Math.ceil(delta * 100 / $song.baseNoteLength);
			okPerc.push(percentage);
			okIndex.push(note.index);

			return true;
		}
	};

	okNotes = $song.notes.filter(regularNote);
	if(okNotes.length == 0) {
		// THEN THERE IS NO NOTE TO PRESS : LOSE POINTS
		decrementScore(10, true);
		return;
	}

	var closestNoteIndex = okPerc.indexOf(Math.max.apply(Math, okPerc));
	var closestNote = $song.notes[okNotes[closestNoteIndex].index];
	closestNote.score = okPerc[closestNoteIndex];

	if(closestNote.score >= 90 && closestNote.score <= 100) {
		closestNote.accuracy = "perfect";
		$accuracy[0]++;
	}
	else if(closestNote.score >= 60 && closestNote.score <= 89) {
		closestNote.accuracy = "great";
		$accuracy[1]++;
	}
	else if(closestNote.score >= 30 && closestNote.score <= 59) {
		closestNote.accuracy = "cool";
		$accuracy[2]++;
	}
	else if(closestNote.score >= 10 && closestNote.score <= 29) {
		closestNote.accuracy = "poor";
		$accuracy[3]++;
	}
	else if(closestNote.score >= 1 && closestNote.score <= 9) {
		closestNote.accuracy = "miss";
		$accuracy[4]++;
		closestNote.score *= -1;
	}

	if(closestNote.accuracy != "miss") incrementScore(closestNote.score, true);
	else decrementScore(10 - Math.abs(closestNote.score), true);
	closestNote.pressed = true;
}

function failedNote(note) {
	// FAILED TO INPUT IN TIME
	note.accuracy = "fail";
	$accuracy[5]++;
	note.score = -10;
	
	decrementScore(Math.abs(note.score), true);
}