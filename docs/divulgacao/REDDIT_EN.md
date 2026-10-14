# Promotion draft — Reddit (English)

> Do not post automatically. Review, adapt the tone to each community, and replace
> the placeholders `SEU_USUARIO/SEU_REPOSITORIO` and `PAYPAL_SUPPORT_URL` before
> posting. Suggested communities: r/opensource, r/selfhosted, r/webrtc,
> r/SideProject. Read each subreddit's rules first (many restrict self-promotion).

---

**Title:** Concorde — an open-source, self-hosted "mini Discord" (host your own server for free)

**Body:**

I built an open-source project called **Concorde**: a Windows desktop app for
chatting with friends over **voice, video, text, and screen sharing**, organized
in servers and channels. The whole point is **self-hosting** — each person spins
up **their own server** for free and invites whoever they want. No reliance on
anyone's infrastructure, no ads, and the code is open to audit.

**Some technical details:**
- App in **Electron + React**; server in **Node.js + Socket.IO**.
- Voice/video/screen are **P2P (WebRTC)** — the server only does signaling and
  stores text, so it's light enough for Render's free tier.
- Screen sharing can capture **only the chosen app's audio** (per-process capture
  on Windows), so the call's voice isn't echoed back.
- Per-user volume (separate voice vs. stream), input/output device selection,
  GIFs, and a synced "watch together" YouTube mini player.

**Being honest about limits:** this is a community project, not a commercial
product. Render's free tier **sleeps** when idle (takes a few seconds to wake),
and the server keeps state **in memory** (on restart it's recreated as people
rejoin). The executable is **unsigned**, so Windows SmartScreen may warn on first
run.

**Not affiliated with Discord** or any other app — just a community-run
alternative.

Code, a "host your own server in ~10 minutes" guide, and build instructions:
👉 https://github.com/SEU_USUARIO/SEU_REPOSITORIO

Feedback, issues, and PRs are very welcome. If you try self-hosting a server, I'd
love to hear how it went. 🙌

*(Optional) There's a voluntary donation link in the README if you'd like to
support development — it doesn't unlock anything.*
