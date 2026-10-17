/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { isPluginEnabled } from "@api/PluginManager";
import { Settings } from "@api/Settings";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";

import { CUSTOM, settings } from "./settings";
import * as stream from "./stream";
import { applyNow, formatQuality, getLastApplied, isStreamConfigured, resetState, resolveQuality } from "./stream";

// skip the patches another enabled plugin already applies, two plugins patching the same code breaks one of them
const fakeNitroUnlocksStream = () => isPluginEnabled("FakeNitro") && Settings.plugins.FakeNitro?.enableStreamQualityBypass !== false;
const equibopFixesEnabled = () => isPluginEnabled("EquibopStreamFixes");
const equibopUnlocksStream = () => equibopFixesEnabled() && Settings.plugins.EquibopStreamFixes?.unlockQualityOptions !== false;

export default definePlugin({
    name: "DiscordStreamEditor",
    description: "Change almost every parameter of your screen share: resolution, aspect ratio, FPS, bitrate, keyframes, codecs and more. Stream at any quality you want, even without Nitro.",
    tags: ["Voice", "Utility"],
    authors: [{ name: "centoventotto", id: 838808975558311948n }],
    settings,

    patches: [
        // Stream quality (resolution, fps, bitrate) for the whole lifetime of the stream
        {
            find: "this.getDefaultGoliveQuality()",
            replacement: [
                {
                    match: /this\.getDefaultGoliveQuality\(\)/,
                    replace: "$self.stream.patchDefaultQuality($&)"
                },
                {
                    match: /setGoliveQuality\((\i)\)\{/,
                    replace: "$&$1=$self.stream.patchGoliveArgs($1,this);"
                },
                {
                    match: /(\i)\.encodingVideoMinBitRate=(\i)\.bitrateMin,(\i)\.encodingVideoMaxBitRate=(\i)\.bitrateMax/,
                    replace: "$1.encodingVideoMinBitRate=$self.stream.getBitrateMin($2.bitrateMin),$3.encodingVideoMaxBitRate=$self.stream.getBitrateMax($4.bitrateMax)",
                    predicate: () => !equibopFixesEnabled()
                }
            ]
        },
        // Native desktop encoder resolution / fps and keyframe interval
        {
            find: "}setDesktopEncodingOptions(",
            predicate: () => !equibopFixesEnabled(),
            replacement: [
                {
                    match: /setDesktopEncodingOptions\((\i),(\i),(\i)\)\{/,
                    replace: "$&[$1,$2,$3]=$self.stream.patchEncodingOptions($1,$2,$3,this);"
                },
                {
                    match: /keyframeInterval=0/,
                    replace: "keyframeInterval=$self.stream.getKeyframeInterval()"
                }
            ]
        },
        // Discord's built in desktop bitrate caps (500kbps min, 3.5Mbps max, 600kbps target)
        {
            find: "desktopBitrate:{",
            predicate: () => !equibopFixesEnabled(),
            replacement: {
                match: /desktopBitrate:(\{min:[^,}]+,max:[^,}]+,target:[^,}]+\})/,
                replace: "desktopBitrate:$self.stream.makeDesktopBitrateCaps($1)"
            }
        },
        // Lower fps when idle
        {
            find: "Reduced framerate after",
            predicate: () => !equibopFixesEnabled(),
            replacement: {
                match: /this\.framerateReductionTimeout=setTimeout/,
                replace: "this.framerateReductionTimeout=$self.stream.allowFramerateReduction()&&setTimeout"
            }
        },
        // Codec selection
        {
            find: "lastOverrideCodecDenylist.length",
            predicate: () => !isPluginEnabled("StreamingCodecDisabler"),
            replacement: {
                match: /(let \i=)(\i\(\i\))(?=,\i=this\.lastOverrideCodecDenylist\.length)/,
                replace: "$1$self.stream.filterCodecs($2)"
            }
        },
        // Nitro check for stream quality
        {
            find: "canUseCustomStickersEverywhere:",
            predicate: () => settings.store.unlockNitroQuality && !fakeNitroUnlocksStream() && !equibopUnlocksStream(),
            replacement: [
                {
                    match: /(?<=canUseHighVideoUploadQuality:function\(\i\)\{)/,
                    replace: "return true;"
                },
                {
                    match: /(?<=canStreamQuality:function\(\i,\i\)\{)/,
                    replace: "return true;"
                }
            ]
        },
        // Server boost requirements on the fps options
        {
            find: "#{intl::STREAM_FPS_OPTION}",
            predicate: () => settings.store.removeBoostRequirements && !fakeNitroUnlocksStream() && !equibopUnlocksStream(),
            replacement: {
                match: /guildPremiumTier:\i\.\i\.TIER_\d,?/g,
                replace: ""
            }
        },
        // "Can you stream with these settings" check
        {
            find: '"canStreamWithSettings"',
            predicate: () => settings.store.removeComboRestrictions && !isPluginEnabled("LimitlessScreenshare"),
            replacement: {
                match: /(?=if\(\i===\i\.\i.PRESET_AUTO\))/,
                replace: "return !0;"
            }
        },
        // Resolutions above 720p are blocked at 60 fps
        {
            find: ",setIsForceShowSharingPopout:",
            predicate: () => settings.store.removeComboRestrictions && !equibopFixesEnabled(),
            replacement: {
                match: /\i!==\i\.\i\.RESOLUTION_720\|\|\i===\i\.\i\.FPS_60/,
                replace: "true"
            }
        },
        // Browser / Vesktop: bitrate limit in the SDP and stereo stream audio
        {
            find: "x-google-max-bitrate",
            predicate: () => !isPluginEnabled("WebScreenShareFixes"),
            replacement: [
                {
                    match: /`x-google-max-bitrate=\$\{(\i)\}`/,
                    replace: '"x-google-max-bitrate="+$self.stream.getSdpMaxBitrate($1)'
                },
                {
                    match: /;usedtx=\$\{(\i)\?"0":"1"\}/,
                    replace: '$&${$1?";stereo=1;sprop-stereo=1":""}',
                    predicate: () => settings.store.stereoStreamAudio
                }
            ]
        }
    ],

    commands: [
        {
            name: "streameditor",
            description: "Change your stream quality (no options = show current settings)",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "resolution",
                    description: "Height in pixels, e.g. 720, 1080, 1440, 2160 (0 = keep Discord's)",
                    type: ApplicationCommandOptionType.INTEGER,
                    required: false
                },
                {
                    name: "fps",
                    description: "Frame rate, e.g. 30, 60, 120, 144 (0 = keep Discord's)",
                    type: ApplicationCommandOptionType.INTEGER,
                    required: false
                },
                {
                    name: "bitrate",
                    description: "Target bitrate in kbps, switches to manual bitrate (0 = automatic)",
                    type: ApplicationCommandOptionType.INTEGER,
                    required: false
                },
                {
                    name: "width",
                    description: "Width in pixels, switches the aspect ratio to custom (0 = 16:9)",
                    type: ApplicationCommandOptionType.INTEGER,
                    required: false
                }
            ],
            execute(args, ctx) {
                const resolution = findOption<number>(args, "resolution");
                const fps = findOption<number>(args, "fps");
                const bitrate = findOption<number>(args, "bitrate");
                const width = findOption<number>(args, "width");
                const s = settings.store;
                const errors: string[] = [];

                if (resolution != null) {
                    if (resolution === 0) s.resolution = 0;
                    else if (resolution < 16 || resolution > 8640) errors.push("Resolution must be between 16 and 8640");
                    else {
                        s.resolution = CUSTOM;
                        s.customHeight = resolution;
                    }
                }
                if (fps != null) {
                    if (fps === 0) s.frameRate = 0;
                    else if (fps < 1 || fps > 360) errors.push("FPS must be between 1 and 360");
                    else {
                        s.frameRate = CUSTOM;
                        s.customFrameRate = fps;
                    }
                }
                if (bitrate != null) {
                    if (bitrate === 0) s.bitrateMode = "auto";
                    else if (bitrate < 100) errors.push("Bitrate must be at least 100 kbps");
                    else {
                        s.bitrateMode = "manual";
                        s.targetBitrate = bitrate;
                        if (s.maxBitrate < bitrate) s.maxBitrate = bitrate;
                        if (s.minBitrate > bitrate) s.minBitrate = bitrate;
                    }
                }
                if (width != null) {
                    if (width === 0) s.aspectRatio = "16:9";
                    else if (width < 16 || width > 15360) errors.push("Width must be between 16 and 15360");
                    else {
                        s.aspectRatio = "custom";
                        s.customWidth = width;
                    }
                }

                const changed = [resolution, fps, bitrate, width].some(v => v != null);
                if (changed) s.overrideQuality = true;
                const applied = changed && applyNow(true);

                const lines = [
                    ...errors.map(e => `> ❌ ${e}`),
                    `> **Configured:** ${formatQuality(resolveQuality())}`,
                    `> **Current stream:** ${isStreamConfigured() ? formatQuality(getLastApplied()) : "Not streaming"}`
                ];
                if (changed) lines.push(applied ? "> ✅ Applied to the running stream" : "> Saved, it will be used for your next stream");

                sendBotMessage(ctx.channel.id, { content: lines.join("\n") });
            }
        }
    ],

    flux: {
        STREAM_STOP: () => resetState(),
        STREAM_DELETE({ streamKey }: { streamKey: string; }) {
            if (streamKey?.endsWith(UserStore.getCurrentUser()?.id)) resetState();
        }
    },

    stop() {
        resetState();
    },

    // used by the patches as $self.stream.*
    stream
});
