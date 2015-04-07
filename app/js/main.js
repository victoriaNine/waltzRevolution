var songLength;

var startTime = 0.337; // In seconds
var tempo = 93;
var timeSignature = [6, 8];
var noteScale = 16;
var baseNoteLength = (60 / tempo) * (4 / timeSignature[1]);
var barLength = baseNoteLength * timeSignature[0];

var staffScale = noteScale / timeSignature[1];
var noteWidth = 32; // Width of a note in the staff, in pixels

$(document).ready(function() {
  $(window).keydown(function(e) {
    e.preventDefault();

    if(e.which == 38) $("#keyUp").addClass("pressed");
    if(e.which == 39) $("#keyRight").addClass("pressed");
    if(e.which == 37) $("#keyLeft").addClass("pressed");
    if(e.which == 40) $("#keyDown").addClass("pressed");
    if(e.which == 32) $("#keySpace").addClass("pressed");
  });

  $(window).keyup(function(e) {
    e.preventDefault();

    if(e.which == 38) $("#keyUp").removeClass("pressed");
    if(e.which == 39) $("#keyRight").removeClass("pressed");
    if(e.which == 37) $("#keyLeft").removeClass("pressed");
    if(e.which == 40) $("#keyDown").removeClass("pressed");
    if(e.which == 32) $("#keySpace").removeClass("pressed");
  });
  
  var test = new Note("up", 2, 3, 1, 8, true, 2, 1, 8);
});

function Note(key, bar, beat, beatPosition, beatDivision, isHeldNote, hnBeat, hnBeatPosition, hnBeatDivision) {
  this.key = key;
  this.bar = bar;
  this.beat = beat;
  this.beatPosition = beatPosition;
  this.beatDivision = beatDivision;
  
  this.isHeldNote = isHeldNote || false;
  this.hnBeat = hnBeat;
  this.hnBeatPosition = hnBeatPosition;
  this.hnBeatDivision = hnBeatDivision;
  
  this.songPosition = startTime;
  // At what time is the bar
  this.songPosition  = barLength * (bar-1);
  // At what time is the beat in said bar
  this.songPosition += baseNoteLength * (beat-1);
  // At what time is the note in said beat
  this.songPosition += baseNoteLength * (timeSignature[1] / beatDivision) * (beatPosition-1);
  
  // Let's place the note on the staff
  this.staffPosition = (this.songPosition / baseNoteLength) * staffScale * noteWidth;
	this.note = $("<div>").attr("class", "note "+this.key).css("left", this.staffPosition+"px");
  
  if(key == "up") this.note.append("<i class=\"fa fa-arrow-up\"></i>");
  if(key == "right") this.note.append("<i class=\"fa fa-arrow-right\"></i>");
  if(key == "left") this.note.append("<i class=\"fa fa-arrow-left\"></i>");
  if(key == "down") this.note.append("<i class=\"fa fa-arrow-down\"></i>");
  if(key == "space") this.note.append("<i class=\"fa fa-arrow-exclamation\"></i>");
  $("#notes").append(this.note);
  
  if(isHeldNote) {
    this.hnSongPosition  = this.songPosition;
    this.hnSongPosition += baseNoteLength * (hnBeat-1);
    this.hnSongPosition += baseNoteLength * (timeSignature[1] / hnBeatDivision) * (hnBeatPosition-1);

    // Let's place the note on the staff
    this.hnStaffPosition = (this.hnSongPosition / baseNoteLength) * staffScale * noteWidth;
    this.heldNote = $("<div>").attr("class", "heldNote").css("left", this.hnStaffPosition+"px");
    
    var noteStaffDistance = this.hnStaffPosition - this.staffPosition;
    var bridge = $("<div>").attr("class", "noteBridge").css({
      width:noteStaffDistance+"px",
      left:-1*(noteStaffDistance - noteWidth/2)+"px"
    });
    var icon = $("<div>").attr("class", "note "+this.key).html(this.note.html());
    
    this.heldNote.append(bridge, icon);
    $("#notes").append(this.heldNote);
  }
}