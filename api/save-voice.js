module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({error:"POST only"});
  var userId = req.body.userId;
  var messages = req.body.messages || [];
  if (!userId || messages.length === 0) return res.status(200).json({saved:0});
  var sbUrl = process.env.SUPABASE_URL;
  var sbKey = process.env.SUPABASE_SERVICE_KEY;
  var cid = require("crypto").randomUUID();
  var h = {"Content-Type":"application/json","apikey":sbKey,"Authorization":"Bearer "+sbKey,"Prefer":"return=minimal"};
  await fetch(sbUrl+"/rest/v1/conversations",{method:"POST",headers:Object.assign({},h,{"Prefer":"return=minimal,resolution=ignore-duplicates"}),body:JSON.stringify([{id:cid,user_id:userId}])});
  var rows = messages.map(function(m){return{conversation_id:cid,user_id:userId,role:m.role,content:m.content}});
  await fetch(sbUrl+"/rest/v1/messages",{method:"POST",headers:h,body:JSON.stringify(rows)});
  return res.status(200).json({saved:rows.length});
};
