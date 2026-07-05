# SOLI — Voice Pipeline: Technical Architecture & Cost Analysis
## How SOLI Hears, Thinks, and Speaks

---

## 1. How It Works — 4 Steps

When a user talks to SOLI, this happens in 1-2 seconds:

```
User speaks into phone
       ↓
[Whisper — on our GPU server]
       Converts voice → text
       ↓
[Claude Haiku — Anthropic API]
       Reads text + user profile + history
       Thinks → generates response as text
       ↓
[Kokoro/Chatterbox — on our GPU server]
       Converts response text → natural voice
       ↓
SOLI speaks back through phone speaker
```

**Step 1 — Ear (STT: Speech-to-Text)**
Tool: Whisper (OpenAI, open source, free)
What it does: Converts the user's voice into text
Runs on: Our GPU server
Cost: $0 (open source)

**Step 2 — Brain (LLM: Claude)**
Tool: Claude Haiku API (fast + cheap), Sonnet (emotional), Opus (deep)
What it does: Understands what the user said, thinks, creates a response
Runs on: Anthropic's servers (we pay per use)
Cost: $0.005/minute of conversation

**Step 3 — Voice (TTS: Text-to-Speech)**
Tool: Kokoro (82M params, Apache 2.0) or Chatterbox-Turbo (MIT)
What it does: Converts SOLI's text response into natural, warm voice
Runs on: Our GPU server
Cost: $0 (open source)
Quality: 94% of ElevenLabs. Chatterbox beat ElevenLabs in blind test (65.3% vs 24.5%)

**Step 4 — Connection (WebSocket)**
Tool: Node.js + WebSocket
What it does: Keeps a real-time connection between phone and server
Runs on: Our server
Cost: Negligible

---

## 2. What We Need

| Component | What | Provider | Cost Model |
|-----------|------|----------|-----------|
| GPU Server | Runs Whisper + Kokoro | Vast.ai / RunPod | Monthly (per GPU/hour) |
| Claude API | SOLI's brain | Anthropic | Per use ($0.005/min) |
| Database | User profiles, memory | Supabase | Monthly ($25-300) |
| Frontend | The app users see | Vercel | Monthly ($0-20) |
| Domain | heysoli.ai | GoDaddy | Annual ($120/yr) |

**That's it.** Three services: GPU host, Anthropic, Vercel.

---

## 3. Cost Per Minute Breakdown

| Component | Cost/Minute | Notes |
|-----------|------------|-------|
| Whisper (STT) | $0.000 | Open source, runs on our GPU |
| Claude Haiku | $0.005 | The only per-use cost we can't avoid |
| Kokoro (TTS) | $0.000 | Open source, runs on our GPU |
| GPU amortized | $0.002 | Server cost spread across all users |
| Claude Vision | $0.003 | Only during video moments |
| **TOTAL (voice only)** | **$0.007/min** | |
| **TOTAL (voice + video)** | **$0.010/min** | |

**For comparison:**
- ElevenLabs + Hume: $0.026/min (3.7x more expensive)
- AssemblyAI all-in-one: $0.075/min (10x more expensive)
- Our self-hosted: $0.007-0.010/min

---

## 4. Cost Per User Per Month

| User Type | Voice Min/Day | Monthly Cost | Notes |
|-----------|--------------|-------------|-------|
| Light (text mostly) | 3 min | $0.88 | Quick check-ins |
| Average | 10 min | $2.35 | Daily conversations |
| Active | 20 min | $4.45 | Regular deep talks |
| Heavy | 30 min | $6.55 | Very engaged |
| Power | 45 min | $9.73 | The 5% extreme |
| **Blended average** | **~12 min** | **$3.07** | **Weighted across all users** |

---

## 5. Can It Handle 200,000 Daily Users?

**Yes.** Here's the math:

### Load Calculation:
- 200,000 users × 12 min/day average = 2,400,000 voice minutes/day
- Spread over 16 active hours = ~2,500 concurrent sessions average
- Peak hour (3× average) = ~7,500 concurrent sessions

### GPU Requirements:
- Whisper: 1 GPU handles ~50 concurrent streams → 151 GPUs at peak
- Kokoro: 1 GPU handles ~100 concurrent streams → 76 GPUs at peak
- Total: 227 GPUs at peak

### Monthly Infrastructure Cost:

| Item | Cost |
|------|------|
| GPU servers (227 × Vast.ai) | $49,032 |
| Claude API (Haiku) | $12,000 |
| Claude Vision | $3,000 |
| Supabase Pro | $300 |
| Vercel + misc | $520 |
| **TOTAL** | **$64,852/month** |

**Cost per user: $0.32/month.** Thirty-two cents.

---

## 6. Scaling Curve

Costs are NOT linear — they get cheaper per user as you grow:

| Daily Users | GPUs | Monthly Cost | Per User |
|------------|------|-------------|----------|
| 1,000 | 2 | $1,312 | $1.31 |
| 5,000 | 6 | $2,416 | $0.48 |
| 10,000 | 12 | $4,012 | $0.40 |
| 50,000 | 57 | $16,132 | $0.32 |
| 100,000 | 114 | $31,444 | $0.31 |
| 200,000 | 227 | $61,852 | $0.31 |
| 500,000 | 564 | $152,644 | $0.31 |

At scale (50K+), the cost stabilizes at **~$0.31/user/month.**

---

## 7. Revenue vs Cost at 200K Daily Users

Assuming 200K DAU = ~500K registered users:

| Scenario | Paid Users | Price | Revenue/mo | Cost/mo | Profit/mo | Annual | Margin |
|----------|-----------|-------|-----------|---------|----------|--------|--------|
| Conservative | 40K (8%) | $9.99 | $400K | $65K | **$335K** | **$4.0M** | 84% |
| Base | 40K (8%) | $14.99 | $600K | $65K | **$535K** | **$6.4M** | 89% |
| Optimistic | 50K (10%) | $14.99 | $750K | $65K | **$685K** | **$8.2M** | 91% |
| Best case | 60K (12%) | $14.99 | $899K | $65K | **$835K** | **$10.0M** | 93% |

---

## 8. Starting Small — Day 1 Costs

You don't need 227 GPUs on day 1. You need 1-2.

| Phase | Users | GPUs | Monthly Cost |
|-------|-------|------|-------------|
| Beta (month 1) | 100 | 1 | $250 |
| Launch (month 2-3) | 1,000 | 2 | $1,312 |
| Growth (month 4-6) | 5,000 | 6 | $2,416 |
| Scale (month 7-12) | 50,000 | 57 | $16,132 |

**Day 1: $250. That's it.**
GPU scales automatically with demand. Add servers only when needed.

---

## 9. Open Source Models We Use

### Whisper (STT — user speaks → text)
- By: OpenAI
- License: MIT (free for commercial use)
- Quality: #1 accuracy for speech recognition
- Languages: 97 languages (Hebrew included!)
- Size: Whisper-large-v3 = most accurate

### Kokoro (TTS — text → SOLI speaks)
- License: Apache 2.0 (free for commercial use)
- Size: 82M parameters (very lightweight)
- Speed: 210× real-time on a single GPU
- Quality: Production-grade, natural sounding
- Cost via API: Under $1 per million characters
- Self-hosted: $0

### Chatterbox-Turbo (TTS — premium alternative)
- By: Resemble AI
- License: MIT (free for commercial use)
- Quality: Beat ElevenLabs in blind test (65.3% vs 24.5%)
- Features: Voice cloning, emotion control
- Self-hosted: $0

### MediaPipe (Face tracking — on user's phone)
- By: Google
- License: Apache 2.0
- Runs on: User's device (zero server cost)
- Features: 478 facial landmarks, real-time

---

## 10. What Tomer Needs to Provide

| Item | Where | Cost | When |
|------|-------|------|------|
| Vast.ai or RunPod account | vast.ai / runpod.io | Pay per use | Before build |
| Anthropic API key | console.anthropic.com | Already have from MIRA | Now |
| Supabase project | supabase.com | Free to start | Now |
| Vercel (connected) | vercel.com | Free to start | Done (heysoli.ai) |

**Total upfront cost: $0**
**First month running cost: ~$250 (1 GPU + Claude API)**

---

## 11. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Kokoro voice quality not good enough | Low | High | Switch to Chatterbox or use both |
| Whisper latency too high | Low | Medium | Use Whisper-turbo or Parakeet |
| GPU costs spike | Medium | Medium | Set spending limits, auto-scale rules |
| Claude API goes down | Low | High | Fallback to self-hosted Llama 3 |
| Too many concurrent users | Good problem | Medium | Add GPUs (takes minutes) |

---

## Summary

**The voice pipeline costs $0.007-0.010 per minute.**
**At 200K daily users, total infrastructure is $65K/month.**
**Revenue at $14.99 with 8% conversion: $600K/month.**
**Profit: $535K/month = $6.4M/year at 89% margin.**
**Starting cost: $250/month.**

The technology exists. It's open source. It's proven.
SOLI just needs to be assembled.
