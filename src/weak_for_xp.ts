import { NS } from "@ns";
import { runLater } from "./lib/helpers";
import { getRootedServers } from "./lib/servers";

const weaken_script = "weaken.js";
const target = "foodnstuff";

export async function main(ns: NS): Promise<void> {
    const servers = getRootedServers(ns).filter(srv => ns.getServerMaxRam(srv) > 32);
    if (ns.getHackingLevel() < 100) {
        for (const srv of servers) {
            let ram_used = ns.getServerUsedRam(srv);
            if (srv == "home") {
                ram_used += 32;
            }
            const ram = ns.getServerMaxRam(srv) - ram_used;
            const thr = Math.floor(ram / ns.getScriptRam(weaken_script));
            if (thr < 1) {
                continue;
            }
            ns.tprint(`Running weaken on ${srv} with ${thr} threads`);
            ns.scp(weaken_script, srv, "home");
            ns.exec(weaken_script, srv, thr, target);
        }
    } else {
        ns.run("batch_runner.js");
        ns.tprint("Early xp obtained");
        return;
    }

    runLater(ns, ns.getScriptName(), ns.getWeakenTime(target) + 20, 1);
}
