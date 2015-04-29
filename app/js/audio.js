//===============================
// BUFFERLOADER CLASS
function BufferLoader(context, urlList, callback) {
//===============================
  this.context = context;
  this.urlList = urlList;
  this.onload = callback;
  this.bufferList = [];
  this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function(url, index) {
  if(!url.match(".mp3|.ogg")) url += Modernizr.audio.ogg ? '.ogg' : '.mp3';

  // Load buffer asynchronously
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  var loader = this;

  request.onload = function() {
    // Asynchronously decode the audio file data in request.response
    loader.context.decodeAudioData(
      request.response,
      function(buffer) {
        if (!buffer) {
          alert('error decoding file data: ' + url);
          return;
        }

        buffer.name = url.slice(url.lastIndexOf("/")+1, url.lastIndexOf("."));
        loader.bufferList[index] = buffer;
        if (++loader.loadCount == loader.urlList.length) 
          loader.onload(loader.bufferList);

      	$(document).trigger("soundLoaded");
      },
      function(error) { console.error('decodeAudioData error', error); }
    );
  }

  request.onerror = function() { alert('BufferLoader: XHR error'); }

  request.send();
}

BufferLoader.prototype.load = function() {
  for (var i = 0; i < this.urlList.length; ++i)
  this.loadBuffer(this.urlList[i], i);
}


//===============================
// AUDIOENGINE CLASS
function AudioEngine(bgmFile) {
//===============================
	this.loadedFiles = 0;
	this.audioFiles = 0;
	this.muted = false;
	this.ready = false;

	this.init = function() {
		BGM.init(bgmFile);
		SFX.init();

		this.audioFiles = BGM.filesNb() + SFX.filesNb();
	};

	this.loadedPercentage = function() {
		return Math.ceil(this.loadedFiles * 100 / this.audioFiles);
	};

	this.mute = function() {
		BGM.mute();
		SFX.mute();

		//$("#soundSwitch").attr("class","off");
		this.muted = true;
	};

	this.unMute = function() {
		BGM.unMute();
		SFX.unMute();

		//$("#soundSwitch").attr("class","on");
		this.muted = false;
	};

	this.toggleMute = function() {
		BGM.toggleMute();
		SFX.toggleMute();

		//$("#soundSwitch").toggleClass("on off");
		this.muted = !this.muted;
	};

	this.isMuted = function() { return this.muted; };

	this.init();
};


//===============================
// BGM
var BGM = (function() {
//===============================
	var audioCtx;
	var sourceArray = [];
	var crossfadeArray = [];

	var files = [];
	var filesLoaded = false;
	var muted = false;
	var paused = false;
	var crossfading = false;

	var startedAt;
	var pausedAt = 0;
	var currentPosition = function() { 
		var position = paused ? pausedAt / 1000 : ((new Date().getTime() - startedAt) + pausedAt) / 1000;
		if(position > songLength) position = songLength;

		return position;
	};
	var songLength;
	var hasEnded = false;


	function init(url) {
	  try {
	    // Fix up for prefixing
	    window.AudioContext = window.AudioContext||window.webkitAudioContext;
	    audioCtx = new AudioContext();

	    files.push(url);

	    var bufferLoader = new BufferLoader(audioCtx, files, setSources);
	  	bufferLoader.load();
	  }
	  catch(e) {
	    alert('Web Audio API is not supported in this browser');
	  }
	}

	function setSources(bufferList) {
		for(var i = 0; i < bufferList.length; i++) {
			var source = createSource(bufferList[i], i);
			sourceArray[source.name] = source;
		}

		filesLoaded = true;
		if(SFX.filesLoaded()) {
			audioEngine.ready = true;
			$(document).trigger("allSoundsLoaded");
		}
	}

	function createSource(buffer, index) {
		var index = index;
		var source = audioCtx.createBufferSource();
		var buffer = buffer;
		var gainNode = audioCtx.createGain ? audioCtx.createGain() : audioCtx.createGainNode();
	    source.buffer = buffer;

	    songLength = source.buffer.duration;

		source.connect(gainNode);
	    gainNode.connect(audioCtx.destination);

	    if(source.name == "waltz") source.gainNode.gain.value = .8;

	    return {
	      source: source,
	      gainNode: gainNode,
	      buffer: (function() { return buffer; })(),
	      name: (function() { return buffer.name; })(),
	      index: (function() { return index; })()
	    };
	}

	function play() {
		sourceArray["waltz"].source.start(0);
		startedAt = new Date().getTime();
	}

	function setCrossfade(gain) {
		crossfading = true;

		if(gain != -1) {
			TweenMax.to(sourceArray["waltz"].gainNode.gain, 3, {value: gain, ease: Circ.easeOut,
				onComplete:function() {
					crossfading = false;
				}
			});
		}
	}

	function prepareCrossfade(gain) { crossfadeArray.unshift(gain); }

	function playCrossfade() {
		if(!muted && crossfadeArray.length > 0) {
			setCrossfade(crossfadeArray[0]);
			if(!crossfading) crossfadeArray.shift();
		}
	}

	function mute(state) {
		if(state == true || state == false) {
			if(state == muted) return;
			muted = state;
		}
		else if(state == "toggle") muted = !muted;

		if(muted) {
			if(!crossfading) {
				crossfadeArray = [];
				prepareCrossfade(sourceArray["waltz"].gainNode.gain.value);
			}

			setCrossfade(0, 0);
		}
		else {
			playCrossfade();
			if(!crossfading) crossfadeArray = [];
		}
	}

	function pause(state) {
		if(hasEnded) return;
		if(state == true || state == false) {
			if(state == paused) return;
			paused = state;
		}
		else if(state == "toggle") paused = !paused;

		if(paused) {
			sourceArray["waltz"].source.stop();
			pausedAt += new Date().getTime() - startedAt;
		}
		else {
			var source = createSource(sourceArray["waltz"].buffer, sourceArray["waltz"].index);
			sourceArray["waltz"] = source;

			sourceArray["waltz"].source.start(0, pausedAt / 1000);
			startedAt = new Date().getTime();
		}
	}

	return {
		init:init,
		play:play,
		setCrossfade:setCrossfade,
		prepareCrossfade:prepareCrossfade,
		playCrossfade:playCrossfade,
		mute:function() { mute(true); },
		unMute:function() { mute(false); },
		toggleMute:function() { mute("toggle"); },
		isMuted:function() { return muted; },
		filesLoaded:function() { return filesLoaded; },
		filesNb:function() { return files.length; },
		isCrossfading:function() { return crossfading; },
		getCurrentPosition:function() { return currentPosition(); },
		getSongLength:function() { return songLength; },
		pause:function() { pause(true); },
		unPause:function() { pause(false); },
		togglePause:function() { pause("toggle"); },
		isPaused:function() { return paused; },
		hasEnded:function() { hasEnded = true; }
	};
})();


//===============================
// SFX
var SFX = (function() {
//===============================
	var audioCtx;
	var bufferArray = [];

	var files = ['audio/sfx/button.mp3'];
	var filesLoaded = false;
	var muted = false;

	function init() {
	    // Fix up for prefixing
	    window.AudioContext = window.AudioContext||window.webkitAudioContext;
	    audioCtx = new AudioContext();

	    var bufferLoader = new BufferLoader(audioCtx, files, setBuffer);
	  	bufferLoader.load();
	}

	function setBuffer(bufferList) {
		for(var i = 0; i < bufferList.length; i++) {
			bufferArray[i] = bufferList[i];
		}

		filesLoaded = true;
		if(BGM.filesLoaded()) {
			audioEngine.ready = true;
			$(document).trigger("allSoundsLoaded");
		}
	}

	function createSource(buffer) {
		var source = audioCtx.createBufferSource();
		var gainNode = audioCtx.createGain ? audioCtx.createGain() : audioCtx.createGainNode();

	    source.buffer = buffer;
		source.connect(gainNode);
	    gainNode.connect(audioCtx.destination);

	    gainNode.gain.value = .3;
	    source.start(0);
	}

	function play(sfxName) {
		var sfx;

		if(sfxName == "confirm") sfx = bufferArray[0];

		if(!muted) createSource(sfx);
	}

	function mute(state) {
		if(state == true || state == false) {
			if(state == mute) return;
			muted = state;
		}
		else if(state == "toggle") muted = !muted;
	}

	return {
		init:init,
		play:play,
		mute:function() { mute(true); },
		unMute:function() { mute(false); },
		toggleMute:function() { mute("toggle"); },
		isMuted:function() { return muted; },
		filesLoaded:function() { return filesLoaded; },
		filesNb:function() { return files.length; }
	};
})();

$(document).ready(function() {
	/*$("#soundSwitch").on(eventtype, function() {
		audioEngine.toggleMute();
	});*/
});