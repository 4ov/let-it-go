/// <reference lib="webworker" />
import { z } from "https://deno.land/x/zod@v3.20.5/mod.ts";
import mitt from "https://esm.sh/mitt@3.0.0";
import {
    getInfo,
    downloadFromInfo,
    getAuthor,
    getVideoID,
} from "https://deno.land/x/ytdl_core@v0.1.2/mod.ts";
import ID3Writer from "https://esm.sh/browser-id3-writer@4.4.0";
import bot from "./bot.ts";
import { InputFile } from "https://deno.land/x/grammy@v1.12.0/mod.ts";

const events = mitt();

const requests = new Map<
    string,
    {
        ctrl: AbortController;
        ids: (string | number)[];
    }
>();

const Message = z.object({
    type: z.literal("update"),
    data: z.any(),
});

// ----------

async function blobbalbe(stream: ReadableStream<Uint8Array>) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return new Blob(chunks);
}

bot.on("::url", async (ctx) => {
    try {
        const requestId = Math.random().toString(36).slice(3, 9);
        const aborter = new AbortController();
        aborter.signal.addEventListener("abort", (ev) => {
            throw new Error("You did it");
        });
        const link = ctx.msg
            .entities!.filter((e) => e.type === "url")
            .map((e) => ctx.msg.text!.slice(e.offset, e.offset + e.length))
            .at(0) as string;
        const id = getVideoID(link);
        const dlMsg = await ctx.reply("Incoming...", {
            // reply_markup: {
            //     inline_keyboard: [
            //         [
            //             {
            //                 callback_data: `cancel-${requestId}`,
            //                 text: "Cancel",
            //             },
            //         ],
            //     ],
            // },
        });
        requests.set(requestId, {
            ctrl: aborter,
            ids: [ctx.message!.message_id!, dlMsg.message_id],
        });

        const info = await process(id, aborter.signal);
        await ctx.api.editMessageText(
            ctx.msg.chat.id,
            dlMsg.message_id,
            "Uploading..."
        );
        await ctx.replyWithAudio(
            new InputFile(info.blob),
            {
                title: info.title,
                performer: info.author?.name,
                thumb: info.thumb
                    ? new InputFile(new URL(info.thumb))
                    : undefined,
            },
            aborter.signal
        );
        await ctx.deleteMessage();
        await ctx.api.deleteMessage(ctx.msg.chat.id, dlMsg.message_id);
        requests.delete(requestId);
    } catch (e) {
        console.log(e);
    }
});

bot.command("start", (c) => c.reply("Hi.."));

async function process(id: string, signal: AbortSignal) {
    const info = await getInfo(id);
    if (Number(info.videoDetails.lengthSeconds) > 20 * 60 * 60)
        throw new Error("Too long");
    const ytStream = await downloadFromInfo(info, { filter: "audio", signal });
    const ffmpeg = Deno.run({
        cmd: ["ffmpeg", "-i", "pipe:", "-f", "mp3", "pipe:"],
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
    });
    signal.addEventListener("abort", () => {
        ffmpeg.close();
    });
    ytStream.pipeTo(ffmpeg.stdin.writable);

    const blob = await blobbalbe(ffmpeg.stdout.readable);

    const writer = new ID3Writer(await blob.arrayBuffer());

    writer
        .setFrame("TIT2", info.videoDetails.title)
        .setFrame("TPE1", [
            (getAuthor(info) as any)?.name || info.videoDetails.author.name,
        ])
        .setFrame("APIC", {
            type: 3,
            data: await fetch(info.videoDetails.thumbnails.at(0)!.url!).then(
                (d) => d.arrayBuffer()
            ),
            description: "Photo",
        });
    writer.addTag();

    return {
        blob: writer.getBlob(),
        title: info.videoDetails.title,
        author: (getAuthor(info) as any)?.name || info.videoDetails.author.name,
        thumb: info.videoDetails.thumbnails.at(0)?.url,
    };
}

