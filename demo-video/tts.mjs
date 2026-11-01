// Voices each beat of voiceover.json with Gemini TTS into public/vo/<id>.wav.
// Usage: npm run tts [-- <id> ...]   (no ids = all beats)
import {GoogleGenAI} from '@google/genai';
import fs from 'node:fs';
import {voiceover} from './voice.mjs';

const MODEL = 'gemini-2.5-flash-preview-tts';
const VOICE = process.env.TTS_VOICE || 'Charon';
const STYLE = 'Read this as a calm, confident product-demo narrator, at a brisk but clear pace:';

const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
const beats = voiceover();
const only = process.argv.slice(2);

fs.mkdirSync('public/vo', {recursive: true});

function wav(pcm) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

for (const b of beats) {
  if (only.length && !only.includes(b.id)) continue;
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [{role: 'user', parts: [{text: `${STYLE}\n\n${b.text}`}]}],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {voiceConfig: {prebuiltVoiceConfig: {voiceName: VOICE}}},
    },
  });
  const data = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
  if (!data) throw new Error(`No audio for ${b.id}`);
  const pcm = Buffer.from(data, 'base64');
  fs.writeFileSync(`public/vo/${b.id}.wav`, wav(pcm));
  console.log(b.id, (pcm.length / 48000).toFixed(1) + 's');
  await new Promise((r) => setTimeout(r, 21000)); // free tier: 3 TTS requests a minute
}
