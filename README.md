# DiscordStreamEditor

An [Equicord](https://github.com/Equicord/Equicord) plugin that lets you change almost every parameter of Discord's screen share.

**Even without Nitro you can stream at whatever quality you want.**

## What you can change

| Category | Options |
|---|---|
| Resolution | 144p → 4320p (8K) or a custom height, or keep the one picked in Discord |
| Aspect ratio | 16:9, 16:10, 21:9, 32:9, 4:3, 5:4, 3:2, 1:1, 9:16 (vertical) or a custom width |
| FPS | 5 → 240 FPS or a custom value (1-360) |
| Bitrate | Automatic (bits per pixel), manual (min / target / max in kbps) or Discord's default |
| Encoder | Keyframe interval, no frame rate reduction when you're idle, even dimensions |
| Codecs | Disable AV1, H265, H264, VP8, VP9 |
| Unlocks | Nitro quality without Nitro, no server boost requirements, any resolution/FPS combination |
| Web / Vesktop | SDP bitrate limit and stereo stream audio |

Changes are applied **live** to the running stream ("Live apply" option), or with the
"Apply to current stream" button in the plugin settings.

### Quick command

```
/streameditor resolution:1440 fps:120 bitrate:12000 width:2560
```

All options are optional: with no options it shows the current settings.
`0` resets a value to its default (Discord's resolution/FPS, automatic bitrate, 16:9).

## Installation

1. Clone Equicord and install its dependencies ([guide](https://docs.equicord.org/building-from-source)).
2. Clone this repo into `src/userplugins`:
   ```sh
   cd Equicord/src/userplugins
   git clone https://github.com/centoventotto/DiscordStreamEditor discordStreamEditor
   ```
   Or download `discordStreamEditor.zip` from the [releases](https://github.com/Centoventotto/DiscordStreamEditor/releases) and extract it there.
3. Run `pnpm build` and `pnpm inject`, then restart Discord and enable **DiscordStreamEditor**.

## Notes

- Very high resolutions, frame rates and bitrates need a good upload connection and a powerful enough encoder; viewers need enough download bandwidth.
- If you use FakeNitro, StreamingCodecDisabler, LimitlessScreenshare, EquibopStreamFixes or WebScreenShareFixes, the plugin automatically skips the patches those plugins already apply, so they don't conflict.
- Options marked "restart" require restarting Discord.

## License

[GPL-3.0-or-later](LICENSE)
