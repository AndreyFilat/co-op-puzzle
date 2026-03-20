import { applyRoomAction, createInitialRoom } from './roomReducer';
function roomStateStorageKey(roomId) {
    return `coop_room_${roomId}_state_v1`;
}
function roomPresenceStorageKey(roomId) {
    return `coop_room_${roomId}_presence_v1`;
}
class SharedRoomAdapter {
    state;
    listeners = [];
    roomId;
    self;
    channel;
    presence = new Map();
    constructor(roomId, self) {
        this.roomId = roomId;
        this.self = self;
        const storedState = this.loadStateFromStorage(roomId);
        const storedPresence = this.loadPresenceFromStorage(roomId);
        const nowMs = Date.now();
        this.presence = new Map(storedPresence);
        // Ensure self is present.
        this.presence.set(self.id, { player: self, lastSeenAtMs: nowMs });
        const initialGameState = storedState
            ? storedState.game
            : createInitialRoom(roomId, nowMs, self).game;
        this.state = {
            roomId,
            game: initialGameState,
            // players will be injected via getOrderedPlayers().
            players: [],
            recentActions: storedState ? storedState.recentActions : [],
        };
        // Inject players ordering so App's `players[0]` becomes local player.
        this.state = { ...this.state, players: this.getOrderedPlayers() };
        // Broadcast channel for immediate sync.
        this.channel = new BroadcastChannel(`coop_room_${roomId}`);
        this.channel.onmessage = (ev) => {
            const msg = ev.data;
            if (!msg || msg.roomId !== this.roomId)
                return;
            this.onMessage(msg);
        };
        // Announce presence + start heartbeats.
        this.sendPresenceNow();
        this.startPresenceHeartbeats();
        this.startPresencePruner();
        // Persist initial.
        this.savePresenceToStorage();
        this.saveStateToStorage();
    }
    loadStateFromStorage(roomId) {
        try {
            const raw = localStorage.getItem(roomStateStorageKey(roomId));
            if (!raw)
                return null;
            const parsed = JSON.parse(raw);
            if (!parsed || parsed.roomId !== roomId)
                return null;
            // Basic shape check.
            if (!parsed.game || !Array.isArray(parsed.recentActions))
                return null;
            return parsed;
        }
        catch {
            return null;
        }
    }
    loadPresenceFromStorage(roomId) {
        try {
            const raw = localStorage.getItem(roomPresenceStorageKey(roomId));
            if (!raw)
                return [];
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object')
                return [];
            return Object.entries(parsed).map(([k, v]) => [k, v]);
        }
        catch {
            return [];
        }
    }
    savePresenceToStorage() {
        try {
            const obj = {};
            for (const [id, entry] of this.presence.entries())
                obj[id] = entry;
            localStorage.setItem(roomPresenceStorageKey(this.roomId), JSON.stringify(obj));
        }
        catch {
            // ignore
        }
    }
    saveStateToStorage() {
        try {
            localStorage.setItem(roomStateStorageKey(this.roomId), JSON.stringify(this.state));
        }
        catch {
            // ignore
        }
    }
    getOrderedPlayers(basePlayers = this.state.players) {
        // Keep local player at index 0 so App highlights "(You)".
        const lastById = new Map(basePlayers.map((p) => [p.id, p.lastActionAtMs]));
        const all = [...this.presence.values()].map((e) => e.player);
        all.sort((a, b) => {
            if (a.id === this.self.id)
                return -1;
            if (b.id === this.self.id)
                return 1;
            // stable-ish ordering: by joinedAt
            return a.joinedAtMs - b.joinedAtMs;
        });
        return all.map((p) => {
            const lastActionAtMs = lastById.get(p.id);
            return lastActionAtMs == null ? p : { ...p, lastActionAtMs };
        });
    }
    emit() {
        for (const l of this.listeners)
            l(this.state);
    }
    subscribe(listener) {
        this.listeners.push(listener);
        listener(this.state);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    dispatch(action) {
        // Preserve our current ordered presence list while mutating shared game state.
        const next = applyRoomAction({ ...this.state, players: this.getOrderedPlayers(this.state.players) }, action);
        if (next !== this.state) {
            // Apply presence ordering again (reducer doesn't touch players for rotate/restart/next).
            this.state = { ...next, players: this.getOrderedPlayers(next.players) };
            this.saveStateToStorage();
            this.broadcastState();
            this.emit();
        }
    }
    getDebug() {
        return {
            adapterType: 'local', // UI doesn't care; keep stable shape
            roomId: this.roomId,
            status: 'connected',
            playerCount: this.state.players.length,
        };
    }
    broadcastState() {
        const msg = { type: 'state', roomId: this.roomId, state: this.state };
        this.channel.postMessage(msg);
    }
    sendPresenceNow() {
        const now = Date.now();
        const msg = { type: 'presence', roomId: this.roomId, player: this.self, lastSeenAtMs: now };
        this.presence.set(this.self.id, { player: this.self, lastSeenAtMs: now });
        this.savePresenceToStorage();
        this.channel.postMessage(msg);
        // Update local state players ordering immediately.
        this.state = { ...this.state, players: this.getOrderedPlayers(this.state.players) };
        this.saveStateToStorage();
        this.broadcastState();
        this.emit();
    }
    startPresenceHeartbeats() {
        window.setInterval(() => this.sendPresenceNow(), 2000);
    }
    startPresencePruner() {
        // Remove stale tabs that stopped heartbeating.
        window.setInterval(() => {
            const now = Date.now();
            let changed = false;
            for (const [id, entry] of this.presence.entries()) {
                if (now - entry.lastSeenAtMs > 6000) {
                    this.presence.delete(id);
                    changed = true;
                }
            }
            if (changed) {
                this.savePresenceToStorage();
                this.state = { ...this.state, players: this.getOrderedPlayers(this.state.players) };
                this.saveStateToStorage();
                this.broadcastState();
                this.emit();
            }
        }, 1500);
    }
    onMessage(msg) {
        if (msg.type === 'presence') {
            const now = Date.now();
            this.presence.set(msg.player.id, { player: msg.player, lastSeenAtMs: now });
            this.state = { ...this.state, players: this.getOrderedPlayers(this.state.players) };
            this.savePresenceToStorage();
            // Do not override game state; only broadcast updated players list.
            this.saveStateToStorage();
            this.emit();
            return;
        }
        if (msg.type === 'state') {
            // Update shared game/recentActions from the other tab,
            // but keep our current ordered presence list for correct "(You)" selection.
            this.state = { ...msg.state, roomId: this.roomId, players: this.getOrderedPlayers(msg.state.players) };
            this.saveStateToStorage();
            this.emit();
        }
    }
}
function reorderPlayersSelfFirst(players, selfId) {
    const copy = [...players];
    copy.sort((a, b) => {
        if (a.id === selfId)
            return -1;
        if (b.id === selfId)
            return 1;
        return a.joinedAtMs - b.joinedAtMs;
    });
    return copy;
}
class PartyKitRoomAdapter {
    listeners = [];
    state;
    ws = null;
    connected = false;
    roomId;
    self;
    onConnected;
    constructor(roomId, self, onConnected) {
        this.roomId = roomId;
        this.self = self;
        this.onConnected = onConnected;
        const nowMs = Date.now();
        this.state = createInitialRoom(roomId, nowMs, self);
    }
    subscribe(listener) {
        this.listeners.push(listener);
        listener(this.state);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    emit() {
        for (const l of this.listeners)
            l(this.state);
    }
    safeSetState(next) {
        // Keep local player at index 0 for "(You)" selection.
        this.state = { ...next, players: reorderPlayersSelfFirst(next.players, this.self.id) };
        this.emit();
    }
    dispatch(action) {
        const ws = this.ws;
        if (!ws || !this.connected)
            return;
        console.log('[partykit] send action', action.type);
        const env = { type: 'action', action };
        ws.send(JSON.stringify(env));
    }
    getDebug() {
        return {
            adapterType: 'local', // keep UI stable (it doesn't actually use this).
            roomId: this.roomId,
            status: 'connected',
            playerCount: this.state.players.length,
        };
    }
    connectToUrl(url) {
        try {
            console.log('[partykit] connecting', { url, roomId: this.roomId });
            const ws = new WebSocket(url);
            this.ws = ws;
            ws.onopen = () => {
                this.connected = true;
                // Join room so the server can initialize RoomState with correct player identity.
                const join = { type: 'JOIN_ROOM', player: this.self, atMs: Date.now() };
                this.dispatch(join);
                this.onConnected();
            };
            ws.onmessage = (ev) => {
                const raw = ev.data;
                const text = typeof raw === 'string' ? raw : raw?.toString?.() ?? '';
                if (!text)
                    return;
                let parsed = null;
                try {
                    parsed = JSON.parse(text);
                }
                catch {
                    return;
                }
                if (!parsed || parsed.type !== 'state')
                    return;
                console.log('[partykit] received state', { roomId: parsed.roomId });
                this.safeSetState(parsed.state);
            };
            ws.onerror = () => {
                console.log('[partykit] websocket error');
            };
            ws.onclose = () => {
                this.connected = false;
                console.log('[partykit] websocket closed');
            };
        }
        catch (e) {
            console.log('[partykit] connect failed', e);
        }
    }
    connect(urlOrCandidates) {
        this.connectToUrl(Array.isArray(urlOrCandidates) ? urlOrCandidates[0] : urlOrCandidates);
    }
}
class FallbackRoomAdapter {
    local;
    party = null;
    active = 'local';
    listeners = [];
    constructor(local) {
        this.local = local;
    }
    subscribe(listener) {
        this.listeners.push(listener);
        // Forward initial local state.
        return this.local.subscribe((s) => {
            if (this.active === 'local') {
                for (const l of this.listeners)
                    l(s);
            }
        });
    }
    dispatch(action) {
        if (this.active === 'partykit' && this.party)
            this.party.dispatch(action);
        else
            this.local.dispatch(action);
    }
    getDebug() {
        return this.active === 'partykit' && this.party ? this.party.getDebug() : this.local.getDebug();
    }
    getPartyKitBaseWsUrl() {
        const envHostRaw = import.meta.env.VITE_PARTYKIT_HOST;
        const trimmed = envHostRaw?.trim();
        if (!trimmed)
            return 'ws://localhost:1999';
        if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://'))
            return trimmed.replace(/\/+$/, '');
        if (trimmed.startsWith('http://'))
            return `ws://${trimmed.slice('http://'.length).replace(/\/+$/, '')}`;
        if (trimmed.startsWith('https://'))
            return `wss://${trimmed.slice('https://'.length).replace(/\/+$/, '')}`;
        return `wss://${trimmed.replace(/\/+$/, '')}`;
    }
    tryConnectPartyKit(args) {
        const partyKitName = 'coop_puzzle';
        const baseWsUrl = this.getPartyKitBaseWsUrl();
        const wsUrl = `${baseWsUrl}/parties/${partyKitName}/${args.roomId}`;
        const onConnected = () => {
            this.active = 'partykit';
        };
        const party = new PartyKitRoomAdapter(args.roomId, args.self, onConnected);
        party.subscribe((s) => {
            if (this.active === 'partykit') {
                for (const l of this.listeners)
                    l(s);
            }
        });
        this.party = party;
        party.connect(wsUrl);
    }
}
export function createRoomAdapter(roomId, playerName, playerId, playerColor) {
    const nowMs = Date.now();
    const fallbackNumeric = (() => {
        const sum = Array.from(playerId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        return (sum % 98) + 1;
    })();
    const self = {
        id: playerId,
        name: playerName === '__ANON__' ? `Player ${fallbackNumeric}` : playerName,
        color: playerColor,
        joinedAtMs: nowMs,
    };
    const local = new SharedRoomAdapter(roomId, self);
    const wrapper = new FallbackRoomAdapter(local);
    // Try PartyKit connection; if it doesn't connect, wrapper remains local.
    wrapper.tryConnectPartyKit({ roomId, self });
    return wrapper;
}
