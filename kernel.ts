

export class Process extends Worker{
    constructor(source: string | URL, options: WorkerOptions){
        super(source, options)
    }

    emit(type: string, data: any){
        this.postMessage({
            $_magic: "POWER",
            type,
            data
        })
    }
}
const x = new SharedArrayBuffer(1000)
export default class Kernel {
    private cores = new Set<Process>();

    spawn() {
        const worker = new Process(new URL("./process.ts", import.meta.url), {
            type: "module",
        });
        worker.addEventListener("error", e=>{
            console.log(e);
        })
        worker.addEventListener("message", ev=>{
            console.log(ev.data);
            
        })

        
        

        this.cores.add(worker);
        return worker;
    }
}

