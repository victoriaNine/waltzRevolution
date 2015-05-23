var audioVisualizer = document.getElementById("audioVisualizer");
var audioVisualizerCtx = audioVisualizer.getContext("2d");

//===============================
// BUFFERLOADER CLASS
function BufferLoader(context, urlList, type, callback) {
//===============================
  this.context = context;
  this.urlList = urlList;
  this.onload = callback;
  this.type = type;

  this.requestArray = [];
  this.bufferList = [];
  this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function(url, index) {
  if(!url.match(".ogg|.mp3|.wav")) url += Modernizr.audio.ogg ? '.ogg' :
  										  Modernizr.audio.mp3 ? '.mp3' : '.wav';

  // Load buffer asynchronously
  var request = new XMLHttpRequest();
  request.open("GET", url+"?"+new Date().getTime(), true);
  request.responseType = "arraybuffer";

  var loader = this;

  request.onload = function() {
  	loader.loadCount++;
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
        if (loader.loadCount == loader.urlList.length) 
          loader.onload(loader.bufferList);
      },
      function(error) { 
      	console.log(request);
      	if(url.match(".wav")) {
      		console.error('decodeAudioData error', error);
      		return;
      	}

      	var newURL = url;
      	if(url.match(".ogg")) newURL = url.replace(".ogg", ".mp3");
      	else if(url.match(".mp3")) newURL = url.replace(".mp3", ".wav");

      	loader.loadBuffer(newURL, index);
      }
    );
  }

  request.onprogress = function(e) {
  	loader.requestArray[index] = e;

  	var loaded = 0;
  	var total = 0;
  	var notReady = false;

  	for(var i = 0; i < loader.requestArray.length; i++) {
  		if(!loader.requestArray[i] || loader.requestArray[i].total == 0) {
  			notReady = true;
  			break;
  		}

  		loaded += loader.requestArray[i].loaded;
  		total += loader.requestArray[i].total;
  	}

  	if(notReady) return;

  	if(loader.type == "bgm") {
	  	$audioEngine.loadBGM = loaded;
	  	$audioEngine.loadBGMTotal = total;
	}
	if(loader.type == "sfx") {
	  	$audioEngine.loadSFX = loaded;
	  	$audioEngine.loadSFXTotal = total;
	}

  	$(document).trigger("loading"+loader.type.toUpperCase());
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
	this.muted = false;
	this.ready = false;
	this.BGM = BGM.getInstance();
	this.SFX = SFX.getInstance();

	this.loadBGM = 0;
	this.loadBGMTotal = 0;
	this.loadSFX = 0;
	this.loadSFXTotal = 0;

	this.init = function() {
		this.BGM.init();
		this.SFX.init();
	};

	this.loadedPercentage = function() {
		return Math.ceil(this.loadedFiles * 100 / this.audioFiles);
	};

	this.mute = function() {
		this.BGM.mute();
		this.SFX.mute();

		this.muted = true;
	};

	this.unMute = function() {
		this.BGM.unMute();
		this.SFX.unMute();

		this.muted = false;
	};

	this.toggleMute = function() {
		this.BGM.toggleMute();
		this.SFX.toggleMute();

		this.muted = !this.muted;
	};

	this.init();
};


//===============================
// SINGLETON
AudioEngine.getInstance = function() {
//===============================
  if(this.instance == null)
  	this.instance = new AudioEngine();
  return this.instance;  
}

AudioEngine.instance = null;


//===============================
// BGM CLASS
function BGM() {
//===============================
	this.audioCtx;
	this.analyserNode;
	this.rAF = 0;
	
	this.fileURL;
	this.currentFile;
	this.fileLoaded = false;
	this.loadingArray = [];
	this.sourceArray = {};
	
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
	  }
	  catch(e) {
	    alert('Web Audio API is not supported in this browser');
	  }
	}

	this.addSource = function(url, callback) {
		this.fileURL = url;
		if(callback && typeof callback === "function") this.callback = callback;

		// If the BGM buffer has already been loaded before, reuse its source
		if(this.hasBeenLoaded(url)) {
			this.duplicateCurrentSource();

			if(this.callback) this.callback();
			return;
		}

		$audioEngine.ready = false;
		this.fileLoaded = false;

		this.loadingArray.push(url);
	    var bufferLoader = new BufferLoader(this.audioCtx, [url], "bgm", this.setSources);
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
		var buffer = buffer;

		var source = this.audioCtx.createBufferSource();
		var gainNode = this.audioCtx.createGain ? this.audioCtx.createGain() : this.audioCtx.createGainNode();
		var analyserNode = this.audioCtx.createAnalyser();

	    source.buffer = buffer;
	    this.songLength = source.buffer.duration;

		source.connect(gainNode);
	    gainNode.connect(analyserNode);
	    gainNode.gain.value = this.muted ? 0 : .75;

	    analyserNode.connect(this.audioCtx.destination);
	    this.analyserNode = analyserNode;

	    if(buffer.name == "junction") {
	    	//source.loop = true;
	    	var bgm = this;
	    	source.onended = function() {
	    		if(!bgm.paused) {
		    		bgm.duplicateCurrentSource();
					bgm.play();
				}
	    	}
	    }

	    return {
	      source: source,
	      gainNode: gainNode,
	      analyserNode: analyserNode,
	      buffer: (function() { return buffer; })(),
	      name: (function() { return buffer.name; })(),
	      index: (function() { return index; })()
	    };
	}

	this.duplicateCurrentSource = function() {
		var source = this.createSource(this.sourceArray[this.currentFile].buffer, this.sourceArray[this.currentFile].index);
		this.sourceArray[this.currentFile] = source;
	}

	this.hasBeenLoaded = function(url) {
		return this.loadingArray.indexOf(url) != -1
	}

	this.setFile = function(file) {
		$audioEngine.BGM.stopRAF();

		this.currentFile = file;

		this.paused = false;
		this.hasEnded = false;

		this.startedAt = 0;
		this.pausedAt = 0;
		this.songLength = 0;
	}

	this.play = function() {
		this.sourceArray[this.currentFile].source.start(0);
		this.startedAt = new Date().getTime();
		this.pausedAt = 0;
	}

	this.stop = function(memorizePosition) {
		this.sourceArray[this.currentFile].source.stop();
		if(memorizePosition) this.pausedAt += new Date().getTime() - this.startedAt;
	}

	this.setCrossfade = function(gain, callback) {
		if(gain >= 0) {
			this.crossfading = true;

			var crossfade, bgm = this;
			var jumpToEnd = function() { crossfade.seek(crossfade.totalDuration(), false); };

			checkFocus(function() {
				TweenMax.lagSmoothing(0);
				crossfade = TweenMax.to(bgm.sourceArray[bgm.currentFile].gainNode.gain, 3, {value: gain, ease: Circ.easeOut,
					onStart:function() { 
						$(window).on("blur", jumpToEnd);
					},
					onComplete:function() {
						bgm.crossfading = false;
						TweenMax.lagSmoothing(1000, 16);

						$(window).off("blur", jumpToEnd);
						if(callback && typeof callback == "function") callback();
					}
				});
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
		if(state == "toggle") this.muted = !this.muted;
		else if(state == true || state == false) {
			if(state == this.muted) return;
			this.muted = state;
		}

		if(this.muted) {
			if(!this.crossfading) {
				this.crossfadeArray = [];
				this.prepareCrossfade(this.sourceArray[this.currentFile].gainNode.gain.value);
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

		if(this.paused) this.stop(true);
		else {
			this.duplicateCurrentSource();

			this.sourceArray[this.currentFile].source.start(0, this.pausedAt / 1000);
			this.startedAt = new Date().getTime();
		}
	}

	this.pause = function() { $audioEngine.BGM.triggerPause(true) }
	this.resume = function() { $audioEngine.BGM.triggerPause(false) };
	this.togglePause = function() { $audioEngine.BGM.triggerPause("toggle") };

	this.drawAudioVisualizer = function() {
		$audioEngine.BGM.rAF = requestAnimationFrame($audioEngine.BGM.drawAudioVisualizer);

	    audioVisualizerCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
	    var dataArray = new Uint8Array($audioEngine.BGM.analyserNode.frequencyBinCount);
	    $audioEngine.BGM.analyserNode.getByteFrequencyData(dataArray);

	    $audioEngine.BGM.waveform(dataArray);
	    $audioEngine.BGM.oscilloscope(dataArray);
	}

	this.stopRAF = function() { cancelAnimationFrame($audioEngine.BGM.rAF); }

	this.oscilloscope = function(dataArray) {
	    var nbEQband = 75;
	    var bandWidth = Math.ceil($(window).width() / nbEQband);
	    
	    var zoom = 1;
	    var maxHeight = toVw(255) * zoom;
	    var top = $(window).height() + 1;

	    audioVisualizerCtx.save();
	    audioVisualizerCtx.beginPath();

		audioVisualizerCtx.fillStyle = "#161515";
		audioVisualizerCtx.strokeStyle = "#161515";
	    audioVisualizerCtx.lineTo(0, top);

	    for (var i = 0; i <= nbEQband; i++)
	    	audioVisualizerCtx.lineTo(i * bandWidth, top - dataArray[i] * zoom);

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
	    var maxHeight = toVw(255) * zoom;
	    var top = ($(window).height() + 1) - maxHeight;

	    audioVisualizerCtx.save();
		audioVisualizerCtx.fillStyle = "#D55320";

	    for (var i = 0; i <= nbEQband; i++)
	    	audioVisualizerCtx.fillRect(i * bandWidth, top - dataArray[i] * zoom, 2, 2);

	    audioVisualizerCtx.restore();
	}

	this.diagonalLines = function(dataArray) {
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

	this.horizontalLines = function(dataArray) {
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


//===============================
// SINGLETON
BGM.getInstance = function() {  
//===============================
  if(this.instance == null) 
  	this.instance = new BGM(); 
  return this.instance;  
}

BGM.instance = null;


//===============================
// SFX CLASS
function SFX() {
//===============================
	this.audioCtx;
	this.bufferArray = [];

	this.files = ['audio/sfx/back',
				  'audio/sfx/confirm',
				  'audio/sfx/count',
				  'audio/sfx/hover',
				  'audio/sfx/noteInput',
				  'audio/sfx/noteInputTied',
				  'audio/sfx/pauseOpen',
				  'audio/sfx/pauseClose',
				  'audio/sfx/play',
				  'audio/sfx/stageComplete',
				  'audio/sfx/stageCompleteRecord',
				  'audio/sfx/stageFailed',
				  'audio/sfx/star'];

	this.filesLoaded = false;

	this.muted = false;

	this.init = function() {
		this.filesLoaded = false;

	    // Fix up for prefixing
	    window.AudioContext = window.AudioContext||window.webkitAudioContext;
	    this.audioCtx = new AudioContext();

	    var bufferLoader = new BufferLoader(this.audioCtx, this.files, "sfx", this.setBuffer);
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

	    gainNode.gain.value = .25;
	    source.start(0);
	}

	this.play = function(sfxName) {
		if(this.muted) return;
		var sfx;

		if(sfxName == "back") sfx = this.bufferArray[0];
		if(sfxName == "confirm") sfx = this.bufferArray[1];
		if(sfxName == "count") sfx = this.bufferArray[2];
		if(sfxName == "hover") sfx = this.bufferArray[3];
		if(sfxName == "noteInput") sfx = this.bufferArray[4];
		if(sfxName == "noteInputTied") sfx = this.bufferArray[5];
		if(sfxName == "pauseOpen") sfx = this.bufferArray[6];
		if(sfxName == "pauseClose") sfx = this.bufferArray[7];
		if(sfxName == "play") sfx = this.bufferArray[8];
		if(sfxName == "stageComplete") sfx = this.bufferArray[9];
		if(sfxName == "stageCompleteRecord") sfx = this.bufferArray[10];
		if(sfxName == "stageFailed") sfx = this.bufferArray[11];
		if(sfxName == "star") sfx = this.bufferArray[12];

		if(sfx) this.createSource(sfx);
	}

	this.triggerMute = function(state) {
		if(state == "toggle") this.muted = !this.muted;
		else if(state == true || state == false) {
			if(state == this.muted) return;
			this.muted = state;
		} 
	}

	this.mute = function() { $audioEngine.SFX.triggerMute(true) }
	this.unMute = function() { $audioEngine.SFX.triggerMute(false) };
	this.toggleMute = function() { $audioEngine.SFX.triggerMute("toggle") };
};


//===============================
// SINGLETON
SFX.getInstance = function() {  
//===============================
  if(this.instance == null)
  	this.instance = new SFX();  
  return this.instance;  
}

SFX.instance = null;