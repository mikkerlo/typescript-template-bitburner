import { NS } from "@ns";
import { getRootedServers } from "./lib/servers";
import { exec, formatTime, runLater } from "./lib/helpers";
import { MaxHeap } from "./util/max_heap";

const software_to_kill = ["sleep_and_weaken.js", "sleep_and_hack.js", "sleep_and_grow.js"];
const softwarePaths = software_to_kill.map(c => `batch_software/${c}`);
const weakenScript = "weaken.js";

class Target {
    target: string;
    threads: number;
    constructor(target: string, threads: number) {
        this.target = target;
        this.threads = threads;
    }
}

class Server {
    private ram: number;
    private name: string;
    private ns: NS;
  
    constructor(name: string, ns: NS) {
      this.name = name;
      this.ns = ns;

      for (const soft of softwarePaths) {
        ns.scriptKill(soft, name);
      }
      this.ram = 0;
      this.updateRam();
      ns.scp(weakenScript, name, "home");
    }
  
    weaken(target: string, thr: number): void {
        this.ns.scp("weaken.js", "home", this.name);
        this.ns.exec("weaken.js", this.name, thr, target);
        this.updateRam();
    }

    updateRam(): void {
        this.ram = this.ns.getServerMaxRam(this.name) - this.ns.getServerUsedRam(this.name);
        if (this.name == "home") {
            this.ram -= 32;
        }
    }

    getThreadAvailable(): number {
        return Math.floor(this.ram / this.ns.getScriptRam(weakenScript));
    }
  }

export async function main(ns: NS): Promise<void> {
    let target = "home";
    const targets: Array<Target> = [];
    for (const server of getRootedServers(ns)) {
        if (server == "home") {
            continue;
        }
        // if (ns.getWeakenTime(server) > 600 * 1000) {
        //     continue;
        // }
        const diff = ns.getServerSecurityLevel(server) - ns.getServerMinSecurityLevel(server);
        if (diff > 0) {
            targets.push(new Target(server, Math.ceil(diff / 0.05)));
            ns.tprint(server, ' ', Math.ceil(diff / 0.05));
            target = server;
        }
    }

    if (target == "home") {
        ns.tprint("There is nothing to weaken");
        ns.run("batch_grow.js");
        return;
    }

    const servers: MaxHeap<Server> = new MaxHeap((a: Server, b: Server) => a.getThreadAvailable() - b.getThreadAvailable());
    for (const server of getRootedServers(ns)) {
        servers.insert(new Server(server, ns));
    }

    targets.sort((a: Target, b: Target) => b.threads - a.threads);

    let max_time = 0;
    while (targets.length > 0) {
        const cur_server = servers.removeMax();
        if (cur_server == null) break;
        const cur_target = targets.pop();
        if (cur_target == null) break;

        const thr_to_use = Math.min(cur_target.threads, cur_server.getThreadAvailable());
        cur_server.weaken(cur_target.target, thr_to_use);
        if (cur_server.getThreadAvailable() > 0) {
            servers.insert(cur_server);
        }
        max_time = Math.max(max_time, ns.getWeakenTime(cur_target.target));
    }

    ns.tprint(`Waiting for ${formatTime(max_time + 60)}`);
    runLater(ns, "max_weak.js", max_time + 60, 1);
    // exec(ns, "open_timer.js", 1, "home", max_time + 60, "Max Weak");
}
