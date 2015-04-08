//===============================
// BUFFERLOADER CLASS
//
function BufferLoader(context, urlList, callback) {
//===============================
  this.context = context;
  this.urlList = urlList;
  this.onload = callback;
  this.bufferList = new Array();
  this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function(url, index) {
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
        loader.bufferList[index] = buffer;
        if (++loader.loadCount == loader.urlList.length) 
          loader.onload(loader.bufferList);

      	$(document).trigger("soundLoaded");
      },
      function(error) {
        console.error('decodeAudioData error', error);
      }
    );
  }

  request.onerror = function() {
    alert('BufferLoader: XHR error');
  }

  request.send();
}

BufferLoader.prototype.load = function() {
  for (var i = 0; i < this.urlList.length; ++i)
  this.loadBuffer(this.urlList[i], i);
}


//===============================
// AUDIOENGINE CLASS
//
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

	this.unmute = function() {
		BGM.unmute();
		SFX.unmute();

		//$("#soundSwitch").attr("class","on");
		this.muted = false;
	};

	this.toggleMute = function() {
		BGM.toggleMute();
		SFX.toggleMute();

		//$("#soundSwitch").toggleClass("on off");
		this.muted = !this.muted;
	};

	this.isMuted = function() {
		return this.muted;
	};

	this.init();
};


//===============================
// BGM
//
var BGM = (function() {
//===============================
	var audioCtx;
	var currentPosition;
	var songLength;
	var sourceArray = new Array();
	var crossfadeArray = new Array();

	var files = new Array();
	var filesLoaded = false;
	var muted = false;
	var crossfading = false;

	var waltz;

	function init(url) {
	  try {
	    // Fix up for prefixing
	    window.AudioContext = window.AudioContext||window.webkitAudioContext;
	    audioCtx = new AudioContext();
	    currentPosition = function() {
	    	return audioCtx.currentTime;
	    };

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
			sourceArray[i] = createSource(bufferList[i]);
		}

		waltz = sourceArray[0];
		waltz.gainNode.gain.value = .8;

		filesLoaded = true;
		if(SFX.filesLoaded()) {
			audioEngine.ready = true;
			$(document).trigger("allSoundsLoaded");
		}
	}

	function createSource(buffer) {
		var source = audioCtx.createBufferSource();
		var gainNode = audioCtx.createGain ? audioCtx.createGain() : audioCtx.createGainNode();
	    source.buffer = buffer;

	    songLength = source.buffer.duration;

		source.connect(gainNode);
	    gainNode.connect(audioCtx.destination);

	    return {
	      source: source,
	      gainNode: gainNode
	    };
	}

	function play() {
		waltz.source.start(0);
	}

	function setCrossfade(gain) {
		crossfading = true;

		if(gain != -1) {
			TweenMax.to(waltz.gainNode.gain, 3, {value: gain, ease: Circ.easeOut,
				onComplete:function() {
					crossfading = false;
				}
			});
		}
	}

	function prepareCrossfade(gain) {
		crossfadeArray.unshift(gain);
	}

	function playCrossfade() {
		if(!muted && crossfadeArray.length > 0) {
			setCrossfade(crossfadeArray[0]);
			if(!crossfading) crossfadeArray.shift();
		}
	}

	function mute(state) {
		if(state == true || state == false) {
			if(state == mute) return;
			muted = state;
		}
		else if(state == "toggle") muted = !muted;

		if(muted == true) {
			if(!crossfading) {
				crossfadeArray = [];
				prepareCrossfade(waltz.gainNode.gain.value);
			}

			setCrossfade(0, 0);
		}
		else {
			playCrossfade();
			if(!crossfading) {
				crossfadeArray = [];
			}
		}
	}

	return {
		init:init,
		play:play,
		setCrossfade:setCrossfade,
		prepareCrossfade:prepareCrossfade,
		playCrossfade:playCrossfade,
		mute:function() {
			mute(true);
		},
		unmute:function() {
			mute(false);
		},
		toggleMute:function() {
			mute("toggle");
		},
		isMuted:function() {
			return muted;
		},
		filesLoaded:function() {
			return filesLoaded;
		},
		filesNb:function() {
			return files.length;
		},
		isCrossfading:function() {
			return crossfading;
		},
		getCurrentPosition:currentPosition,
		getsongLength:function() {
			return songLength;
		}
	};
})();


//===============================
// SFX
//
var SFX = (function() {
//===============================
	var audioCtx;
	var bufferArray = new Array();

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
		mute:function() {
			mute(true);
		},
		unmute:function() {
			mute(false);
		},
		toggleMute:function() {
			mute("toggle");
		},
		isMuted:function() {
			return muted;
		},
		filesLoaded:function() {
			return filesLoaded;
		},
		filesNb:function() {
			return files.length;
		}
	};
})();

$(document).ready(function() {
	/*$("#soundSwitch").on(eventtype, function() {
		audioEngine.toggleMute();
	});*/
});