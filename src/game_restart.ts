import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const run = (server: string) => runOnce(ns, server);
    run("hacknet_manager.js");
    run("runner.js");
    run("weak_for_xp.js");
    run("infiltration.js");
    run("custom_hud.js");
}

function runOnce(ns: NS, script: string): void {
    if (!ns.isRunning(script, "home")) {
        ns.run(script);
    }
}