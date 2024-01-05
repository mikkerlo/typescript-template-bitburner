import { NS } from "@ns";
import { weakenThreadsAmountForGrow, weakenThreadsAmountForHack } from "./lib/formulas";
import { BATCH_SCRIPTS, SLEEP_AND_GROW_SCRIPT, SLEEP_AND_HACK_SCRIPT, SLEEP_AND_WEAK_SCRIPT } from "./lib/constants";
import { getRootedServers } from "./lib/servers";
import { MaxHeap } from "./util/max_heap";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const tDiff = 80;

type StringNumberDict = {
    [key: string]: number;
};


enum AttackType {
    GROW,
    WEAK,
    HACK
}

class Task {
    ns: NS;
    target: string;
    host: string;
    hThreads: number;
    gThreads: number;
    w1Threads: number;
    w2Threads: number;
    
    totalTime:number;
    batchNumber: number;
    profitPerHack: number;
    baseTime: number;

    growDelay: number;
    hackDelay: number;
    weaken1Delay: number;
    weaken2Delay: number;

    constructor(ns: NS, target: string, host: string, h_threads: number, baseTime: number | undefined) {
        ns.tprint('KEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEK 1');
        this.ns = ns;
        const serverObj = this.getServerInBestStatePossible(target);
        const playerObj = ns.getPlayer();
        
        const growPercent = ns.formulas.hacking.growPercent(serverObj, 1, playerObj);
        // gp ** x  = 1 / (1 - h_t * hp)
        // x = log(1 / (1 - h_t * hp)) / log(gp)
        const hackAnalyze = ns.formulas.hacking.hackPercent(serverObj, playerObj);
        const growth_threads = Math.ceil(Math.log(1 / (1 - hackAnalyze * h_threads)) / Math.log(growPercent));
        // ns.tprint("gt ", growth_threads);
        const w1_threads = weakenThreadsAmountForHack(h_threads);
        const w2_threads = weakenThreadsAmountForGrow(growth_threads);
        this.hThreads = h_threads;
        this.gThreads = growth_threads;
        this.w1Threads = w1_threads;
        this.w2Threads = w2_threads;
        this.target = target;
        this.host = host;

        const growTime = ns.formulas.hacking.growTime(serverObj, playerObj);
        const weakenTime = ns.formulas.hacking.weakenTime(serverObj, playerObj);
        const hackTime = ns.formulas.hacking.hackTime(serverObj, playerObj);

        const softwareRam = BATCH_SCRIPTS.map(c => ns.getScriptRam(c)).reduce((a, b) => a > b ? a : b);
        this.baseTime = baseTime || 0;

        this.totalTime = Math.max(
            3 * tDiff + hackTime,
            2 * tDiff + weakenTime,
            tDiff + growTime
        );

        this.growDelay = this.totalTime - growTime - tDiff;
        this.hackDelay = this.totalTime - hackTime - 3 * tDiff;
        this.weaken1Delay = this.totalTime - weakenTime - 2 * tDiff;
        this.weaken2Delay = this.totalTime - weakenTime;

        this.batchNumber = Math.floor(this.totalRam / (this.totalThreads * softwareRam));
        ns.tprint('KEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEK');
        this.profitPerHack = this.batchNumber * ns.getServerMaxMoney(target) * ns.formulas.hacking.hackChance(serverObj, playerObj) * h_threads * ns.formulas.hacking.hackPercent(serverObj, playerObj);
    }

    get profitPerSec(): number {
        return this.profitPerHack * 1000 / this.time;
    }

    static compareByProfit(a: Task, b: Task): number {
        return a.profitPerSec - b.profitPerSec;
    }

    get totalThreads(): number {
        return this.gThreads + this.hThreads + this.w1Threads + this.w2Threads;
    }
    
    get time(): number {
        return this.totalTime + this.batchNumber * 3 * tDiff + this.baseTime;
    }

    get totalRam(): number {
        if (this.host == "home") {
            return this.ns.getServerMaxRam(this.host) - 38;
        }
        return this.ns.getServerMaxRam(this.host);
    }

    private getServerInBestStatePossible(serverName: string) {
        const server = this.ns.getServer(serverName);
        server.moneyAvailable = server.moneyMax;
        server.hackDifficulty = server.minDifficulty;
        return server;
    }

    get realThreads(): number {
        const softwareRam = BATCH_SCRIPTS.map(c => this.ns.getScriptRam(c)).reduce((a, b) => a > b ? a : b);
        return Math.floor(this.totalRam / softwareRam);
    }
}

class ServerManager {
    ns: NS;
    private host: string;
    private target: string;
    private attack_type: AttackType;
    current_wait: Promise<true>;


    constructor(ns: NS, host: string) {
        this.ns = ns;
        this.host = host;
        this.target = 'foodnstuff';
        this.attack_type = AttackType.WEAK;
        this.reEvaluateStatus();
        this.stop();
        this.current_wait = Promise.resolve(true);
    }

    private reEvaluateStatus(): void {
        if (this.ns.getServerSecurityLevel(this.target) > this.ns.getServerMinSecurityLevel(this.target)) {
            this.attack_type = AttackType.WEAK;
        } else if (this.ns.getServerMaxMoney(this.target) < this.ns.getServerMoneyAvailable(this.target)) {
            this.attack_type = AttackType.GROW;
        } else {
            this.attack_type = AttackType.HACK;
        }
    }

    setTarget(target: string) {
        this.target = target;
        this.reEvaluateStatus();
    }

    stop(): void {
        for (const software of BATCH_SCRIPTS) {
            this.ns.scriptKill(software, this.target);
        }
        this.ns.scp(BATCH_SCRIPTS, this.host, "home");
        this.current_wait = Promise.resolve(true);
    }

    private calcRam(): number {
        return this.ns.getServerMaxRam(this.host) - (this.host == "home" ? 38 : 0);
    }

    private calcThreads(): number {
        const maxMem = BATCH_SCRIPTS.map(c => this.ns.getScriptRam(c)).reduce((a, b) => a > b ? a : b)
        return Math.floor(this.calcRam() / maxMem);
    }

    get threads(): number {
        return this.calcThreads();
    }

    private exec(script: string, threads: number, ...args: Array<number | string | boolean>): number {
        return this.ns.exec(script, this.host, threads, ...args);
    }

    private sleep_and_grow(threads: number, sleepTime: number): number {
        return this.exec(SLEEP_AND_GROW_SCRIPT, threads, sleepTime, this.target);
    }

    private sleep_and_hack(threads: number, sleepTime: number): number {
        return this.exec(SLEEP_AND_HACK_SCRIPT, threads, sleepTime, this.target);
    }

    private sleep_and_weak(threads: number, sleepTime: number): number {
        return this.exec(SLEEP_AND_WEAK_SCRIPT, threads, sleepTime, this.target);
    }

    async run(): Promise<true> {
        for (;;) {
            this.current_wait = this.runCycle();
            await this.current_wait;
        }
    }

    private async runCycle(): Promise<true> {
        this.reEvaluateStatus();
        switch(this.attack_type) {
            case AttackType.WEAK:
                return this.runWeakCycle();
            case AttackType.GROW:
                return this.runGrowCycle();
            case AttackType.HACK:
                return this.runHackCycle();
        }
    }

    private async runWeakCycle(): Promise<true> {
        this.stop();
        const waitTime = this.ns.getWeakenTime(this.target);
        this.sleep_and_weak(this.calcThreads(), 0);
        await sleep(waitTime + tDiff);
        this.reEvaluateStatus();
        return Promise.resolve(true);
    }

    private async runGrowCycle(): Promise<true> {
        this.stop();
        const growTime = this.ns.getGrowTime(this.target);
        const weakenTime = this.ns.getWeakenTime(this.target);
        const totalTime = Math.max(
            growTime + tDiff,
            weakenTime
        );
        const growDelay = totalTime - growTime - tDiff;
        const weakenDelay = totalTime - weakenTime;
        const totalThreads = this.calcThreads();
        const growThreads = Math.floor(25 * totalThreads / 27);
        const weakenThreads = totalThreads - growThreads;

        this.sleep_and_weak(weakenThreads, weakenDelay);
        this.sleep_and_grow(growThreads, growDelay);

        await sleep(totalTime + tDiff);
        this.reEvaluateStatus();
        return Promise.resolve(true);
    }

    private async runHackCycle(): Promise<true> {
        const threads = this.calcThreads();
        const tasks: Array<Task> = [];
        for (let h = 0; h < threads; ++h) {
            if (h * this.ns.hackAnalyze(this.target) > 1) {
                break;
            }
            const taskToBe = new Task(this.ns, this.target, this.host, h, 0);
            if (taskToBe.realThreads < taskToBe.totalThreads) {
                continue;
            }
            tasks.push(new Task(this.ns, this.target, this.host, h, 0));
        }
        tasks.sort(Task.compareByProfit);
        const bestTask = tasks.pop();
        if (bestTask == null) {
            throw new Error(`No tasks available for ${this.target} on ${this.host}`);
        }
        
        this.ns.print(`Running on ${this.host} vs ${this.target} with ${bestTask.hThreads} threads`);
        this.ns.print(`Profit: ${bestTask.profitPerSec}`);
        this.ns.print(`ProfitPH: ${bestTask.profitPerHack}, ${bestTask.time}`);
        for (let batchNumber = 0; batchNumber < bestTask.batchNumber; ++batchNumber) {
            this.sleep_and_weak(bestTask.w1Threads, bestTask.weaken1Delay + batchNumber * 3 * tDiff);
            this.sleep_and_grow(bestTask.gThreads, bestTask.growDelay + batchNumber * 3 * tDiff);
            this.sleep_and_weak(bestTask.w2Threads, bestTask.weaken2Delay + batchNumber * 3 * tDiff);
            this.sleep_and_hack(bestTask.hThreads, bestTask.hackDelay + batchNumber * 3 * tDiff);
        }
        await sleep(bestTask.time + tDiff * 3 * bestTask.batchNumber);
        
        return Promise.resolve(true);
    }
}

class UberManager {
    ns: NS;
    private managers: Array<ServerManager>;

    constructor(ns: NS) {
        this.ns = ns;
        this.managers = [];
    }

    private async distributeTasks(): Promise<void> {
        for (const sr of this.managers) {
            sr.stop();
        }
        this.managers = [];
        const servers = getRootedServers(this.ns).sort((a, b) => this.ns.getServerMaxRam(b) - this.ns.getServerMaxRam(a));
        const currentQueue: StringNumberDict = {};
        for (const srv of servers) {
            const serverManager = new ServerManager(this.ns, srv);
            this.ns.tprint(`Max threads: ${serverManager.threads}`);
            await this.ns.sleep(100);
            const tasks: MaxHeap<Task> = new MaxHeap(Task.compareByProfit);
            this.ns.tprint(`Server ${srv} has ${serverManager.threads} threads`);
            if (serverManager.threads < 127) {
                continue;
            }
            for (const target of getRootedServers(this.ns)) {
                if (this.ns.getServerMaxMoney(target) == 0) {
                    continue;
                }
                for (let h_threads = 1; h_threads < serverManager.threads; ++h_threads) {
                    const taskToBe = new Task(this.ns, target, srv, h_threads, currentQueue[target] || 0);
                    if (taskToBe.realThreads < taskToBe.totalThreads) {
                        continue;
                    }
                    tasks.insert(new Task(this.ns, target, srv, h_threads, currentQueue[target] || 0));
                }
                await this.ns.sleep(20);
            }
            this.ns.tprint(`Server ${srv} has ${serverManager.threads} threads`);
            const bestTask = tasks.removeMax();
            if (bestTask == null) {
                break;
            }

            serverManager.setTarget(bestTask.target);
            serverManager.run();
            currentQueue[bestTask.target] = bestTask.time + (currentQueue[bestTask.target] || 0);
            this.managers.push(serverManager);
            break;
        }
    }

    async run(): Promise<void> {
        await this.distributeTasks();
        // return;
        for (;;) {
            const arr: Array<Promise<true>> = [];
            for (const m of this.managers) {
                arr.push(m.run());
            }
            await Promise.all(arr);
        }
    }
}


export async function main(ns: NS): Promise<void> {
    const manager = new UberManager(ns);
    await manager.run();
}
