var _baseNoteLength;
var _barLength;
var _staffScale;
var _noteWidth = 32; // Width of a note in the staff, in pixels
var _currentStaffPosition = 0;
var _staffLength;
var _staffScroll;

var canvas = document.getElementById("notes");
var ctx = canvas.getContext("2d"); 

window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;


//===============================
// SONG CLASS
//
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

  this.score = new Array();
  this.notes = new Array();
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

    _baseNoteLength = (60 / loader.tempo) * (4 / loader.timeSignature[1]);
    _barLength = _baseNoteLength * loader.timeSignature[0];
    _staffScale = loader.noteScale;

    for(var i = 0; i < loader.score.length; i++) {
        loader.notes[i] = new Note(
          loader.score[i].key,
          loader.score[i].bar,
          loader.score[i].beat,
          loader.score[i].beatPosition,
          loader.score[i].beatDivision,
          loader.score[i].isTiedNote,
          loader.score[i].tnBeat,
          loader.score[i].tnBeatPosition,
          loader.score[i].tnBeatDivision
        );

        loader.notes[i].init();
    }

    _staffLength = loader.notes[loader.notes.length - 1].staffPosition + _noteWidth;
    loader.callback();
  }

  request.onerror = function() {
    alert('Song: XHR error');
  }

  request.send();
}

Song.prototype.load = function() {
  this.loadSong(this.url);
}

Song.prototype.start = function() {
  var test = this.notes[this.notes.length - 1].songPosition;
  var testFunction = function() {
    requestAnimationFrame(draw);
  }

  BGM.play();
  draw();

  TweenMax.ticker.addEventListener("tick", testFunction);
  _staffScroll = TweenMax.to($("<div>").css("left","0px"), test, {left:_staffLength+"px", ease:Power0.easeNone,
      onUpdate:function(tween, prop) {
        _currentStaffPosition = parseFloat($(tween.target).css(prop));
      },
      onUpdateParams:["{self}", 'left'],
      onComplete: function() {
        TweenMax.ticker.removeEventListener("tick", testFunction);
        $(document).trigger("songEnded");
      }
  });
}

function Note(key, bar, beat, beatPosition, beatDivision, isTiedNote, tnBeat, tnBeatPosition, tnBeatDivision) {
  this.key = key;
  this.bar = bar;
  this.beat = beat;
  this.beatPosition = beatPosition;
  this.beatDivision = beatDivision;

  this.isTiedNote = isTiedNote || false;
  this.tnBeat = tnBeat;
  this.tnBeatPosition = tnBeatPosition;
  this.tnBeatDivision = tnBeatDivision;

  this.init = function() {
    this.songPosition = $song.startTime;
    // At what time is the bar
    this.songPosition  = _barLength * (bar-1);
    // At what time is the beat in said bar
    this.songPosition += _baseNoteLength * (beat-1);
    // At what time is the note in said beat
    this.songPosition += _baseNoteLength * ($song.timeSignature[1] / beatDivision) * (beatPosition-1);

    // Where on the staff should the note be
    this.staffPosition = (this.songPosition / _baseNoteLength) * _staffScale * _noteWidth;

    if(isTiedNote) {
      this.tnSongPosition  = this.songPosition;
      this.tnSongPosition += _baseNoteLength * (tnBeat-1);
      this.tnSongPosition += _baseNoteLength * ($song.timeSignature[1] / tnBeatDivision) * (tnBeatPosition-1);

      this.tnStaffPosition = (this.tnSongPosition / _baseNoteLength) * _staffScale * _noteWidth;
    }
    
    // Let's place the note on the staff
    this.draw();
  }

  this.draw = function() {
    var top = getStyle(".note."+this.key, "top", true);
    var charCode;

    if(this.key == "up") charCode = "0xf062";
    if(this.key == "right") charCode = "0xf061";
    if(this.key == "left") charCode = "0xf060";
    if(this.key == "down") charCode = "0xf063";
    if(this.key == "space") charCode = "0xf12a";

    ctx.font = "24px FontAwesome";

    if(this.isTiedNote) {
      var noteStaffDistance = this.tnStaffPosition - this.staffPosition;
      var bridgeStaffPosition = this.staffPosition + _noteWidth/2;
      ctx.fillStyle = "#F8F4F0";
      ctx.fillRect(bridgeStaffPosition - _currentStaffPosition, top + 10, noteStaffDistance, 10);

      ctx.beginPath();
      ctx.arc((this.tnStaffPosition + 16) - _currentStaffPosition, top + 16, 16, 0, Math.PI*2);
      ctx.closePath();
      ctx.fillStyle = "#F8F4F0";
      ctx.fill();

      ctx.fillStyle = "#D55320";
      ctx.fillText(String.fromCharCode(charCode), (this.tnStaffPosition + 5) - _currentStaffPosition, top + 25);
    }

    ctx.beginPath();
    ctx.arc((this.staffPosition + 16) - _currentStaffPosition, top + 16, 16, 0, Math.PI*2);
    ctx.closePath();
    ctx.fillStyle = "#F8F4F0";
    ctx.fill();

    ctx.fillStyle = "#D55320";
    ctx.fillText(String.fromCharCode(charCode), (this.staffPosition + 5) - _currentStaffPosition, top + 25);
  }
}

function draw() {
  ctx.clearRect(0, 0, $(canvas).width(), $(canvas).height());

  for(var i = 0; i < $song.score.length; i++) {
    $song.notes[i].draw();
  }
}

function getStyle(selector, property, valueOnly) {
  var styleSheets = document.styleSheets;
  var classes = new Array();

  for(var i = 0; i < styleSheets.length; i++) {
    if(styleSheets[i].ownerNode.attributes.href.value.indexOf("http") == -1 && styleSheets[i].ownerNode.attributes.href.value.indexOf("//") == -1) {
      var rules = styleSheets[i].rules || styleSheets[i].cssRules;
      if(rules) classes.push(rules);
    }
  }

  for(var i = 0; i < classes.length; i++) {
    for(var j = 0; j < classes[i].length; j++) {
        if(classes[i][j].selectorText.indexOf(selector) != -1) {
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