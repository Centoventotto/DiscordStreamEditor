/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { StatusPanel } from "./components";
import { scheduleApply } from "./stream";

export const KEEP = 0;
export const CUSTOM = -1;

const liveApply = () => scheduleApply();

export const settings = definePluginSettings({
    statusPanel: {
        type: OptionType.COMPONENT,
        component: () => <StatusPanel />
    },

    // General

    overrideQuality: {
        type: OptionType.BOOLEAN,
        description: "Force the resolution / FPS / aspect ratio configured below, ignoring what you pick in Discord's stream menu",
        default: true,
        onChange: liveApply
    },
    liveApply: {
        type: OptionType.BOOLEAN,
        description: "Apply changes to the running stream immediately when you edit a setting",
        default: true
    },
    showToasts: {
        type: OptionType.BOOLEAN,
        description: "Show a toast when new stream settings are applied",
        default: true
    },
    unlockNitroQuality: {
        type: OptionType.BOOLEAN,
        description: "Unlock every stream quality option without Nitro (skipped if FakeNitro already does it)",
        default: true,
        restartNeeded: true
    },
    removeBoostRequirements: {
        type: OptionType.BOOLEAN,
        description: "Remove the server boost requirements from the stream FPS options",
        default: true,
        restartNeeded: true
    },
    removeComboRestrictions: {
        type: OptionType.BOOLEAN,
        description: "Allow every resolution / FPS combination (e.g. above 720p at 60 FPS) and skip Discord's \"can you stream with these settings\" check",
        default: true,
        restartNeeded: true
    },

    // Resolution

    resolution: {
        type: OptionType.SELECT,
        description: "Stream resolution (height)",
        options: [
            { label: "Keep Discord's selection", value: KEEP },
            { label: "144p", value: 144 },
            { label: "240p", value: 240 },
            { label: "360p", value: 360 },
            { label: "480p", value: 480 },
            { label: "540p", value: 540 },
            { label: "720p (HD)", value: 720 },
            { label: "900p", value: 900 },
            { label: "1080p (Full HD)", value: 1080, default: true },
            { label: "1200p", value: 1200 },
            { label: "1440p (2K)", value: 1440 },
            { label: "1600p", value: 1600 },
            { label: "2160p (4K)", value: 2160 },
            { label: "2880p (5K)", value: 2880 },
            { label: "4320p (8K)", value: 4320 },
            { label: "Custom", value: CUSTOM }
        ],
        onChange: liveApply
    },
    customHeight: {
        type: OptionType.NUMBER,
        description: "Custom resolution height in pixels (used when resolution is \"Custom\")",
        default: 1080,
        isValid: (v: number) => v >= 16 && v <= 8640 || "Must be between 16 and 8640",
        disabled: () => settings.store.resolution !== CUSTOM,
        onChange: liveApply
    },
    aspectRatio: {
        type: OptionType.SELECT,
        description: "Aspect ratio used to calculate the stream width",
        options: [
            { label: "Keep Discord's / source ratio", value: "keep" },
            { label: "16:9 (standard)", value: "16:9", default: true },
            { label: "16:10", value: "16:10" },
            { label: "21:9 (ultrawide)", value: "21:9" },
            { label: "32:9 (super ultrawide)", value: "32:9" },
            { label: "4:3", value: "4:3" },
            { label: "5:4", value: "5:4" },
            { label: "3:2", value: "3:2" },
            { label: "1:1 (square)", value: "1:1" },
            { label: "9:16 (vertical)", value: "9:16" },
            { label: "Custom width", value: "custom" }
        ],
        onChange: liveApply
    },
    customWidth: {
        type: OptionType.NUMBER,
        description: "Custom resolution width in pixels (used when aspect ratio is \"Custom width\")",
        default: 1920,
        isValid: (v: number) => v >= 16 && v <= 15360 || "Must be between 16 and 15360",
        disabled: () => settings.store.aspectRatio !== "custom",
        onChange: liveApply
    },
    evenDimensions: {
        type: OptionType.BOOLEAN,
        description: "Round width and height to even numbers (most encoders require it)",
        default: true,
        onChange: liveApply
    },

    // Frame rate

    frameRate: {
        type: OptionType.SELECT,
        description: "Stream frame rate",
        options: [
            { label: "Keep Discord's selection", value: KEEP },
            { label: "5 FPS", value: 5 },
            { label: "10 FPS", value: 10 },
            { label: "15 FPS", value: 15 },
            { label: "24 FPS (cinema)", value: 24 },
            { label: "25 FPS (PAL)", value: 25 },
            { label: "30 FPS", value: 30 },
            { label: "48 FPS", value: 48 },
            { label: "50 FPS", value: 50 },
            { label: "60 FPS", value: 60, default: true },
            { label: "75 FPS", value: 75 },
            { label: "90 FPS", value: 90 },
            { label: "100 FPS", value: 100 },
            { label: "120 FPS", value: 120 },
            { label: "144 FPS", value: 144 },
            { label: "165 FPS", value: 165 },
            { label: "240 FPS", value: 240 },
            { label: "Custom", value: CUSTOM }
        ],
        onChange: liveApply
    },
    customFrameRate: {
        type: OptionType.NUMBER,
        description: "Custom frame rate (used when frame rate is \"Custom\")",
        default: 60,
        isValid: (v: number) => v >= 1 && v <= 360 || "Must be between 1 and 360",
        disabled: () => settings.store.frameRate !== CUSTOM,
        onChange: liveApply
    },
    preventFramerateReduction: {
        type: OptionType.BOOLEAN,
        description: "Stop Discord from lowering the stream frame rate when you are idle / not speaking",
        default: true
    },

    // Bitrate

    bitrateMode: {
        type: OptionType.SELECT,
        description: "How the video bitrate is chosen",
        options: [
            { label: "Automatic (based on resolution x FPS x bits per pixel)", value: "auto", default: true },
            { label: "Manual (use the values below)", value: "manual" },
            { label: "Discord default", value: "discord" }
        ],
        onChange: liveApply
    },
    bitsPerPixel: {
        type: OptionType.SLIDER,
        description: "Bits per pixel for automatic bitrate (higher = sharper, needs more upload)",
        markers: [0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.15, 0.2, 0.25, 0.3],
        default: 0.1,
        stickToMarkers: false,
        disabled: () => settings.store.bitrateMode !== "auto",
        onChange: liveApply
    },
    targetBitrate: {
        type: OptionType.NUMBER,
        description: "Target video bitrate in kbps (manual mode)",
        default: 8000,
        isValid: (v: number) => v >= 100 || "Must be at least 100 kbps",
        disabled: () => settings.store.bitrateMode !== "manual",
        onChange: liveApply
    },
    minBitrate: {
        type: OptionType.NUMBER,
        description: "Minimum video bitrate in kbps (Discord never goes below this)",
        default: 1500,
        isValid: (v: number) => v >= 50 || "Must be at least 50 kbps",
        disabled: () => settings.store.bitrateMode === "discord",
        onChange: liveApply
    },
    maxBitrate: {
        type: OptionType.NUMBER,
        description: "Maximum video bitrate in kbps",
        default: 25000,
        isValid: (v: number) => v >= 100 || "Must be at least 100 kbps",
        disabled: () => settings.store.bitrateMode === "discord",
        onChange: liveApply
    },

    // Encoder

    keyframeInterval: {
        type: OptionType.NUMBER,
        description: "Keyframe interval in ms (0 = encoder default). Lower = faster recovery from artifacts, higher = better compression",
        default: 0,
        isValid: (v: number) => v >= 0 || "Cannot be negative"
    },
    disableAV1: {
        type: OptionType.BOOLEAN,
        description: "Do not use the AV1 codec for streams and camera",
        default: false
    },
    disableH265: {
        type: OptionType.BOOLEAN,
        description: "Do not use the H265 (HEVC) codec for streams and camera",
        default: false
    },
    disableH264: {
        type: OptionType.BOOLEAN,
        description: "Do not use the H264 codec for streams and camera",
        default: false
    },
    disableVP8: {
        type: OptionType.BOOLEAN,
        description: "Do not use the VP8 codec for streams and camera",
        default: false
    },
    disableVP9: {
        type: OptionType.BOOLEAN,
        description: "Do not use the VP9 codec for streams and camera",
        default: false
    },

    // Web / Vesktop only

    stereoStreamAudio: {
        type: OptionType.BOOLEAN,
        description: "Send stream audio in stereo (browser / Vesktop only, skipped if WebScreenShareFixes is enabled)",
        default: true,
        restartNeeded: true,
        target: "WEB"
    }
});
