var SoliVoice = (function() {
  var ws = null, audioCtx = null, mediaStream = null, processor = null, source = null;
  var active = false, playQueue = [], isPlaying = false;
  var onStatusChange = null;
  var videoEl = null, canvasEl = null, frameInterval = null;
  var lastActivity = 0, silenceTimer = null;
  var cachedToken = null, tokenExpiry = 0;
  var userChunks = [], soliPcmChunks = [], dgTimer = null, userBusy = false, soliBusy = false;
  var SILENCE_LIMIT = 120000;
  var WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
  var MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025";
  var INPUT_RATE = 16000, OUTPUT_RATE = 24000;

  var VOICE_PROMPT = "You are SOLI, a warm, brilliant AI personal advisor. Female, Israeli, age 30-35 in spirit. " +
    "Keep voice responses SHORT, 2-3 sentences max unless asked for more. " +
    "LANGUAGE: Default to Hebrew. If user says Hebrew slang like אלאן, הלן, יאללה, סבבה, אחי, וואלה — respond in Hebrew. " +
    "These are NOT names. Only switch language if user speaks full sentences in another language. " +
    "In Hebrew speak natural modern Israeli. Use the user name ONCE at start only. Never pet names. " +
    "Fun smart friend, NOT therapist. Match user energy. " +
    "TONE: Sound like a real human. Calm, relaxed. NEVER say wow, amazing, incredible, מדהים, וואו, נפלא. " +
    "Vary your words: יופי, אחלה, נשמע טוב, הבנתי, כן, אוקיי, מגניב, ברור. Do NOT overuse סבבה. " +
    "NEVER say אני שמחה ש or אני סקרנית or איזה מרגש or מה איתך. " +
    "NEVER ask איך אתה מרגיש. Use מה נשמע or מה קורה. " +
    "STOP asking questions after every response. Max 2 follow-ups then move on. " +
    "When user says they are fine, BELIEVE THEM and move on. One concern max per topic. " +
    "DEFAULT MODE IS HAPPY AND LIGHT. Do NOT assume problems. " +
    "CAMERA RULE: You can ONLY see the user when camera is active. If camera is not on you are BLIND. " +
    "TRUTH: NEVER invent facts about the user. If you do not know something say I dont know, tell me. " +
    "NEVER guess hobbies, job, preferences. If your context says nothing about a topic, you know NOTHING. " +
    "TEACHING: When user asks to learn a language, IMMEDIATELY start structured lesson. " +
    "Assess level, build plan, each lesson has review + new words + grammar + exercises + homework. " +
    "Correct EVERY mistake. Track progress. Be a real teacher. " +
    "KNOW WHEN TO STOP: if user says fine, move on. You are a friend, not a mother. " +
    "Do not repeat facts about the user in every response. Be useful, not excited.";

  function f2i16(f){var b=new ArrayBuffer(f.length*2),v=new DataView(b);for(var i=0;i<f.length;i++){var s=Math.max(-1,Math.min(1,f[i]));v.setInt16(i*2,s<0?s*0x8000:s*0x7FFF,true)}return b}
  function ds(buf,fr,to){if(fr===to)return buf;var r=fr/to,l=Math.round(buf.length/r),o=new Float32Array(l);for(var i=0;i<l;i++)o[i]=buf[Math.min(Math.round(i*r),buf.length-1)];return o}
  function toB(buf){var b=new Uint8Array(buf),s='';for(var i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s)}
  function frB(b64){var s=atob(b64),b=new Uint8Array(s.length);for(var i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b.buffer}
  function p2f(buf){var v=new DataView(buf),o=new Float32Array(buf.byteLength/2);for(var i=0;i<o.length;i++)o[i]=v.getInt16(i*2,true)/32768;return o}

  function playChunk(b64){
    playQueue.push(b64);
    // Collect SOLI's clean audio directly (not from mic)
    var pcm=frB(b64),f32=p2f(pcm);
    soliPcmChunks.push(new Float32Array(f32));
    if(!isPlaying)drain();
  }
  function drain(){
    if(playQueue.length===0){isPlaying=false;try{document.getElementById('theOrb').classList.remove('speaking')}catch(e){}if(onStatusChange)onStatusChange('listening');return}
    isPlaying=true;try{document.getElementById('theOrb').classList.add('speaking')}catch(e){}if(onStatusChange)onStatusChange('speaking');
    var d=playQueue.shift(),pcm=frB(d),f32=p2f(pcm);
    var ctx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();
    var ab=ctx.createBuffer(1,f32.length,OUTPUT_RATE);ab.getChannelData(0).set(f32);
    var src=ctx.createBufferSource();src.buffer=ab;src.connect(ctx.destination);src.onended=drain;src.start();
    lastActivity=Date.now();
  }

  function captureFrame(){
    if(!active||!ws||ws.readyState!==1||!videoEl||!canvasEl)return;
    var c=canvasEl.getContext('2d');canvasEl.width=320;canvasEl.height=240;
    c.drawImage(videoEl,0,0,320,240);
    var b64=canvasEl.toDataURL('image/jpeg',0.6).split(',')[1];
    ws.send(JSON.stringify({realtimeInput:{mediaChunks:[{data:b64,mimeType:"image/jpeg"}]}}));
  }

  // Send user audio to Whisper
  function sendUserChunk(){
    if(userBusy||userChunks.length<4)return;
    userBusy=true;
    var tLen=0;for(var i=0;i<userChunks.length;i++)tLen+=userChunks[i].length;
    var combined=new Float32Array(tLen);var off=0;
    for(var i2=0;i2<userChunks.length;i2++){combined.set(userChunks[i2],off);off+=userChunks[i2].length}
    userChunks=[];
    // Energy check - skip if too quiet
    var avgE=0;for(var e=0;e<combined.length;e++)avgE+=combined[e]*combined[e];
    avgE=avgE/combined.length;
    if(avgE<0.002){userBusy=false;return;}
    var b64=toB(f2i16(combined));
    var uid=typeof currentUser!=='undefined'&&currentUser?currentUser.id:null;
    console.log('Whisper user:',Math.round(tLen/16000)+'s, energy:',avgE.toFixed(4));
    fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio:b64,userId:uid,sampleRate:16000})})
    .then(function(r){return r.json()})
    .then(function(d){
      if(d.transcript&&d.transcript.trim()){
        console.log('User said:',d.transcript);
        if(typeof addMessage==='function')addMessage('user',d.transcript);
        if(typeof chatHistory!=='undefined')chatHistory.push({role:'user',content:d.transcript});
      }
      userBusy=false;
    }).catch(function(){userBusy=false});
  }

  // Send SOLI audio to Whisper (from internal audio, NOT microphone)
  function sendSoliChunk(){
    if(soliBusy||soliPcmChunks.length<4)return;
    soliBusy=true;
    var tLen=0;for(var i=0;i<soliPcmChunks.length;i++)tLen+=soliPcmChunks[i].length;
    var combined=new Float32Array(tLen);var off=0;
    for(var i2=0;i2<soliPcmChunks.length;i2++){combined.set(soliPcmChunks[i2],off);off+=soliPcmChunks[i2].length}
    soliPcmChunks=[];
    // Resample from 24kHz to 16kHz
    var resampled=ds(combined,24000,16000);
    var b64=toB(f2i16(resampled));
    var uid=typeof currentUser!=='undefined'&&currentUser?currentUser.id:null;
    console.log('Whisper soli:',Math.round(tLen/24000)+'s');
    fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio:b64,userId:uid,sampleRate:16000,role:'soli'})})
    .then(function(r){return r.json()})
    .then(function(d){
      if(d.transcript&&d.transcript.trim()){
        console.log('SOLI said:',d.transcript);
        if(typeof addMessage==='function')addMessage('soli',d.transcript);
        if(typeof chatHistory!=='undefined')chatHistory.push({role:'soli',content:d.transcript});
      }
      soliBusy=false;
    }).catch(function(){soliBusy=false});
  }

  function buildSystemInstruction(){
    var hist='';
    if(typeof chatHistory!=='undefined'&&chatHistory.length>0){
      var profile={},topics=[];
      for(var i=0;i<chatHistory.length;i++){
        var m=chatHistory[i].content||'';
        var nm=m.match(/קוראים לי ([\u0590-\u05FFa-zA-Z]+)/);if(nm)profile.name=nm[1];
        var am=m.match(/בן (\d+)/);if(am)profile.age=am[1];
        var lm=m.match(/גר ב([\u0590-\u05FF]+)/);if(lm)profile.location=lm[1];
        if(m.match(/אשתי/)){var w=m.match(/אשתי ([\u0590-\u05FF]+)/);if(w)profile.wife=w[1]}
        if(m.match(/ילדים|הילדים/))profile.kids=m;
        if(m.length>20&&chatHistory[i].role==='user')topics.push(m.substring(0,60));
      }
      hist='USER PROFILE: ';
      if(profile.name)hist+='Name: '+profile.name+'. ';
      if(profile.age)hist+='Age: '+profile.age+'. ';
      if(profile.location)hist+='Location: '+profile.location+'. ';
      if(profile.wife)hist+='Wife: '+profile.wife+'. ';
      if(profile.kids)hist+='Kids: '+profile.kids+'. ';
      hist+='\nTOPICS: '+topics.slice(-10).join(' | ')+'\n';
      var recent=chatHistory.slice(-8);
      hist+='RECENT:\n';
      for(var ri=0;ri<recent.length;ri++)hist+=(recent[ri].role==='user'?'U':'S')+': '+recent[ri].content+'\n';
      hist+='\n---\n\n';
    }
    var now=new Date().toLocaleString('he-IL',{timeZone:'Asia/Jerusalem',weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
    var full=hist+'Current time: '+now+'.\n'+VOICE_PROMPT;
    console.log('Voice context:',chatHistory?chatHistory.length:0,'msgs,',full.length,'chars');
    return full;
  }

  async function prefetchToken(){
    try{var r=await fetch('/api/token',{method:'POST'});var j=await r.json();if(r.ok&&j.token){cachedToken=j.token;tokenExpiry=Date.now()+25*60*1000}}catch(e){}
  }

  async function connect(useCam){
    if(onStatusChange)onStatusChange('connecting');
    var token;
    if(cachedToken&&Date.now()<tokenExpiry){token=cachedToken;cachedToken=null}
    else{var r=await fetch('/api/token',{method:'POST'});var j=await r.json();if(!r.ok||!j.token)throw new Error(j.error||'No token');token=j.token}
    ws=new WebSocket(WS_URL+"?key="+token);
    return new Promise(function(resolve,reject){
      var timeout=setTimeout(function(){reject(new Error('WS timeout'))},10000);
      ws.onopen=function(){
        ws.send(JSON.stringify({setup:{model:MODEL,generationConfig:{responseModalities:["AUDIO"],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:"Aoede"}}}},tools:[{googleSearch:{}}],systemInstruction:{parts:[{text:buildSystemInstruction()}]}}}));
      };
      ws.onmessage=function(event){
        function handle(raw){
          try{
            var msg=JSON.parse(raw);
            if(msg.setupComplete){
              clearTimeout(timeout);
              if(onStatusChange)onStatusChange('listening');
              startCapture(useCam);
              lastActivity=Date.now();
              userChunks=[];soliPcmChunks=[];userBusy=false;soliBusy=false;
              dgTimer=setInterval(function(){sendUserChunk();sendSoliChunk()},5000);
              console.log('Transcription timer started (5s)');
              silenceTimer=setInterval(function(){if(Date.now()-lastActivity>SILENCE_LIMIT&&active){console.log('Auto-disconnect');SoliVoice.stop()}},10000);
              resolve();
              return;
            }
            if(msg.serverContent&&msg.serverContent.modelTurn&&msg.serverContent.modelTurn.parts){
              for(var i=0;i<msg.serverContent.modelTurn.parts.length;i++){
                var p=msg.serverContent.modelTurn.parts[i];
                if(p.inlineData&&p.inlineData.data)playChunk(p.inlineData.data);
              }
            }
          }catch(e){console.error('WS msg error:',e)}
        }
        if(event.data instanceof Blob)event.data.text().then(handle);else handle(event.data);
      };
      ws.onerror=function(e){clearTimeout(timeout);console.error('WS error:',e);reject(new Error('WS error'))};
      ws.onclose=function(){clearTimeout(timeout);stopCapture();if(active&&onStatusChange)onStatusChange('disconnected')};
    });
  }

  async function startCapture(useCam){
    try{
      var constraints={audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}};
      if(useCam)constraints.video={width:320,height:240,facingMode:'user'};
      mediaStream=await navigator.mediaDevices.getUserMedia(constraints);
      audioCtx=new(window.AudioContext||window.webkitAudioContext)();
      source=audioCtx.createMediaStreamSource(mediaStream);
      processor=audioCtx.createScriptProcessor(4096,1,1);
      processor.onaudioprocess=function(e){
        if(!active||!ws||ws.readyState!==1)return;
        var input=e.inputBuffer.getChannelData(0);
        // High threshold: only real speech
        var hasSound=false;for(var i=0;i<input.length;i++){if(Math.abs(input[i])>0.05){hasSound=true;break}}
        if(hasSound)lastActivity=Date.now();
        // Record ONLY user speech - NOT when SOLI is playing
        if(hasSound&&!isPlaying){
          var dgDown=ds(input,audioCtx.sampleRate,16000);
          userChunks.push(new Float32Array(dgDown));
        }
        // Always send to Gemini
        var down=ds(input,audioCtx.sampleRate,INPUT_RATE);
        ws.send(JSON.stringify({realtimeInput:{mediaChunks:[{data:toB(f2i16(down)),mimeType:"audio/pcm;rate="+INPUT_RATE}]}}));
      };
      source.connect(processor);processor.connect(audioCtx.destination);
      if(useCam&&mediaStream.getVideoTracks().length>0){
        videoEl=document.createElement('video');videoEl.srcObject=mediaStream;videoEl.setAttribute('playsinline','');videoEl.muted=true;videoEl.play();
        canvasEl=document.createElement('canvas');
        frameInterval=setInterval(captureFrame,2000);
        videoEl.id='selfiePreview';
        videoEl.style.cssText='position:fixed;bottom:90px;right:16px;width:100px;height:130px;border-radius:12px;object-fit:cover;z-index:999;border:2px solid rgba(184,169,201,0.4);box-shadow:0 4px 16px rgba(0,0,0,0.15);transform:scaleX(-1);';
        document.body.appendChild(videoEl);
        var cd=document.createElement('div');cd.id='camDot';cd.style.cssText='position:fixed;bottom:208px;right:20px;width:8px;height:8px;border-radius:50%;background:#e74c3c;z-index:1000;';
        document.body.appendChild(cd);
      }
    }catch(e){console.error('Capture error:',e);if(onStatusChange)onStatusChange('error')}
  }

  function stopCapture(){
    if(dgTimer){clearInterval(dgTimer);dgTimer=null}
    if(userChunks.length>=4)sendUserChunk();
    if(soliPcmChunks.length>=4)sendSoliChunk();
    userChunks=[];soliPcmChunks=[];
    if(silenceTimer){clearInterval(silenceTimer);silenceTimer=null}
    if(frameInterval){clearInterval(frameInterval);frameInterval=null}
    if(videoEl){videoEl.remove();videoEl=null}canvasEl=null;
    var cd=document.getElementById('camDot');if(cd)cd.remove();
    if(processor)try{processor.disconnect()}catch(e){}if(source)try{source.disconnect()}catch(e){}
    if(mediaStream)mediaStream.getTracks().forEach(function(t){t.stop()});
    if(audioCtx&&audioCtx.state!=='closed')try{audioCtx.close()}catch(e){}
    processor=null;source=null;mediaStream=null;audioCtx=null;
  }

  return{
    start:async function(cbs,useCam){
      if(active)return;active=true;
      onStatusChange=cbs.onStatusChange||null;
      playQueue=[];isPlaying=false;userChunks=[];soliPcmChunks=[];userBusy=false;soliBusy=false;
      try{await connect(useCam)}catch(e){console.error('Voice error:',e);active=false;if(onStatusChange)onStatusChange('error')}
    },
    stop:function(){
      active=false;playQueue=[];isPlaying=false;
      stopCapture();
      if(ws)try{ws.close()}catch(e){}ws=null;
      try{document.getElementById('theOrb').classList.remove('speaking')}catch(e){}
      if(onStatusChange)onStatusChange('off');
    },
    isActive:function(){return active},
    prefetch:function(){prefetchToken()}
  };
})();
