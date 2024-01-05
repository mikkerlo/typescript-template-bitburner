import { NS } from "@ns";
import { getRootedServers } from "./lib/servers";
import { formatTime, runLater } from "./lib/helpers";
import { growthAnalyzeSecurity } from "./lib/formulas";
import { MaxHeap } from "./util/max_heap";

const software_required = ["sleep_and_grow.js", "sleep_and_weaken.js", "sleep_and_hack.js"];
const software_paths = software_required.map(c => `batch_software/${c}`);
const t_diff = 120;

type ThreadedObject = {
    name: string;
    threads: number;
};

enum Action {
    weaken,
    grow
}

type TargetObject = {
    worker: string;
    target: string;
    threads: number;
    type: Action;
};

function compareByThreads(a: ThreadedObject, b: ThreadedObject): number {
    return a.threads - b.threads;
}

export async function main(ns: NS): Promise<void> {
    let target = "home";
    const tasks: Array<ThreadedObject> = [];
    for (const server of getRootedServers(ns)) {
        if (server == "home") {
            continue;
        }

        if (ns.getWeakenTime(server) > 450 * 1000) {
            continue;
        }

        if (ns.getServerMaxMoney(server) > ns.getServerMoneyAvailable(server)) {
            const increase = ns.getServerMaxMoney(server) / ns.getServerMoneyAvailable(server);
            target = server;
            tasks.push({"name": server, threads: ns.growthAnalyze(server, increase)});
        }
    }

    tasks.sort(compareByThreads);

    if (target == "home") {
        ns.tprint("Nothing to grow");
        ns.run("batch_hacking.js");
        return;
    }

    // target = "foodnstuff";
    let max_script_ram = 0;
    for (const script_name of software_paths) {
        max_script_ram = Math.max(max_script_ram, ns.getScriptRam(script_name));
    }

    const workers: MaxHeap<ThreadedObject> = new MaxHeap(compareByThreads);
    let total_threads = 0;
    for (const worker of getRootedServers(ns)) {
        let ram = ns.getServerMaxRam(worker);
        if (worker != "home") {
            ns.killall(worker);
            ns.scp(software_paths, worker, "home");
        } else {
            for (const software of software_paths) {
                ns.scriptKill(software, worker);
            }
            ram -= 36;
        }
        const threads = Math.floor(ram / max_script_ram);
        if (threads < 2) {
            continue;
        }
        total_threads += threads;
        workers.insert({"name": worker, "threads": threads});
    }

    let used_threads = 0;
    const targets: Array<TargetObject> = [];
    while (tasks.length > 0) {
        const current_task = tasks.pop();
        if (current_task == undefined) {
            break;
        }
        const cur_threads_total = total_threads - used_threads;
        let cur_gr_threads = cur_threads_total;
        let cur_sec_threads = Math.ceil(growthAnalyzeSecurity(cur_threads_total) / 0.05);
        while (cur_gr_threads + cur_sec_threads > cur_threads_total && cur_gr_threads > 0) {
            --cur_gr_threads;
            cur_sec_threads = Math.ceil(growthAnalyzeSecurity(cur_threads_total) / 0.05);
        }

        if (cur_gr_threads == 0) {
            continue;
        }

        ns.tprint(cur_gr_threads, " ", cur_sec_threads);

        while (workers.length > 0 && cur_gr_threads > 0) {
            const worker = workers.removeMax() as ThreadedObject;
            const using_threads = Math.min(cur_gr_threads, worker.threads);
            if (worker.threads > cur_gr_threads) {
                worker.threads -= cur_gr_threads;
                workers.insert(worker);
            }
            cur_gr_threads -= using_threads;
            targets.push({"worker": worker.name, "target": current_task.name, "threads": using_threads, "type": Action.grow});
            used_threads += using_threads;
        }

        while (workers.length > 0 && cur_sec_threads > 0) {
            const worker = workers.removeMax() as ThreadedObject;
            const using_threads = Math.min(cur_sec_threads, worker.threads);
            if (worker.threads > cur_sec_threads) {
                worker.threads -= cur_sec_threads;
                workers.insert(worker);
            }
            cur_sec_threads -= using_threads;
            targets.push({"worker": worker.name, "target": current_task.name, "threads": using_threads, "type": Action.weaken});
            used_threads += using_threads;
        }
    }

    let max_time = 0;
    while (targets.length > 0) {
        const target = targets.pop() as TargetObject;
        const growTime = ns.getGrowTime(target.target);
        const weakenTime = ns.getWeakenTime(target.target);
        const total_time = Math.max(
            growTime + t_diff,
            weakenTime
        );
        max_time = Math.max(max_time, total_time);
        const grow_delay = total_time - growTime - t_diff;
        const weaken_delay = total_time - weakenTime;
        
        
        if (target.type == Action.grow) {
            ns.tprint(`Running grow with ${target.threads} threads on ${target.worker} against ${target.target}`);
            ns.exec("batch_software/sleep_and_grow.js", target.worker, target.threads, grow_delay, target.target);
        } else if (target.type == Action.weaken) {
            ns.tprint(`Running weaken with ${target.threads} threads on ${target.worker} against ${target.target}`);
            ns.exec("batch_software/sleep_and_weaken.js", target.worker, target.threads, weaken_delay, target.target);
        }
    }

    ns.tprint(`Waiting for ${formatTime(max_time + t_diff * 3)}`);
    runLater(ns, "batch_grow.js", max_time + t_diff * 3, 1);
}

function canRun(ns: NS): boolean {
    if (ns.scan("home").includes("batch")) {
        return true;
    }
    let can_run = true;
    if (ns.getServerMoneyAvailable("home") < ns.getPurchasedServerCost(1024)) {
        ns.tprint("Not enough money, sleeping 60");
        can_run = false;
    }

    if (ns.getHackingLevel() < 50) {
        ns.tprint("Not enough hacking, sleeping 60");
    }

    return can_run;
}

// function calculateProfit(ns: NS, target: string, threads: number): number {
//     const chance = ns.hackAnalyzeChance(target);
//     const profit = ns.hackAnalyze()
// }