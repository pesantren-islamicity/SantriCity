/**
 * Service for handling browser microphone audio recording for Tahfidz Recitations.
 * Uses MediaRecorder API and Web Audio API for audio analysis/visualizer.
 */

export interface AudioRecordingResult {
  blob: Blob;
  dataUrl: string;
  durationSeconds: number;
}

/**
 * Checks if browser supports MediaRecorder and microphone access
 */
export function isMicrophoneSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window.MediaRecorder !== 'undefined'
  );
}

/**
 * Converts a Blob to a base64 Data URL string
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Helper to generate a clean synthetic recitation audio sample (harmonic Quranic melodic chime)
 * as a fallback test audio if microphone permission is denied or in testing environments.
 */
export async function generateSampleRecitationAudio(): Promise<AudioRecordingResult> {
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('AudioContext not supported');
  }

  const sampleRate = 22050;
  const durationSeconds = 6;
  const ctx = new AudioContextClass();
  const buffer = ctx.createBuffer(1, sampleRate * durationSeconds, sampleRate);
  const data = buffer.getChannelData(0);

  // Generate a soothing melodic recitation pitch sequence (Bayati maqam notes)
  const notes = [
    { freq: 261.63, dur: 1.2 }, // C4
    { freq: 293.66, dur: 1.0 }, // D4
    { freq: 311.13, dur: 1.2 }, // Eb4 (Half flat tone)
    { freq: 349.23, dur: 1.4 }, // F4
    { freq: 293.66, dur: 1.2 }, // D4
  ];

  let currentSample = 0;
  for (const note of notes) {
    const noteLength = Math.floor(note.dur * sampleRate);
    for (let i = 0; i < noteLength; i++) {
      if (currentSample + i < data.length) {
        const t = i / sampleRate;
        const envelope = Math.sin((Math.PI * i) / noteLength);
        const wave =
          0.6 * Math.sin(2 * Math.PI * note.freq * t) +
          0.25 * Math.sin(4 * Math.PI * note.freq * t) +
          0.15 * Math.sin(6 * Math.PI * note.freq * t);
        data[currentSample + i] = wave * envelope * 0.4;
      }
    }
    currentSample += noteLength;
  }

  // Convert buffer to WAV Blob
  const wavBlob = audioBufferToWavBlob(buffer);
  const dataUrl = await blobToDataUrl(wavBlob);

  return {
    blob: wavBlob,
    dataUrl,
    durationSeconds,
  };
}

/**
 * Encode AudioBuffer to valid PCM WAV Blob
 */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  const channels: Float32Array[] = [];
  let sample: number;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([outBuffer], { type: 'audio/wav' });
}
