/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";

import { settings } from "./settings";
import { applyNow, formatQuality, getLastApplied, isStreamConfigured, resolveQuality } from "./stream";

export function StatusPanel() {
    // re-render whenever any setting changes
    settings.use();

    const streaming = isStreamConfigured();
    const preview = resolveQuality();

    return (
        <Card>
            <Flex flexDirection="column" gap="0.5em">
                <Paragraph size="md" weight="semibold">
                    Without Nitro you can stream at any quality you want: pick resolution, FPS, bitrate and codecs below.
                </Paragraph>
                <Paragraph>
                    <b>Configured:</b> {formatQuality(preview)}
                </Paragraph>
                <Paragraph>
                    <b>Current stream:</b> {streaming ? formatQuality(getLastApplied()) : "Not streaming"}
                </Paragraph>
                <Flex gap="0.5em">
                    <Button size="small" disabled={!streaming} onClick={() => applyNow()}>
                        Apply to current stream
                    </Button>
                </Flex>
                <Paragraph size="xs">
                    Very high resolutions, frame rates or bitrates need a strong upload connection and encoder, and viewers need enough download speed.
                    Use /streameditor in chat for quick changes while you stream.
                </Paragraph>
            </Flex>
        </Card>
    );
}
