import {
    Bot,
    InputFile,
    webhookCallback,
} from "https://deno.land/x/grammy@v1.12.0/mod.ts";


const bot = new Bot(Deno.env.get("BOT_TOKEN")!);


export default bot