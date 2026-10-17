/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { CodecInfo } from "@vencord/discord-types";
import { showToast } from "@webpack/common";

import { CUSTOM, KEEP, settings } from "./settings";

export const logger = new Logger("DiscordStreamEditor");

export interface Dimensions {
    width?: number;
    height?: number;
    framerate?: number;
    pixelCount?: number;
}

export interface GoliveQualityOpts {
    bitrateMin?: number;
    bitrateMax?: number;
    bitrateTarget?: number;
    capture?: Dimensions;
    encode?: Dimensions;
    [key: string]: any;
}

export interface ResolvedQuality {
    width: number;
    height: number;
    framerate: number;
    pixelCount: number;
    /** bits per second, undefined when Discord's own values are kept */
    bitrateMin?: number;
    bitrateTarget?: number;
    bitrateMax?: number;
}

const ASPECT_RATIOS: Record<string, number> = {
    "16:9": 16 / 9,
    "16:10": 16 / 10,
    "21:9": 21 / 9,
    "32:9": 32 / 9,
    "4:3": 4 / 3,
    "5:4": 5 / 4,
    "3:2": 3 / 2,
    "1:1": 1,
    "9:16": 9 / 16
};

// what Discord asked for last time, so the stream can be re-configured live
let lastGolive: { conn: any; raw: GoliveQualityOpts; } | undefined;
let lastEncoding: { conn: any; raw: [number, number, number]; } | undefined;
let lastBase: Dimensions = { width: 1920, height: 1080, framerate: 60 };
let lastApplied: ResolvedQuality | undefined;

export const getLastApplied = () => lastApplied;
export const isStreamConfigured = () => lastGolive != null || lastEncoding != null;

function even(n: number) {
    n = Math.max(2, Math.round(n));
    return settings.store.evenDimensions ? n + (n % 2) : n;
}

function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n));
}

/** Combines what Discord wants (base) with the user's settings */
export function resolveQuality(base: Dimensions = lastBase): ResolvedQuality {
    const s = settings.store;
    const override = s.overrideQuality;

    const baseHeight = base.height || 1080;
    const baseWidth = base.width || Math.round(baseHeight * 16 / 9);

    let height = baseHeight;
    if (override && s.resolution !== KEEP)
        height = s.resolution === CUSTOM ? s.customHeight : s.resolution;

    let width = baseWidth;
    if (override) {
        if (s.aspectRatio === "custom") width = s.customWidth;
        else if (s.aspectRatio in ASPECT_RATIOS) width = height * ASPECT_RATIOS[s.aspectRatio];
        else if (height !== baseHeight) width = baseWidth / baseHeight * height;
    }

    let framerate = base.framerate || 30;
    if (override && s.frameRate !== KEEP)
        framerate = s.frameRate === CUSTOM ? s.customFrameRate : s.frameRate;

    width = even(width);
    height = even(height);
    framerate = clamp(Math.round(framerate), 1, 360);

    const quality: ResolvedQuality = { width, height, framerate, pixelCount: width * height };

    if (s.bitrateMode !== "discord") {
        const min = s.minBitrate * 1000;
        const max = Math.max(min, s.maxBitrate * 1000);
        const target = s.bitrateMode === "manual"
            ? s.targetBitrate * 1000
            : width * height * framerate * s.bitsPerPixel;

        quality.bitrateMin = min;
        quality.bitrateMax = max;
        quality.bitrateTarget = Math.round(clamp(target, min, max));
    }

    return quality;
}

function applyDimensions(target: Dimensions | undefined, q: ResolvedQuality) {
    if (!target) return;
    target.width = q.width;
    target.height = q.height;
    target.framerate = q.framerate;
    target.pixelCount = q.pixelCount;
}

function applyBitrate(opts: GoliveQualityOpts, q: ResolvedQuality, onlyExisting: boolean) {
    if (q.bitrateTarget == null) return;
    opts.bitrateTarget = q.bitrateTarget;
    if (!onlyExisting || "bitrateMin" in opts) opts.bitrateMin = q.bitrateMin;
    if (!onlyExisting || "bitrateMax" in opts) opts.bitrateMax = q.bitrateMax;
}

function cloneOpts(opts: GoliveQualityOpts): GoliveQualityOpts {
    return {
        ...opts,
        capture: opts.capture && { ...opts.capture },
        encode: opts.encode && { ...opts.encode }
    };
}

/** Patched into getDefaultGoliveQuality, the quality a stream starts with */
export function patchDefaultQuality(opts: GoliveQualityOpts) {
    try {
        if (!opts) return opts;

        const q = resolveQuality(opts.encode ?? opts.capture ?? lastBase);
        applyBitrate(opts, q, false);

        if (settings.store.overrideQuality) {
            applyDimensions(opts.encode, q);
            applyDimensions(opts.capture ??= {}, q);
        }
    } catch (e) {
        logger.error("Failed to patch default stream quality", e);
    }
    return opts;
}

/** Patched into setGoliveQuality, called whenever Discord (re)configures the stream */
export function patchGoliveArgs(opts: GoliveQualityOpts, conn: any) {
    try {
        if (!opts) return opts;

        lastGolive = { conn, raw: cloneOpts(opts) };
        const base = opts.encode ?? opts.capture;
        if (base?.height) lastBase = { ...base };

        const q = resolveQuality(base ?? lastBase);
        lastApplied = q;

        const patched = cloneOpts(opts);
        applyBitrate(patched, q, true);
        if (settings.store.overrideQuality) {
            applyDimensions(patched.capture ??= {}, q);
            applyDimensions(patched.encode ??= {}, q);
        }
        return patched;
    } catch (e) {
        logger.error("Failed to patch stream quality", e);
        return opts;
    }
}

/** Patched into setDesktopEncodingOptions (native desktop encoder) */
export function patchEncodingOptions(width: number, height: number, framerate: number, conn: any): [number, number, number] {
    try {
        lastEncoding = { conn, raw: [width, height, framerate] };
        if (!settings.store.overrideQuality) return [width, height, framerate];

        const q = resolveQuality({ width, height, framerate });
        lastApplied = { ...lastApplied, ...q };
        return [q.width, q.height, q.framerate];
    } catch (e) {
        logger.error("Failed to patch desktop encoding options", e);
        return [width, height, framerate];
    }
}

export function getBitrateMin(original: number) {
    return resolveQuality().bitrateMin ?? original;
}

export function getBitrateMax(original: number) {
    return resolveQuality().bitrateMax ?? original;
}

/** Discord's desktop bitrate caps, made live so they follow the settings */
export function makeDesktopBitrateCaps(original: { min: number; max: number; target: number; }) {
    return {
        get min() { return resolveQuality().bitrateMin ?? original.min; },
        get max() { return resolveQuality().bitrateMax ?? original.max; },
        get target() { return resolveQuality().bitrateTarget ?? original.target; }
    };
}

/** value for x-google-max-bitrate (kbps) in the SDP of web clients */
export function getSdpMaxBitrate(original: number) {
    const max = resolveQuality().bitrateMax;
    return max != null ? Math.round(max / 1000) : original;
}

export function getKeyframeInterval() {
    return settings.store.keyframeInterval || 0;
}

export function allowFramerateReduction() {
    return !settings.store.preventFramerateReduction || void 0;
}

export function filterCodecs(codecs: CodecInfo[]) {
    const s = settings.store;
    const disabled: Record<string, boolean> = {
        AV1: s.disableAV1,
        H265: s.disableH265,
        H264: s.disableH264,
        VP8: s.disableVP8,
        VP9: s.disableVP9
    };

    const filtered = codecs.map(c => disabled[c.name] ? { ...c, encode: false } : c);
    // never leave Discord without any encoder, the stream would just fail
    return filtered.some(c => c.encode) ? filtered : codecs;
}

export function formatQuality(q: ResolvedQuality | undefined) {
    if (!q) return "Not streaming";
    const bitrate = q.bitrateTarget != null
        ? `${(q.bitrateTarget / 1000).toLocaleString()} kbps (${(q.bitrateMin! / 1000).toLocaleString()}-${(q.bitrateMax! / 1000).toLocaleString()})`
        : "Discord default";
    return `${q.width}x${q.height} @ ${q.framerate} FPS, ${bitrate}`;
}

/** Re-runs Discord's own stream configuration so the patches apply the new settings */
export function applyNow(silent = false) {
    if (!isStreamConfigured()) {
        if (!silent) showToast("Settings saved, they will be used for your next stream", "message");
        return false;
    }

    try {
        if (lastGolive) lastGolive.conn.setGoliveQuality(cloneOpts(lastGolive.raw));
        if (lastEncoding) lastEncoding.conn.setDesktopEncodingOptions(...lastEncoding.raw);

        if (!silent && settings.store.showToasts)
            showToast(`Stream: ${formatQuality(lastApplied)}`, "success");
        return true;
    } catch (e) {
        logger.error("Failed to apply settings to the current stream", e);
        if (!silent) showToast("Could not update the running stream, restart it to apply", "failure");
        return false;
    }
}

let applyTimeout: ReturnType<typeof setTimeout> | undefined;
export function scheduleApply() {
    if (!settings.store.liveApply) return;
    clearTimeout(applyTimeout);
    applyTimeout = setTimeout(() => applyNow(!isStreamConfigured()), 750);
}

export function resetState() {
    clearTimeout(applyTimeout);
    lastGolive = lastEncoding = lastApplied = undefined;
}
