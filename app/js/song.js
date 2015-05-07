var canvas = document.getElementById("notes");
var ctx = canvas.getContext("2d"); 

window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                               window.webkitRequestAnimationFrame || window.msRequestAnimationFrame


//===============================
// SONG CLASS
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
  this.paused = false;
}

Song.prototype.loadSong = function(url) {
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

    $("#songInfo h1").html(loader.title);
    $("#songInfo h2").html(loader.artist);
    loader.callback();
  }

  request.onerror = function() { alert('Song: XHR error'); }

  request.send();
}

Song.prototype.load = function() { this.loadSong(this.url); }

Song.prototype.start = function() {
  var song = this;
  var rAF = function() { /*if(!song.paused)*/ requestAnimationFrame(draw); }

  BGM.play();
  draw();

  TweenMax.ticker.addEventListener("tick", rAF);
  this.staffScroll = TweenMax.to($("<div>").css("left","0px"), this.staffScrollDuration, {left:this.staffLength+"px", ease:Power0.easeNone,
      onUpdate:function(tween, prop) {
        song.currentStaffPosition = parseFloat($(tween.target).css(prop));
      },
      onUpdateParams:["{self}", 'left'],
      onComplete: function() {
        TweenMax.ticker.removeEventListener("tick", rAF);
        $(document).trigger("songEnded");
      }
  });
}

Song.prototype.pause = function() {
  if(!this.paused) {
    this.staffScroll.pause();
    BGM.pause();

    this.paused = true;
    $("#pauseScreen").addClass("open");
  }
}

Song.prototype.resume = function() {
  if(this.paused) {
    this.staffScroll.resume();
    BGM.unPause();

    this.paused = false;
    $("#pauseScreen").removeClass("open");
  }
}

Song.prototype.triggerPause = function() {
  this.paused ? this.resume() : this.pause();
}

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
    this.songPosition = $song.startTime;
    // At what time is the bar
    this.songPosition  = $song.barLength * (bar-1);
    // At what time is the beat in said bar
    this.songPosition += $song.baseNoteLength * (beat-1);
    // At what time is the note in said beat
    this.songPosition += $song.baseNoteLength * ($song.timeSignature[1] / beatDivision) * (beatPosition-1);

    // Where on the staff should the note be
    this.staffPosition = (this.songPosition / $song.baseNoteLength) * $song.noteScale * $song.noteWidth;

    if(hasTiedNote) {
      this.tnSongPosition  = this.songPosition;
      this.tnSongPosition += $song.baseNoteLength * (tnBeat-1);
      this.tnSongPosition += $song.baseNoteLength * ($song.timeSignature[1] / tnBeatDivision) * (tnBeatPosition-1);

      this.tnStaffPosition = (this.tnSongPosition / $song.baseNoteLength) * $song.noteScale * $song.noteWidth;
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
      var bridgeStaffPosition = this.staffPosition + $song.noteWidth/2;
      ctx.fillStyle = beige;
      ctx.fillRect(bridgeStaffPosition - $song.currentStaffPosition, top + 10, noteStaffDistance, 10);

      ctx.beginPath();
      ctx.arc((this.tnStaffPosition + 16) - $song.currentStaffPosition, top + 16, 16, 0, Math.PI*2);
      ctx.closePath();
      ctx.fillStyle = beige;
      ctx.fill();

      ctx.fillStyle = "#D55320";
      ctx.fillText(String.fromCharCode(charCode), (this.tnStaffPosition + textAlign) - $song.currentStaffPosition, top + 25);
    }

    ctx.beginPath();
    ctx.arc((this.staffPosition + 16) - $song.currentStaffPosition, top + 16, 16, 0, Math.PI*2);
    ctx.closePath();
    ctx.fillStyle = beige;
    ctx.fill();

    ctx.fillStyle = "#D55320";
    ctx.fillText(String.fromCharCode(charCode), (this.staffPosition + textAlign) - $song.currentStaffPosition, top + 25);
  }

  this.checkInput = function() {
    if((this.songPosition + $song.baseNoteLength) < BGM.getCurrentPosition()) {
      $song.currentNoteIndex = this.index + 1;

      if(!this.accuracy && !this.pressed) missedNote(this);
    }
  }
}

//===============================
// UPDATE CANVAS
function draw() {
//===============================
  ctx.clearRect(0, 0, $(canvas).width(), $(canvas).height());
  //var noteIndex = $gameOver ? 0 : $song.currentNoteIndex;

  for(var i = 0; i < $song.score.length; i++) {
    $song.notes[i].draw();
    $song.notes[i].checkInput();
  }
}

//===============================
// GET CSS PROPERTIES
function getStyle(selector, property, valueOnly) {
//===============================
  var styleSheets = document.styleSheets;
  var classes = [];

  for(var i = 0; i < styleSheets.length; i++) {
    if(!styleSheets[i].ownerNode.attributes.href.value.match("http|//")) {
      var rules = styleSheets[i].rules || styleSheets[i].cssRules;
      if(rules) classes.push(rules);
    }
  }

  for(var i = 0; i < classes.length; i++) {
    for(var j = 0; j < classes[i].length; j++) {
        if(classes[i][j].selectorText && classes[i][j].selectorText.indexOf(selector) != -1) {
            if(property) {
              if(valueOnly) return parseFloat(classes[i][j].style[property]);
              else return classes[i][j].style[property];
            }
            else {
              if(classes[i][j].cssText) return classes[i][j].cssText
              else return classes[i][j].style.cssText;
            }
        }
    }
  }
};