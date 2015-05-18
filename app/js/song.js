var canvas = document.getElementById("notes");
var ctx = canvas.getContext("2d"); 

//===============================
// SONG CLASS
// - Paint the staff in sync with the music
function Song(url, callback) {
//===============================
  this.url = url;
  this.callback = callback;

  this.title;
  this.artist;
  this.tempo = 120;
  this.timeSignature = [4, 4];
  this.noteScale = 16;
  this.startTime = 0;
  this.fileURL;

  this.score = [];
  this.notes = [];

  this.baseNoteLength;
  this.barLength;

  this.noteWidth = 32; // Width of a note in the staff, in pixels
  this.currentStaffPosition = 0;
  this.staffLength;
  this.staffScroll;
  this.staffScrollDuration;

  this.currentNoteIndex = 0;

  this.load(url);
}

Song.prototype.load = function(url) {
  // Load song asynchronously
  var request = new XMLHttpRequest();
  request.open("GET", url, true);

  var loader = this;

  request.onload = function() {
    var song = JSON.parse(request.response);

    loader.title = song.title;
    loader.artist = song.artist;
    loader.tempo = song.tempo;
    loader.timeSignature = song.timeSignature;
    loader.noteScale = song.noteScale;
    loader.startTime = song.startTime;
    loader.fileURL = song.fileURL;
    loader.score = song.notes;

    loader.baseNoteLength = (60 / loader.tempo) * (4 / loader.timeSignature[1]);
    loader.barLength = loader.baseNoteLength * loader.timeSignature[0];

    for(var i = 0; i < loader.score.length; i++) {
        loader.notes[i] = new Note(
          loader.score[i].key,
          loader.score[i].bar,
          loader.score[i].beat,
          loader.score[i].beatPosition,
          loader.score[i].beatDivision,
          loader.score[i].hasTiedNote,
          loader.score[i].tnBeat,
          loader.score[i].tnBeatPosition,
          loader.score[i].tnBeatDivision
        );

        loader.notes[i].index = i;
        loader.notes[i].init();
    }

    loader.staffLength = loader.notes[loader.notes.length - 1].staffPosition + loader.noteWidth;
    loader.staffScrollDuration = loader.notes[loader.notes.length - 1].songPosition;

    loader.callback();
  }

  request.onerror = function() { alert('Song: XHR error'); }

  request.send();
}

Song.prototype.start = function() {
  $audioEngine.BGM.play();

  this.draw();
  TweenMax.ticker.addEventListener("tick", this.rAF);

  var song = this;

  this.staffScroll = TweenMax.to($("<div>").css("left","0px"), this.staffScrollDuration, {left:this.staffLength+"px", ease:Power0.easeNone,
      onUpdate:function(tween, prop) {
        song.currentStaffPosition = parseFloat($(tween.target).css(prop));
      },
      onUpdateParams:["{self}", 'left'],
      onComplete: function() {
        song.stopRAF();
        $game.gameComplete();
      }
  });
}


//===============================
// UPDATE CANVAS
Song.prototype.draw = function() {
//===============================
  ctx.clearRect(0, 0, $(canvas).width(), $(canvas).height());
  if(!$game) return;

  var startIndex = $game.song.currentNoteIndex;

  for(var i = startIndex; i < $game.song.score.length; i++) {
    $game.song.notes[i].draw();
    if(!$game.isGameOver) $game.song.notes[i].checkInput();
  }
}

Song.prototype.rAF = function() { requestAnimationFrame($game.song.draw); }
Song.prototype.stopRAF = function() { TweenMax.ticker.removeEventListener("tick", this.rAF); cancelAnimationFrame(this.draw); }


//===============================
// NOTE CLASS
function Note(key, bar, beat, beatPosition, beatDivision, hasTiedNote, tnBeat, tnBeatPosition, tnBeatDivision) {
//===============================
  this.index;
  this.key = key;
  this.bar = bar;
  this.beat = beat;
  this.beatPosition = beatPosition;
  this.beatDivision = beatDivision;

  this.hasTiedNote = hasTiedNote || false;
  this.tnBeat = tnBeat;
  this.tnBeatPosition = tnBeatPosition;
  this.tnBeatDivision = tnBeatDivision;

  this.pressed = false;
  this.score = 0;
  this.accuracy;

  this.init = function() {
    this.songPosition = $game.song.startTime;
    // At what time is the bar
    this.songPosition  = $game.song.barLength * (bar-1);
    // At what time is the beat in said bar
    this.songPosition += $game.song.baseNoteLength * (beat-1);
    // At what time is the note in said beat
    this.songPosition += $game.song.baseNoteLength * ($game.song.timeSignature[1] / beatDivision) * (beatPosition-1);

    // Where on the staff should the note be
    this.staffPosition = (this.songPosition / $game.song.baseNoteLength) * $game.song.noteScale * $game.song.noteWidth;

    if(hasTiedNote) {
      this.tnSongPosition  = this.songPosition;
      this.tnSongPosition += $game.song.baseNoteLength * (tnBeat-1);
      this.tnSongPosition += $game.song.baseNoteLength * ($game.song.timeSignature[1] / tnBeatDivision) * (tnBeatPosition-1);

      this.tnStaffPosition = (this.tnSongPosition / $game.song.baseNoteLength) * $game.song.noteScale * $game.song.noteWidth;
    }
    
    // Let's place the note on the staff
    this.draw();
  }

  this.draw = function() {
    var top;
    if(this.key == "up") top = 0;
    if(this.key == "right") top = 40;
    if(this.key == "left") top = 80;
    if(this.key == "down") top = 120;
    if(this.key == "space") top = 160;

    var orange = "#D55320";
    var beige = "#E1D7CE";

    var charCode;
    if(this.key == "up") charCode = "0xf062";
    if(this.key == "right") charCode = "0xf061";
    if(this.key == "left") charCode = "0xf060";
    if(this.key == "down") charCode = "0xf063";
    if(this.key == "space") charCode = "0xf12a";

    var textAlign = (this.key == "space") ? 10 : 5;
    ctx.font = "24px FontAwesome";

    if(this.hasTiedNote) {
      var noteStaffDistance = this.tnStaffPosition - this.staffPosition;
      var bridgeStaffPosition = this.staffPosition + $game.song.noteWidth/2;
      ctx.fillStyle = beige;
      ctx.fillRect(bridgeStaffPosition - $game.song.currentStaffPosition, top + 10, noteStaffDistance, 10);

      ctx.beginPath();
      ctx.arc((this.tnStaffPosition + 16) - $game.song.currentStaffPosition, top + 16, 16, 0, Math.PI*2);
      ctx.closePath();
      ctx.fillStyle = beige;
      ctx.fill();

      ctx.fillStyle = "#D55320";
      ctx.fillText(String.fromCharCode(charCode), (this.tnStaffPosition + textAlign) - $game.song.currentStaffPosition, top + 25);
    }

    ctx.beginPath();
    ctx.arc((this.staffPosition + 16) - $game.song.currentStaffPosition, top + 16, 16, 0, Math.PI*2);
    ctx.closePath();
    ctx.fillStyle = beige;
    ctx.fill();

    ctx.fillStyle = "#D55320";
    ctx.fillText(String.fromCharCode(charCode), (this.staffPosition + textAlign) - $game.song.currentStaffPosition, top + 25);
  }

  this.checkInput = function() {
    var songPosition = this.hasTiedNote ? this.tnSongPosition : this.songPosition;
    if((songPosition + $game.song.baseNoteLength) < $audioEngine.BGM.currentPosition() && this.index == $game.song.currentNoteIndex) {
        $game.song.currentNoteIndex = this.index + 1;

        if(!this.accuracy && !this.pressed) $game.missedNote(this);
    }
  }
}


//===============================
// SINGLETON
Song.getInstance = function(url, callback) {
//===============================
  if(this.instance == null) 
    this.instance = new Song(url, callback);   
  return this.instance;  
}

Song.instance = null;