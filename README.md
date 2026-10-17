# DiscordStreamEditor

Plugin per [Equicord](https://github.com/Equicord/Equicord) che ti permette di cambiare quasi tutti i parametri della condivisione schermo di Discord.

**Anche senza Nitro puoi streammare con la qualità che vuoi.**

## Cosa puoi cambiare

| Categoria | Opzioni |
|---|---|
| Risoluzione | 144p → 4320p (8K) o altezza personalizzata, oppure quella scelta in Discord |
| Proporzioni | 16:9, 16:10, 21:9, 32:9, 4:3, 5:4, 3:2, 1:1, 9:16 (verticale) o larghezza personalizzata |
| FPS | 5 → 240 FPS o valore personalizzato (1-360) |
| Bitrate | Automatico (bit per pixel), manuale (minimo / target / massimo in kbps) o quello di Discord |
| Encoder | Intervallo keyframe, blocco della riduzione FPS quando sei inattivo, dimensioni pari |
| Codec | Disattiva AV1, H265, H264, VP8, VP9 |
| Sblocchi | Qualità Nitro senza Nitro, niente requisiti di boost del server, qualsiasi combinazione risoluzione/FPS |
| Web / Vesktop | Limite bitrate nell'SDP e audio dello stream in stereo |

Le modifiche si applicano **in tempo reale** allo stream in corso (opzione "Live apply"), oppure col pulsante
"Apply to current stream" nelle impostazioni del plugin.

### Comando rapido

```
/streameditor resolution:1440 fps:120 bitrate:12000 width:2560
```

Tutte le opzioni sono facoltative: senza opzioni mostra le impostazioni attuali.
`0` rimette il valore predefinito (risoluzione/FPS di Discord, bitrate automatico, 16:9).

## Installazione

1. Clona Equicord e installa le dipendenze ([guida](https://docs.equicord.org/building-from-source)).
2. Clona questa repo dentro `src/userplugins`:
   ```sh
   cd Equicord/src/userplugins
   git clone https://github.com/centoventotto/DiscordStreamEditor discordStreamEditor
   ```
3. `pnpm build` e `pnpm inject`, poi riavvia Discord e attiva **DiscordStreamEditor**.

## Note

- Risoluzioni, FPS e bitrate molto alti richiedono una buona connessione in upload e un encoder abbastanza potente; chi guarda ha bisogno di abbastanza banda in download.
- Se usi FakeNitro, StreamingCodecDisabler, LimitlessScreenshare, EquibopStreamFixes o WebScreenShareFixes, il plugin salta automaticamente le patch che quei plugin applicano già, così non vanno in conflitto.
- Le opzioni contrassegnate con "restart" richiedono il riavvio di Discord.

## Licenza

[GPL-3.0-or-later](LICENSE)
