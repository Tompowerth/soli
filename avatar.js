// ============================================================
// SOLI — 3D Avatar Module
// avatar.js — TalkingHead integration with lip-sync
// ============================================================

var SoliAvatar = (function() {
  var head = null;
  var headAudio = null;
  var container = null;
  var loaded = false;
  var currentAvatar = null;

  // Ready Player Me avatar URLs
  // Female: warm, 30-40, professional
  // Male: warm, 30-40, professional
  var AVATARS = {
    female: {
      name: "SOLI",
      // Placeholder — replace with custom Ready Player Me avatar
      url: "https://models.readyplayer.me/6460d95f9ae8b55e175ff5e0.glb?morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024&lod=1",
    },
    male: {
      name: "SOL",
      url: "https://models.readyplayer.me/6460725e9ae8b55e175fef12.glb?morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024&lod=1",
    }
  };

  async function init(containerEl, gender) {
    container = containerEl;
    currentAvatar = gender || 'female';

    // Dynamic import of TalkingHead
    try {
      var module = await import("https://cdn.jsdelivr.net/npm/@met4citizen/talkinghead@1.7/+esm");
      var TalkingHead = module.TalkingHead;

      head = new TalkingHead(container, {
        ttsEndpoint: null, // We handle TTS ourselves via Gemini Live
        cameraView: "upper",
        cameraDistance: 0.6,
        cameraX: 0,
        cameraY: 0,
        cameraRotateEnable: false,
        cameraPanEnable: false,
        cameraZoomEnable: false,
        avatarMood: "happy",
        avatarIdleEyeContact: 0.7,
        lightAmbientColor: "#FAF6F0",
        lightDirectColor: "#FFFFFF",
        lightDirectIntensity: 1.2,
        lightSpotIntensity: 0.5,
        envBackground: false,
        rendererBackground: null,
      });

      // Load avatar model
      var avatarUrl = AVATARS[currentAvatar].url;
      await head.showAvatar({ url: avatarUrl, body: "F" }, {
        avatarMood: "happy",
      });

      loaded = true;
      return true;

    } catch(e) {
      console.error("Avatar init error:", e);
      // Fallback: show animated orb instead
      showFallbackOrb(container);
      return false;
    }
  }

  // Fallback animated orb when 3D fails
  function showFallbackOrb(el) {
    el.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#F0E6F0,#FAF6F0);">' +
      '<div id="fallback-orb" style="width:180px;height:180px;border-radius:50%;background:linear-gradient(135deg,#B8A9C9,#E8B4B8);box-shadow:0 20px 60px rgba(184,169,201,.3);transition:transform .3s,box-shadow .3s;"></div></div>';
  }

  // Set mood/expression
  function setMood(mood) {
    if (!head || !loaded) {
      // Fallback orb mood
      var orb = document.getElementById('fallback-orb');
      if (orb) {
        if (mood === 'speaking') {
          orb.style.transform = 'scale(1.1)';
          orb.style.boxShadow = '0 20px 80px rgba(184,169,201,.5)';
        } else if (mood === 'listening') {
          orb.style.transform = 'scale(1.05)';
          orb.style.boxShadow = '0 20px 60px rgba(184,169,201,.4)';
        } else {
          orb.style.transform = 'scale(1)';
          orb.style.boxShadow = '0 20px 60px rgba(184,169,201,.3)';
        }
      }
      return;
    }

    try {
      switch(mood) {
        case 'happy': head.setMood("happy"); break;
        case 'concerned': head.setMood("sad"); break;
        case 'thinking': head.setMood("thinking"); break;
        case 'speaking': head.setMood("happy"); break;
        case 'listening': head.setMood("neutral"); break;
        default: head.setMood("neutral");
      }
    } catch(e) {}
  }

  // Feed audio data for lip-sync (from Gemini Live audio)
  function feedAudio(pcmData) {
    if (!head || !loaded) return;
    try {
      // Create audio object for TalkingHead
      head.speakAudio({ audio: pcmData });
    } catch(e) {
      console.error("Audio feed error:", e);
    }
  }

  // Stop speaking
  function stopSpeaking() {
    if (!head || !loaded) return;
    try { head.stopSpeaking(); } catch(e) {}
  }

  // Switch avatar
  async function switchAvatar(gender) {
    if (gender === currentAvatar) return;
    currentAvatar = gender;
    if (head && loaded) {
      var avatarUrl = AVATARS[gender].url;
      await head.showAvatar({ url: avatarUrl, body: gender === 'female' ? 'F' : 'M' });
    }
  }

  // Cleanup
  function destroy() {
    if (head) {
      try { head.stop(); } catch(e) {}
      head = null;
    }
    loaded = false;
    if (container) container.innerHTML = '';
  }

  return {
    init: init,
    setMood: setMood,
    feedAudio: feedAudio,
    stopSpeaking: stopSpeaking,
    switchAvatar: switchAvatar,
    destroy: destroy,
    isLoaded: function() { return loaded; },
    getAvatars: function() { return AVATARS; },
  };
})();
