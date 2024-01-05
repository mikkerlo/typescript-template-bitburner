import { NS } from "@ns";
import { weakenThreadsAmountForGrow, weakenThreadsAmountForHack } from "./lib/formulas";
import { exec, formatMoney, runLater } from "./lib/helpers";
import { getRootedServers } from "./lib/servers";
import { MaxHeap } from "./util/max_heap";

const software_required = ["sleep_and_grow.js", "sleep_and_weaken.js", "sleep_and_hack.js"];
const software_paths = software_required.map(c => `batch_software/${c}`);
const tDiff = 80;

class Worker {
    name: string;
    ns: NS;

    constructor(ns: NS, name: string) {
        this.ns = ns;
        this.name = name;
        for (const software of software_paths) {
            ns.scriptKill(software, name);
        }
        ns.scp(software_paths, name, "home");
    }

    get ram(): number {
        let ram_ = this.ns.getServerMaxRam(this.name) - this.ns.getServerUsedRam(this.name);
        if (this.name == "home") {
            ram_ -= 64;
        }
        return ram_;
    }

    get threads(): number {
        const maxMem = software_paths.map(c => this.ns.getScriptRam(c)).reduce((a, b) => a > b ? a : b)
        return Math.floor(this.ram / maxMem);
    }

    static compareByRam(a: Worker, b: Worker): number {
        return a.ram - b.ram;
    }
}


class Task {
    target: string;
    hThreads: number;
    gThreads: number;
    w1Threads: number;
    w2Threads: number;
    totalTime:number;
    profitPerHack: number;

    constructor(ns: NS, target: string, h_threads: number) {
        const growth_threads = Math.ceil(ns.growthAnalyze(target, 1 / (1 - ns.hackAnalyze(target) * h_threads)));
        const w1_threads = weakenThreadsAmountForHack(h_threads);
        const w2_threads = weakenThreadsAmountForGrow(growth_threads);
        this.hThreads = h_threads;
        this.gThreads = growth_threads;
        this.w1Threads = w1_threads;
        this.w2Threads = w2_threads;
        this.target = target;

        const growTime = ns.getGrowTime(target);
        const weakenTime = ns.getWeakenTime(target);
        const hackTime = ns.getHackTime(target);

        this.totalTime = Math.max(
            3 * tDiff + hackTime,
            2 * tDiff + weakenTime,
            tDiff + growTime
        );

        this.profitPerHack = ns.getServerMaxMoney(target) * ns.hackAnalyze(target) * h_threads * ns.hackAnalyzeChance(target);
    }

    get profitPerSec(): number {
        if (this.totalThreads < 1000) {
            return this.profitPerHack * 1000 / (4 * tDiff);
        }
        return this.profitPerHack * 1000 / this.totalTime;
    }

    static compareByProfit(a: Task, b: Task): number {
        return a.profitPerSec - b.profitPerSec;
    }

    get totalThreads(): number {
        return this.gThreads + this.hThreads + this.w1Threads + this.w2Threads;
    }
}

export async function main(ns: NS): Promise<void> {
    // Checking conditions
    const can_run = canRun(ns);

    if (!can_run) {
        ns.exec("run_later.js", "home", 1, 60000, "batch_hacking.js", 1);
        return;
    }
    let max_script_ram = 0;
    for (const script_name of software_paths) {
        max_script_ram = Math.max(max_script_ram, ns.getScriptRam(script_name));
    }

    const workers: Array<Worker> = []
    for (const srv of getRootedServers(ns)) {
        if (ns.getServerMaxRam(srv) < 1024) {
            continue;
        }
        workers.push(new Worker(ns, srv));
    }
    const maxWorkerRam = workers.map(c => c.ram).reduce((a, b) => a > b ? a : b);
    const max_software_ram = software_required.map(c => ns.getScriptRam(c)).reduce((a, b) => a > b ? a : b);
    const available_threads = Math.floor(maxWorkerRam / max_software_ram);
    ns.tprint(`Available threads: ${available_threads}`);

    const taskPull = new MaxHeap(Task.compareByProfit);

    for (const target of getRootedServers(ns)) {
        for (let threads = 1; threads < available_threads; ++threads) {
            if (1 <= ns.hackAnalyze(target) * threads) {
                continue;
            }
            const task = new Task(ns, target, threads);
            if (task.totalThreads > available_threads) {
                break;
            }
            taskPull.insert(task);
        }
    }

    workers.sort(Worker.compareByRam);
    const blackList: Set<string> = new Set();
    let cur_worker = workers.pop();
    let max_total_time = 0;
    while(cur_worker != null) {
        while(taskPull.length > 0) {
            const curTask = taskPull.removeMax() as Task;
            if (blackList.has(curTask.target)) {
                continue;
            }
            if (curTask.totalThreads > cur_worker.threads) {
                continue;
            }
            
            const growTime = ns.getGrowTime(curTask.target);
            const weakenTime = ns.getWeakenTime(curTask.target);
            const hackTime = ns.getHackTime(curTask.target);

            const hackDelay = curTask.totalTime - 3 * tDiff - hackTime;
            const weakenDelay = curTask.totalTime - 2 * tDiff - weakenTime;
            const growDelay = curTask.totalTime - tDiff - growTime;
            const weaken2Delay = curTask.totalTime - weakenTime;
            const batchSize = Math.floor(cur_worker.threads / curTask.totalThreads);

            ns.tprint(`Our victim today is ${curTask.target}`);
            ns.tprint(`Potential income is ${formatMoney(ns, curTask.profitPerSec)}`);
            ns.tprint(`Running ${batchSize} batches, with ${curTask.totalThreads} hacking threads on ${cur_worker.name}`);

            for (let cur_batch = 0; cur_batch < batchSize; ++cur_batch) {
                const add_delay = cur_batch * 4 * tDiff;
                ns.exec('batch_software/sleep_and_hack.js',   cur_worker.name, curTask.hThreads,  add_delay + hackDelay,    curTask.target);
                ns.exec('batch_software/sleep_and_grow.js',   cur_worker.name, curTask.gThreads,  add_delay + growDelay,    curTask.target);
                ns.exec('batch_software/sleep_and_weaken.js', cur_worker.name, curTask.w1Threads, add_delay + weakenDelay,  curTask.target);
                ns.exec('batch_software/sleep_and_weaken.js', cur_worker.name, curTask.w2Threads, add_delay + weaken2Delay, curTask.target);
            }
            max_total_time = Math.max(max_total_time, curTask.totalTime + (batchSize + 1) * 4 * tDiff);
            blackList.add(curTask.target);
            break;
        }

        cur_worker = workers.pop();
    }

    runLater(ns, "batch_hacking.js", max_total_time, 1);
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
