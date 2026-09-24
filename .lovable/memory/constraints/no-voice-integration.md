---
name: No voice integration
description: No STT/TTS in the app; single exception = pre-recorded ElevenLabs narration baked into the /demos videos
type: constraint
---
No voice integration in the product: no speech-to-text, no text-to-speech features, no wiring unified_voice_profile into generation. Oracle voice profile stays display-only.

Exception (approved Sep 2026): the four demo videos in public/demos carry pre-recorded ElevenLabs narration (voice Sarah, eleven_multilingual_v2), mixed in at build time. This is a baked asset, not an app voice feature — do not extend it into runtime TTS.
