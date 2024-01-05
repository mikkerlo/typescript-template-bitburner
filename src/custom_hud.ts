import { NS } from "@ns";
import { malwareSoftware } from "./lib/servers";

export async function main(ns: NS): Promise<void> {
    const doc = eval("document") as Document;
    const hook0 = doc.getElementById('overview-extra-hook-0');
    const hook1 = doc.getElementById('overview-extra-hook-1');
    if (hook0 == null || hook1 == null) {
        ns.tprint("Failed to find hooks");
        return;
    }
    ns.atExit(() => { 
        hook0.innerHTML = ""; 
        hook1.innerHTML = ""; 
    });
    for (;;) {
        try {
            const headers = []
            const values = [];
            // Add script income per second
            headers.push("BatchSize");
            values.push(ns.formatRam(ns.getServerMaxRam("batch")));

            let sft_cnt = 0;
            for (const sft of Object.keys(malwareSoftware)) {
                if (ns.fileExists(sft)) {
                    ++sft_cnt;
                }
            }

            headers.push("Software count");
            values.push(String(sft_cnt));

            // Now drop it into the placeholder elements
            hook0.innerText = headers.join(" \n");
            hook1.innerText = values.join("\n");
        } catch (err) { // This might come in handy later
            ns.print("ERROR: Update Skipped: " + String(err));
        }
        await ns.sleep(1000);
    }
}
