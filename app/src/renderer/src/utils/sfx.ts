import msgSoundUrl from "@renderer/assets/sfx/msg_sound.ogg";
import userJoinedUrl from "@renderer/assets/sfx/usr_joined.wav";
import userLeftUrl from "@renderer/assets/sfx/usr_left.wav";
import userSharedScreenUrl from "@renderer/assets/sfx/usr_shared_screen.wav";

// gain > 1 amplifica de verdade (o <audio>.volume nativo satura em 1.0/100%).
const SOUNDS = {
  message: { url: msgSoundUrl, gain: 1.5 },
  userJoined: { url: userJoinedUrl, gain: 3.5 },
  userLeft: { url: userLeftUrl, gain: 3.5 },
  userSharedScreen: { url: userSharedScreenUrl, gain: 2 },
} satisfies Record<string, { url: string; gain: number }>;

type SfxName = keyof typeof SOUNDS;

let audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/** Toca um efeito sonoro amplificado via Web Audio API (GainNode acima de 1.0,
 *  o volume nativo do <audio> nao passa de 100%). Cria um novo <audio> por
 *  chamada pra permitir sons sobrepostos, ex: duas mensagens em sequencia. */
export function playSfx(name: SfxName): void {
  const { url, gain } = SOUNDS[name];
  const ctx = getAudioContext();
  if (ctx.state === "suspended") void ctx.resume();

  const audio = new Audio(url);
  const source = ctx.createMediaElementSource(audio);
  const gainNode = ctx.createGain();
  gainNode.gain.value = gain;
  source.connect(gainNode).connect(ctx.destination);

  void audio.play().catch((err) => console.error(`[sfx] falha ao tocar "${name}"`, err));
}
