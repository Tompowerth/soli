// ============================================================
// SOLI — transcribe.js v2.0
// Fixes: VAD energy gate, hallucination blacklist, min duration
// ============================================================

// --- Whisper hallucination blacklist ---
// These are phrases Whisper invents when receiving silence or noise
var HALLUCINATION_BLACKLIST = [
  // Hebrew
  'תודה שצפיתם', 'תודה על הצפייה', 'תודה לכם', 'תירגום', 'תרגום',
  'כתוביות', 'שבוצעו על ידי', 'הקלטה בוצעה', 'תודה רבה', 'להתראות',
  'שלום לכולם', 'ברוכים הבאים', 'המשך צפייה', 'עד הפעם הבאה',
  'אם נהניתם', 'הירשמו', 'לייק', 'מוזיקה', 'תודה שהאזנתם',
  // English
  'thank you for watching', 'thanks for watching', 'thank you for listening',
  'please subscribe', 'like and subscribe', 'subtitles by', 'translated by',
  'transcribed by', 'captioned by', 'music', 'applause', 'laughter',
  'silence', 'you', 'the end', 'bye bye', 'bye', 'so', 'um',
  'thank you', 'thanks', 'okay', 'hmm', 'uh',
  // Repetitive artifacts
  'שלום שלום', 'כן כן כן', 'לא לא לא',
];

// Patterns that indicate hallucinated content
var HALLUCINATION_PATTERNS = [
  /^\.+$/,                    // Just dots
  /^\s*$/,                    // Just whitespace
  /^[,.\-!?\s]+$/,            // Just punctuation
  /(.{2,})\1{2,}/,            // Same phrase repeated 3+ times
  /^(you|the|a|an|is|it)\s*$/i, // Single common English words
  /תודה.*צפ/,                 // "thanks for watching" variants
  /כתוביות.*על.*ידי/,          // "subtitles by" variants
  /הוסבו על ידי/,              // "translated by" variants
];

// --- VAD: Check if PCM buffer has speech-level energy ---
function hasVoiceActivity(pcmBuffer, threshold) {
  if (!threshold) threshold = 150; // RMS threshold for 16-bit PCM (lowered to avoid blocking soft speech)
  if (pcmBuffer.length < 640) return false; // Less than 20ms at 16kHz = too short

  var samples = pcmBuffer.length / 2; // 16-bit = 2 bytes per sample
  var sumSquares = 0;
  var peakAmplitude = 0;

  for (var i = 0; i < pcmBuffer.length - 1; i += 2) {
    var sample = pcmBuffer.readInt16LE(i);
    sumSquares += sample * sample;
    var abs = Math.abs(sample);
    if (abs > peakAmplitude) peakAmplitude = abs;
  }

  var rms = Math.sqrt(sumSquares / samples);

  // Also check: if peak is very low, it's definitely silence
  // 16-bit range is -32768 to 32767
  if (peakAmplitude < 100) return false;

  return rms >= threshold;
}

// --- Check minimum duration ---
function getDurationSeconds(pcmBuffer, sampleRate) {
  var samples = pcmBuffer.length / 2; // 16-bit
  return samples / sampleRate;
}

// --- Filter hallucinated transcripts ---
function isHallucination(text) {
  if (!text) return true;
  var clean = text.trim().toLowerCase();
  if (clean.length < 2) return true;

  // Check blacklist (exact or contained)
  for (var i = 0; i < HALLUCINATION_BLACKLIST.length; i++) {
    if (clean === HALLUCINATION_BLACKLIST[i].toLowerCase()) return true;
  }

  // Check patterns
  for (var j = 0; j < HALLUCINATION_PATTERNS.length; j++) {
    if (HALLUCINATION_PATTERNS[j].test(clean)) return true;
  }

  // Single word under 4 chars is likely noise
  if (clean.split(/\s+/).length === 1 && clean.length < 4) return true;

  return false;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  var audio = req.body.audio;
  var userId = req.body.userId;
  var role = req.body.role || 'user';
  if (!audio) return res.status(400).json({ error: "No audio" });

  try {
    var openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return res.status(500).json({ error: "No OpenAI key" });

    var pcmBuffer = Buffer.from(audio, 'base64');

    // --- VAD Gate: skip if no voice activity ---
    var duration = getDurationSeconds(pcmBuffer, 16000);
    if (duration < 0.5) {
      return res.status(200).json({ transcript: "", filtered: "too_short" });
    }

    if (!hasVoiceActivity(pcmBuffer, 150)) {
      return res.status(200).json({ transcript: "", filtered: "silence" });
    }

    var wavBuffer = pcmToWav(pcmBuffer, 16000);

    var boundary = '----FormBound' + Date.now();
    var body = Buffer.concat([
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n'),
      wavBuffer,
      Buffer.from('\r\n--' + boundary + '\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n'),
      // Prompt to reduce hallucinations — gives Whisper context
      Buffer.from('\r\n--' + boundary + '\r\nContent-Disposition: form-data; name="prompt"\r\n\r\nשיחה אישית עם סולי. המשתמש מדבר בעברית או באנגלית.\r\n'),
      Buffer.from('--' + boundary + '--\r\n')
    ]);

    var r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + openaiKey,
        "Content-Type": "multipart/form-data; boundary=" + boundary
      },
      body: body
    });

    if (!r.ok) {
      var errText = await r.text();
      console.error("Whisper error:", r.status, errText);
      return res.status(200).json({ transcript: "", error: errText.substring(0, 200) });
    }

    var data = await r.json();
    var transcript = (data.text || "").trim();

    // --- Post-processing: filter hallucinations ---
    if (isHallucination(transcript)) {
      return res.status(200).json({ transcript: "", filtered: "hallucination", original: transcript });
    }

    // Save to Supabase (only real transcripts)
    if (transcript && userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      try {
        var sbUrl = process.env.SUPABASE_URL;
        var sbKey = process.env.SUPABASE_SERVICE_KEY;
        var cid = require("crypto").randomUUID();
        var h = {"Content-Type":"application/json","apikey":sbKey,"Authorization":"Bearer "+sbKey,"Prefer":"return=minimal"};
        await fetch(sbUrl+"/rest/v1/conversations",{method:"POST",headers:Object.assign({},h,{"Prefer":"return=minimal,resolution=ignore-duplicates"}),body:JSON.stringify([{id:cid,user_id:userId}])});
        await fetch(sbUrl+"/rest/v1/messages",{method:"POST",headers:h,body:JSON.stringify([{conversation_id:cid,user_id:userId,role:"user",content:transcript}])});
      } catch(e) { console.error("Save error:", e); }
    }

    return res.status(200).json({ transcript: transcript });
  } catch(e) {
    console.error("Transcribe error:", e.message);
    return res.status(200).json({ transcript: "", error: e.message });
  }
};

function pcmToWav(pcmBuffer, sampleRate) {
  var numChannels = 1, bitsPerSample = 16;
  var byteRate = sampleRate * numChannels * bitsPerSample / 8;
  var blockAlign = numChannels * bitsPerSample / 8;
  var dataSize = pcmBuffer.length;
  var buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(buffer, 44);
  return buffer;
}
