/**
 * Full-mesh WebRTC rooms: one RTCPeerConnection per remote peer, signaled
 * through /api/rtc. Gravity Switch does not use multiplayer; this module is
 * kept so the template lib typechecks.
 */

export type SignalKind = "offer" | "answer" | "ice";

export interface PeerRow {
  id: string;
  name: string;
}
export interface SignalRow {
  id: number;
  from: string;
  kind: SignalKind;
  payload: unknown;
}
export interface RtcPollResponse {
  peers: PeerRow[];
  signals: SignalRow[];
}

export interface PeerInfo {
  id: string;
  name: string;
  connectionState: RTCPeerConnectionState;
  candidateType: string | null;
  rttMs: number | null;
}

export interface P2PRoomOptions {
  room: string;
  selfId: string;
  name?: string;
  iceServers?: RTCIceServer[];
  onPeersChanged?: (peers: PeerInfo[]) => void;
  onMessage?: (from: string, data: unknown, channel: "state" | "reliable") => void;
  onConnected?: () => void;
}

export function defaultIceServers(): RTCIceServer[] {
  return [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"],
    },
  ];
}

export class P2PRoom {
  constructor(private readonly opts: P2PRoomOptions) {}

  async join(): Promise<void> {
    this.opts.onConnected?.();
  }

  close(): void {}

  broadcast(_data: unknown): void {}

  send(_data: unknown, _peerId?: string): void {}

  peerList(): PeerInfo[] {
    return [];
  }
}
