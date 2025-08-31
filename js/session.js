// Session class for OpenAI Realtime API
class Session {
    constructor(apiKey, streamType) {
        this.apiKey = apiKey || window.electronAPI?.openaiKey;
        this.streamType = streamType;
        this.useSessionToken = true;
        this.ms = null;
        this.pc = null;
        this.dc = null;
        this.muted = false;
        this.events = {};
    }

    // Event system
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    async start(stream, sessionConfig) {
        try {
            // Get microphone stream if not provided
            if (!stream) {
                stream = await window.audioUtils?.getMicrophoneStream();
            }
            
            await this.startInternal(stream, sessionConfig, "/v1/realtime/sessions");
            this.emit('connected');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async startTranscription(stream, sessionConfig) {
        try {
            await this.startInternal(stream, sessionConfig, "/v1/realtime/transcription_sessions");
            this.emit('connected');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    stop() {
        this.dc?.close();
        this.dc = null;
        this.pc?.close();
        this.pc = null;
        this.ms?.getTracks().forEach(t => t.stop());
        this.ms = null;
        this.muted = false;
        this.emit('disconnected');
    }

    mute(muted) {
        this.muted = muted;
        this.pc.getSenders().forEach(sender => sender.track.enabled = !muted);
    }

    async startInternal(stream, sessionConfig, tokenEndpoint) {
        this.ms = stream;
        this.pc = new RTCPeerConnection();
        this.pc.ontrack = (e) => this.ontrack?.(e);
        this.pc.addTrack(stream.getTracks()[0]);
        this.pc.onconnectionstatechange = (state) => {
            this.onconnectionstatechange?.(state);
            if (state === 'connected') {
                this.emit('connected');
            } else if (state === 'disconnected' || state === 'failed') {
                this.emit('disconnected');
            }
        };
        this.dc = this.pc.createDataChannel("");
        this.dc.onopen = (e) => this.onopen?.();
        this.dc.onmessage = (e) => {
            const data = JSON.parse(e.data);
            this.onmessage?.(data);
            
            // Emit transcript events for AI coach
            if (data.type === 'transcript' || data.transcript) {
                this.emit('transcript', {
                    speaker: data.speaker || 'User',
                    text: data.transcript || data.text || '',
                    timestamp: new Date()
                });
            }
        };

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        try {
            const answer = await this.signal(offer, sessionConfig, tokenEndpoint);
            await this.pc.setRemoteDescription(answer);
        } catch (e) {
            this.onerror?.(e);
        }
    }

    async signal(offer, sessionConfig, tokenEndpoint) {
        const urlRoot = "https://api.openai.com";
        const realtimeUrl = `${urlRoot}/v1/realtime`;
        let sdpResponse;
        if (this.useSessionToken) {
            const sessionUrl = `${urlRoot}${tokenEndpoint}`;
            const sessionResponse = await fetch(sessionUrl, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    "openai-beta": "realtime-v1",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(sessionConfig),
            });
            if (!sessionResponse.ok) {
                throw new Error("Failed to request session token");
            }
            const sessionData = await sessionResponse.json();
            const clientSecret = sessionData.client_secret.value;
            sdpResponse = await fetch(`${realtimeUrl}`, {
                method: "POST",
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${clientSecret}`,
                    "Content-Type": "application/sdp"
                },
            });
            if (!sdpResponse.ok) {
                throw new Error("Failed to signal");
            }
        } else {
            const formData = new FormData();
            formData.append("session", JSON.stringify(sessionConfig));
            formData.append("sdp", offer.sdp);
            sdpResponse = await fetch(`${realtimeUrl}`, {
                method: "POST",
                body: formData,
                headers: { Authorization: `Bearer ${this.apiKey}` },
            });
            if (!sdpResponse.ok) {
                throw new Error("Failed to signal");
            }
        }
        return { type: "answer", sdp: await sdpResponse.text() };
    }

    sendMessage(message) {
        this.dc.send(JSON.stringify(message));
    }
}
