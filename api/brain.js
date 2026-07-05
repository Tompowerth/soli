module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  var sbUrl = process.env.SUPABASE_URL;
  var sbKey = process.env.SUPABASE_SERVICE_KEY;
  var apiKey = process.env.GEMINI_API_KEY;
  var h = {"Content-Type":"application/json","apikey":sbKey,"Authorization":"Bearer "+sbKey};

  // GET: load brain
  if (req.method === "GET") {
    var uid = req.query.userId;
    if (!uid) return res.status(400).json({ error: "Missing userId" });
    try {
      var r = await fetch(sbUrl + "/rest/v1/user_brain?user_id=eq." + uid + "&select=brain_data", { headers: h });
      var arr = await r.json();
      if (arr && arr.length > 0 && arr[0].brain_data) return res.status(200).json({ brain: arr[0].brain_data });
      return res.status(200).json({ brain: null });
    } catch(e) { return res.status(200).json({ brain: null }); }
  }

  // POST: analyze and save
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  var userId = req.body.userId;
  var messages = req.body.messages || [];
  if (!userId || messages.length === 0) return res.status(200).json({ updated: false });

  try {
    // 1. Load existing brain
    var existR = await fetch(sbUrl + "/rest/v1/user_brain?user_id=eq." + userId + "&select=brain_data", { headers: h });
    var existArr = await existR.json();
    var existing = (existArr && existArr.length > 0) ? existArr[0].brain_data : null;

    // 2. Build conversation text
    var convText = messages.map(function(m) { return (m.role === "user" ? "User" : "SOLI") + ": " + m.content; }).join("\n");

    // 3. Ask Gemini to analyze
    var prompt = "You are a behavioral analyst. Maintain a user profile.\n\n";
    if (existing) prompt += "EXISTING PROFILE:\n" + JSON.stringify(existing) + "\n\n";
    prompt += "NEW CONVERSATION:\n" + convText + "\n\n";
    prompt += "Output updated JSON profile with these fields:\n" +
      '{"identity":{"name":"","age":0,"gender":"","location":"","language":"","work":""},' +
      '"family":[{"name":"","relation":"","notes":""}],' +
      '"communication_style":{"preferred_response_length":"short","likes":[],"dislikes":[],"humor_level":"none"},' +
      '"emotional_profile":{"baseline_mood":"","triggers":[],"coping_mechanisms":[],"patterns":[]},' +
      '"topics_of_interest":[],' +
      '"goals":[],' +
      '"adaptation_notes":[],' +
      '"conversation_count":0,' +
      '"last_topics":[]}\n\n' +
      "RULES:\n- If existing profile has data, keep it and add new info.\n- Increment conversation_count.\n- Be specific. Real observations only.\n- NEVER invent information not in the conversation.\n- Output ONLY valid JSON, nothing else.";

    var geminiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    var geminiData = await geminiRes.json();
    var brainText = "";
    if (geminiData.candidates && geminiData.candidates[0] && geminiData.candidates[0].content) {
      var parts = geminiData.candidates[0].content.parts;
      for (var i = 0; i < parts.length; i++) {
        if (!parts[i].thought && parts[i].text) brainText += parts[i].text;
      }
    }
    brainText = brainText.replace(/```json|```/g, "").trim();
    var brainData;
    try { brainData = JSON.parse(brainText); } catch(e) {
      return res.status(200).json({ updated: false, error: "parse_failed" });
    }

    // 4. Save - DELETE then INSERT (clean approach)
    await fetch(sbUrl + "/rest/v1/user_brain?user_id=eq." + userId, {
      method: "DELETE",
      headers: Object.assign({}, h, { "Prefer": "return=minimal" })
    });

    var insertRes = await fetch(sbUrl + "/rest/v1/user_brain", {
      method: "POST",
      headers: Object.assign({}, h, { "Prefer": "return=minimal" }),
      body: JSON.stringify({ user_id: userId, brain_data: brainData, updated_at: new Date().toISOString() })
    });

    var saveOk = insertRes.ok;
    var saveStatus = insertRes.status;
    if (!saveOk) {
      var errBody = await insertRes.text();
      console.error("Brain insert error:", saveStatus, errBody);
    }

    return res.status(200).json({ updated: true, brain: brainData, saveOk: saveOk, saveStatus: saveStatus });

  } catch(e) {
    console.error("Brain error:", e);
    return res.status(500).json({ error: e.message });
  }
};
