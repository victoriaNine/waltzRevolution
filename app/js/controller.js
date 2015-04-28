var keyMap = {
	32: {name: "space", pressed: false, when:0, gamePad : true},
	37: {name: "left", pressed: false, when:0, gamePad : true},
	38: {name: "up", pressed: false, when:0, gamePad : true},
	39: {name: "right", pressed: false, when:0, gamePad : true},
	40: {name: "down", pressed: false, when:0, gamePad : true},
	80: {name: "P", pressed: false, when:0}
};

function detectInput(key) {
	var keyName = key.name;
	var keyNameFirstLetterUppercase = keyName.replace(keyName.charAt(0), keyName.charAt(0).toUpperCase());
	var gamePad = key.gamePad;

	if(keyName == "P") $song.triggerPause();
	if($song.paused || !gamePad) return;

	$("#key"+keyNameFirstLetterUppercase).addClass("pressed");
	var okPerc = [], okNotes = [], okIndex = [], okTiedNotes = [];

	var tiedNote = function(note) {
		if(note.isTiedNote && note.pressed && note.tnSongPosition >= BGM.getCurrentPosition() && note.key == keyName) {
			incrementScore(note.score, true);
			return true;
		}
	}

	okTiedNotes = $song.notes.filter(tiedNote);
	if(okTiedNotes.length > 0) return;
	// IT ISN'T A TIED NOTE, MAYBE A REGULAR ONE THEN?

	var regularNote = function(note) {
		var min = BGM.getCurrentPosition() - $song.baseNoteLength;
		var max = BGM.getCurrentPosition() + $song.baseNoteLength;
		var inputDelay = (new Date().getTime() - key.when) / 1000;

		if(!note.isTiedNote && note.songPosition >= min && note.songPosition <= max && note.key == keyName && inputDelay <= $song.baseNoteLength) {
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
	}
	else if(closestNote.score >= 60 && closestNote.score <= 89) {
		closestNote.accuracy = "great";
	}
	else if(closestNote.score >= 30 && closestNote.score <= 59) {
		closestNote.accuracy = "cool";
	}
	else if(closestNote.score >= 10 && closestNote.score <= 29) {
		closestNote.accuracy = "poor";
	}
	else if(closestNote.score >= 1 && closestNote.score <= 9) {
		closestNote.accuracy = "miss";
	}

	if(closestNote.accuracy != "miss") incrementScore(closestNote.score, true);
	closestNote.pressed = true;
}