/// <reference lib="webworker" />
import mitt from "https://esm.sh/mitt@3.0.0";
import { z } from "https://deno.land/x/zod@v3.20.5/mod.ts";

const Message = z.object({
    $_magic: z.literal("POWER"),
    type: z.string(),
    data: z.any()
})

self.addEventListener("message", (ev: MessageEvent)=>{
    const output = Message.safeParse(ev.data)
    if(output.success){
        ev.preventDefault()
        events.emit(output.data.type, output.data.data)
    }
})

export const events = mitt();
