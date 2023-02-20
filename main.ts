import "https://deno.land/std@0.177.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// import {
//     Bot,
//     InputFile,
//     webhookCallback,
// } from "https://deno.land/x/grammy@v1.12.0/mod.ts";
import ID3Writer from "https://esm.sh/browser-id3-writer@4.4.0";
import { Hono } from "https://deno.land/x/hono@v2.6.1/mod.ts";
import Kernel from "./kernel.ts";

["SECRET_PATH", "BOT_TOKEN"].map((variable) => {
    if (!Deno.env.has(variable)) throw new Error(`Required ${variable}`);
});

const app = new Hono();

app.onError((error) => {
    console.log(error);

    return new Response("BAD", { status: 500 });
});

// bot.on("callback_query:data", async (ctx) => {
//     console.log(ctx.callbackQuery.data);

//     if (ctx.callbackQuery.data.startsWith("cancel")) {
//         console.log('FOUND');

//         const id = ctx.callbackQuery.data.replace(/^cancel\-/, "");
//         if (requests.has(id)) {
//             const request = requests.get(id)!;
//             request.ctrl.abort();
//             await Promise.all(
//                 request.ids.map((id) =>
//                     ctx.api.deleteMessage(ctx.chat!.id, Number(id))
//                 )
//             );
//         }else{
//             console.log('NOTFOUND');

//         }
//     }
// });

const k = new Kernel();

app.post(`/${Deno.env.get("SECRET_PATH")!}`, async (ctx) => {
    return new Promise(async (r, j) => {
        const process = k.spawn();
        process.emit("update", await ctx.req.json());

        r(new Response(""))
    });
});

serve(app.fetch, {
    port: 8080,
});
