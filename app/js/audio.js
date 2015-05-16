var audioVisualizer = document.getElementById("audioVisualizer");
var audioVisualizerCtx = audioVisualizer.getContext("2d");

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
	this.BGM = BGM.getInstance();
	this.SFX = SFX.getInstance();

	this.init = function() {
		this.BGM.init();
		this.SFX.init();

		//this.audioFiles = BGM.filesNb() + SFX.filesNb();
	};

	this.loadedPercentage = function() {
		return Math.ceil(this.loadedFiles * 100 / this.audioFiles);
	};

	this.mute = function() {
		this.BGM.mute();
		this.SFX.mute();

		//$("#soundSwitch").attr("class","off");
		this.muted = true;
	};

	this.unMute = function() {
		this.BGM.unMute();
		this.SFX.unMute();

		//$("#soundSwitch").attr("class","on");
		this.muted = false;
	};

	this.toggleMute = function() {
		this.BGM.toggleMute();
		this.SFX.toggleMute();

		//$("#soundSwitch").toggleClass("on off");
		this.muted = !this.muted;
	};

	this.init();
};

AudioEngine.instance = null;

AudioEngine.getInstance = function() {  
  if (this.instance == null) {  
      this.instance = new AudioEngine();  
  }  
  
  return this.instance;  
}


//===============================
// BGM
function BGM() {
//===============================
	this.audioCtx;
	this.analyserNode;
	
	this.sourceArray = {};
	this.fileURL;
	this.currentFile;
	this.fileLoaded = false;
	
	this.muted = false;
	this.paused = false;
	this.hasEnded = false;

	this.crossfadeArray = [];
	this.crossfading = false;

	this.startedAt = 0;
	this.pausedAt = 0;
	this.songLength = 0;

	this.currentPosition = function() {
		var position = this.paused ? this.pausedAt / 1000 : ((new Date().getTime() - this.startedAt) + this.pausedAt) / 1000;
		if(position > this.songLength) position = this.songLength;

		return position;
	};

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
		$audioEngine.ready = false;
		this.fileLoaded = false;
		this.fileURL = url;

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

		bgm.fileLoaded = true;
		if($audioEngine.SFX.filesLoaded) $audioEngine.ready = true;

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

	    if(buffer.name == "junction_loop") source.loop = true;
	    if(buffer.name == "waltz") gainNode.gain.value = .8;

	    return {
	      source: source,
	      gainNode: gainNode,
	      buffer: (function() { return buffer; })(),
	      name: (function() { return buffer.name; })(),
	      index: (function() { return index; })()
	    };
	}

	this.play = function() {
		this.sourceArray[this.currentFile].source.start(0);
		this.startedAt = new Date().getTime();
	}

	this.setFile = function(file) {
		this.currentFile = file;

		this.muted = false;
		this.paused = false;
		this.hasEnded = false;

		this.crossfadeArray = [];
		this.crossfading = false;

		this.startedAt = 0;
		this.pausedAt = 0;
		this.songLength = 0;
	}

	this.setCrossfade = function(gain, callback) {
		this.crossfading = true;

		if(gain != -1) {
			TweenMax.to(this.sourceArray[this.currentFile].gainNode.gain, 3, {value: gain, ease: Circ.easeOut,
				onComplete:function() {
					this.crossfading = false;
					if(callback && typeof callback == "function") callback();
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

	this.triggerMute = function(state) {
		if(state == true || state == false) {
			if(state == this.muted) return;
			this.muted = state;
		}
		else if(state == "toggle") this.muted = !this.muted;

		if(this.muted) {
			if(!this.crossfading) {
				this.crossfadeArray = [];
				this.prepareCrossfade(this.sourceArray[currentFile].gainNode.gain.value);
			}

			this.setCrossfade(0);
		}
		else {
			this.playCrossfade();
			if(!this.crossfading) this.crossfadeArray = [];
		}
	}

	this.mute = function() { $audioEngine.BGM.triggerMute(true) }
	this.unMute = function() { $audioEngine.BGM.triggerMute(false) };
	this.toggleMute = function() { $audioEngine.BGM.triggerMute("toggle") };

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

	this.pause = function() { $audioEngine.BGM.triggerPause(true) }
	this.resume = function() { $audioEngine.BGM.triggerPause(false) };
	this.togglePause = function() { $audioEngine.BGM.triggerPause("toggle") };

	this.drawAudioVisualizer = function() {
		requestAnimationFrame($audioEngine.BGM.drawAudioVisualizer);

	    audioVisualizerCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
	    var dataArray = new Uint8Array($audioEngine.BGM.analyserNode.frequencyBinCount);
	    $audioEngine.BGM.analyserNode.getByteFrequencyData(dataArray);

	    // p = array for AnalyserNode-s
	    // p.bgm = AnalyserNode used for the bgm

	    /*switch (p.bgm.getByteFrequencyData(e), d) {
	        case 0: // oscilloscope
	            t(e);
	            break;
	        case 1: // dots
	            a(e);
	            break;
	        case 2: // diagonal lines
	            n(e);
	            break;
	        case 3: // horizontal lines
	        	o(e)*/
	            $audioEngine.BGM.waveform(dataArray);
	            $audioEngine.BGM.oscilloscope(dataArray);
	    //}
	}

	this.oscilloscope = function(dataArray) {
	    var nbEQband = 75;
	    var bandWidth = Math.ceil($(window).width() / nbEQband);
	    
	    var zoom = 1;
	    var maxHeight = 255 * zoom;
	    var top = $(window).height() + 1;

	    audioVisualizerCtx.save();
	    audioVisualizerCtx.beginPath();

		audioVisualizerCtx.fillStyle = "#161515";
		audioVisualizerCtx.strokeStyle = "#161515";
	    audioVisualizerCtx.lineTo(0, top);

	    for (var i = 0; i <= nbEQband; i++)
	    	audioVisualizerCtx.lineTo(i * bandWidth, top - dataArray[i] * zoom);

	    //audioVisualizerCtx.lineTo($(window).width(), top - dataArray[nbEQband] * zoom);
	    audioVisualizerCtx.lineTo($(window).width(), top);
	    audioVisualizerCtx.fill();
	    audioVisualizerCtx.stroke();

	    audioVisualizerCtx.closePath();
	    audioVisualizerCtx.restore();
	}

	this.waveform = function(dataArray) {
	    var nbEQband = 75;
	    var bandWidth = Math.ceil($(window).width() / nbEQband);

	    var zoom = 1;
	    var maxHeight = 255 * zoom;
	    var top = ($(window).height() + 1) - maxHeight / 4;

	    audioVisualizerCtx.save();
		audioVisualizerCtx.fillStyle = "#D55320";

	    for (var i = 0; i <= nbEQband; i++)
	    	audioVisualizerCtx.fillRect(i * bandWidth, top - dataArray[i], 2, 2);

	    //audioVisualizerCtx.fillRect($(window).width() - 2, top - dataArray[nbEQband], 2, 2);
	    audioVisualizerCtx.restore();
	}

	this.n = function(dataArray) {
	    var nbEQband = 75;
	    var bandWidth = Math.round($(window).width() / nbEQband);

	    audioVisualizerCtx.save();
	    audioVisualizerCtx.lineWidth = 1;

	    for (var i = 0; i <= nbEQband; t++) {
	    	audioVisualizerCtx.moveTo(i * bandWidth + dataArray[i], dataArray[i]);
	    	audioVisualizerCtx.lineTo(-dataArray[i] + 500, -i * a - dataArray[i] + 500);
	    }

	    audioVisualizerCtx.stroke();
		audioVisualizerCtx.restore();
	}

	this.o = function(dataArray) {
	    var nbEQband = 100;

	    audioVisualizerCtx.save();
	    audioVisualizerCtx.lineWidth = 1;

	    for (var i = 0; i <= nbEQband; i++) {
	    	audioVisualizerCtx.moveTo(1e3 * dataArray[i], 2 * dataArray[i]);
	    	audioVisualizerCtx.lineTo(1e3 * -dataArray[i], -1 * dataArray[i]);
	    }

	    audioVisualizerCtx.stroke();
		audioVisualizerCtx.restore();
	}
};

BGM.instance = null;

BGM.getInstance = function() {  
  if (this.instance == null) {  
      this.instance = new BGM();  
  }  
  
  return this.instance;  
}


//===============================
// SFX
function SFX() {
//===============================
	this.audioCtx;
	this.bufferArray = [];

	this.files = ['audio/sfx/button.mp3'];
	this.filesLoaded = false;
	this.muted = false;

	this.init = function() {
		this.filesLoaded = false;

	    // Fix up for prefixing
	    window.AudioContext = window.AudioContext||window.webkitAudioContext;
	    this.audioCtx = new AudioContext();

	    var bufferLoader = new BufferLoader(this.audioCtx, this.files, this.setBuffer);
	  	bufferLoader.load();
	}

	this.setBuffer = function(bufferList) {
		var sfx = $audioEngine.SFX || this;

		for(var i = 0; i < bufferList.length; i++) {
			sfx.bufferArray[i] = bufferList[i];
		}

		sfx.filesLoaded = true;
		if($audioEngine.BGM.fileLoaded) $audioEngine.ready = true;
	}

	this.createSource = function(buffer) {
		var source = this.audioCtx.createBufferSource();
		var gainNode = this.audioCtx.createGain ? this.audioCtx.createGain() : this.audioCtx.createGainNode();

	    source.buffer = buffer;
		source.connect(gainNode);
	    gainNode.connect(this.audioCtx.destination);

	    gainNode.gain.value = .3;
	    source.start(0);
	}

	this.play = function(sfxName) {
		var sfx;

		if(sfxName == "input") sfx = this.bufferArray[0];

		if(!this.muted) this.createSource(sfx);
	}

	this.mute = function(state) {
		if(state == true || state == false) {
			if(state == this.muted) return;
			this.muted = state;
		}
		else if(state == "toggle") this.muted = !this.muted;
	}

	this.mute = function() { $audioEngine.SFX.triggerMute(true) }
	this.unMute = function() { $audioEngine.SFX.triggerMute(false) };
	this.toggleMute = function() { $audioEngine.SFX.triggerMute("toggle") };
};

SFX.instance = null;

SFX.getInstance = function() {  
  if (this.instance == null) {  
      this.instance = new SFX();  
  }  
  
  return this.instance;  
}

$(document).ready(function() {
	/*$("#soundSwitch").on(eventtype, function() {
		$audioEngine.toggleMute();
	});*/
});