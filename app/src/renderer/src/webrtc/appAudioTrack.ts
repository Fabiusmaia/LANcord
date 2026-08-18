/** Recebe chunks PCM (16-bit, stereo, 48kHz) vindos do processo principal via IPC
 *  e os injeta num MediaStreamAudioDestinationNode, produzindo uma MediaStreamTrack
 *  de audio "ao vivo" que pode ser adicionada normalmente a uma RTCPeerConnection. */

const SAMPLE_RATE = 48000;
const MAX_QUEUED_SAMPLES = SAMPLE_RATE * 2; // ~2s de buffer, evita crescimento sem limite

type StereoChunk = { l: Float32Array; r: Float32Array; offset: number };

class PcmTrackSource {
  private ctx: AudioContext;
  private dest: MediaStreamAudioDestinationNode;
  private processor: ScriptProcessorNode;
  private queue: StereoChunk[] = [];
  private queuedSamples = 0;

  constructor() {
    this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    this.dest = this.ctx.createMediaStreamDestination();
    this.processor = this.ctx.createScriptProcessor(2048, 0, 2);
    this.processor.onaudioprocess = (e) => this.fill(e.outputBuffer);
    this.processor.connect(this.dest);
  }

  push(chunk: Uint8Array): void {
    const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    const sampleCount = Math.floor(chunk.byteLength / 4); // 2 bytes * 2 canais
    const l = new Float32Array(sampleCount);
    const r = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      l[i] = view.getInt16(i * 4, true) / 32768;
      r[i] = view.getInt16(i * 4 + 2, true) / 32768;
    }
    this.queue.push({ l, r, offset: 0 });
    this.queuedSamples += sampleCount;

    while (this.queuedSamples > MAX_QUEUED_SAMPLES && this.queue.length > 1) {
      const dropped = this.queue.shift();
      if (dropped) this.queuedSamples -= dropped.l.length - dropped.offset;
    }
  }

  private fill(buffer: AudioBuffer): void {
    const outL = buffer.getChannelData(0);
    const outR = buffer.getChannelData(1);
    let filled = 0;
    while (filled < outL.length && this.queue.length > 0) {
      const head = this.queue[0];
      const available = head.l.length - head.offset;
      const take = Math.min(available, outL.length - filled);
      outL.set(head.l.subarray(head.offset, head.offset + take), filled);
      outR.set(head.r.subarray(head.offset, head.offset + take), filled);
      head.offset += take;
      filled += take;
      this.queuedSamples -= take;
      if (head.offset >= head.l.length) this.queue.shift();
    }
    // resto do buffer fica em silencio (zero) se a fila esvaziar
  }

  get track(): MediaStreamTrack {
    return this.dest.stream.getAudioTracks()[0];
  }

  close(): void {
    this.processor.disconnect();
    this.dest.disconnect();
    void this.ctx.close();
  }
}

let current: { source: PcmTrackSource; unsubscribe: () => void } | null = null;

/** Inicia a captura de audio do app compartilhado (ou do sistema todo, se nao
 *  for uma janela especifica) e retorna uma MediaStreamTrack pronta pra usar. */
export async function startAppAudioTrack(sourceId: string): Promise<MediaStreamTrack | null> {
  stopAppAudioTrack();
  const ok = await window.electronAPI.startAppAudioCapture(sourceId);
  if (!ok) return null;

  const source = new PcmTrackSource();
  const unsubscribe = window.electronAPI.onAppAudioChunk((chunk) => source.push(chunk));
  current = { source, unsubscribe };
  return source.track;
}

export function stopAppAudioTrack(): void {
  if (!current) return;
  current.unsubscribe();
  current.source.close();
  current = null;
  void window.electronAPI.stopAppAudioCapture();
}
