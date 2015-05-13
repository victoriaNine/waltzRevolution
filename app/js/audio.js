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
  if(!url.match(".mp3|.ogg|.wav")) url += Modernizr.audio.ogg ? '.ogg' : '.mp3';

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
function AudioEngine() {
//===============================
	//this.loadedFiles = 0;
	//this.audioFiles = 0;
	this.muted = false;
	this.ready = false;
	this.BGM = new BGM();

	this.init = function() {
		this.BGM.init();
		SFX.init();

		//this.audioFiles = BGM.filesNb() + SFX.filesNb();
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
function BGM() {
//===============================
	this.audioCtx;
	this.analyserNode;
	this.sourceArray = {};
	this.crossfadeArray = [];

	this.files;
	this.filesLoaded = false;
	this.currentFile;
	this.muted = false;
	this.paused = false;
	this.crossfading = false;

	this.startedAt;
	this.pausedAt = 0;
	this.currentPosition = function() {
		var position = this.paused ? this.pausedAt / 1000 : ((new Date().getTime() - this.startedAt) + this.pausedAt) / 1000;
		if(position > this.songLength) position = this.songLength;

		return position;
	};
	this.songLength;
	this.hasEnded = false;

	this.callback;


	this.init = function() {
	  try {
	    // Fix up for prefixing
	    window.AudioContext = window.AudioContext||window.webkitAudioContext;
	    this.audioCtx = new AudioContext();
	    this.analyserNode = this.audioCtx.createAnalyser();
	  }
	  catch(e) {
	    alert('Web Audio API is not supported in this browser');
	  }
	}

	this.addSource = function(url, callback) {
		this.filesLoaded = false;
		this.file = url;

		if(callback && typeof callback === "function") this.callback = callback;

	    var bufferLoader = new BufferLoader(this.audioCtx, [url], this.setSources);
	  	bufferLoader.load();
	}

	this.setSources = function(bufferList) {
		var bgm = $audioEngine.BGM;
		for(var i = 0; i < bufferList.length; i++) {
			var source = bgm.createSource(bufferList[i], i);
			bgm.sourceArray[source.name] = source;
		}

		bgm.filesLoaded = true;
		if(bgm.callback && typeof bgm.callback === "function") bgm.callback();
	}

	this.createSource = function(buffer, index) {
		var index = index;
		var source = this.audioCtx.createBufferSource();
		var buffer = buffer;
		var gainNode = this.audioCtx.createGain ? this.audioCtx.createGain() : this.audioCtx.createGainNode();
	    source.buffer = buffer;

	    this.songLength = source.buffer.duration;

		source.connect(gainNode);
	    gainNode.connect(this.audioCtx.destination);
	    gainNode.connect(this.analyserNode);

	    if(source.name == "waltz") source.gainNode.gain.value = .8;

	    return {
	      source: source,
	      gainNode: gainNode,
	      buffer: (function() { return buffer; })(),
	      name: (function() { return buffer.name; })(),
	      index: (function() { return index; })()
	    };
	}

	this.play = function(file) {
		this.currentFile = file;
		this.sourceArray[file].source.start(0);
		this.startedAt = new Date().getTime();
	}

	this.setCrossfade = function(gain) {
		this.crossfading = true;

		if(gain != -1) {
			TweenMax.to(this.sourceArray[this.currentFile].gainNode.gain, 3, {value: gain, ease: Circ.easeOut,
				onComplete:function() {
					this.crossfading = false;
				}
			});
		}
	}

	this.prepareCrossfade = function(gain) { this.crossfadeArray.unshift(gain); }

	this.playCrossfade = function() {
		if(!this.muted && this.crossfadeArray.length > 0) {
			this.setCrossfade(this.crossfadeArray[0]);
			if(!this.crossfading) this.crossfadeArray.shift();
		}
	}

	/*function mute(state) {
		if(state == true || state == false) {
			if(state == muted) return;
			muted = state;
		}
		else if(state == "toggle") muted = !muted;

		if(muted) {
			if(!crossfading) {
				crossfadeArray = [];
				prepareCrossfade(sourceArray[currentFile].gainNode.gain.value);
			}

			setCrossfade(0);
		}
		else {
			playCrossfade();
			if(!crossfading) crossfadeArray = [];
		}
	}*/

	this.triggerPause = function(state) {
		if(this.hasEnded) return;
		if(state == true || state == false) {
			if(state == this.paused) return;
			this.paused = state;
		}
		else if(state == "toggle") this.paused = !this.paused;

		if(this.paused) {
			this.sourceArray[this.currentFile].source.stop();
			this.pausedAt += new Date().getTime() - this.startedAt;
		}
		else {
			var source = this.createSource(this.sourceArray[this.currentFile].buffer, this.sourceArray[this.currentFile].index);
			this.sourceArray[this.currentFile] = source;

			this.sourceArray[this.currentFile].source.start(0, this.pausedAt / 1000);
			this.startedAt = new Date().getTime();
		}
	}

	this.pause = function() { this.triggerPause(true) }
	this.unPause = function() { this.triggerPause(false) };
	this.togglePause = function() { this.triggerPause("toggle") };

	/*return {
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
	};*/
};


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
		if($audioEngine.BGM.filesLoaded) {
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