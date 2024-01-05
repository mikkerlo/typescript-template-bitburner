// import { NS } from "@ns";

export function weakenAnalyze(threads: number): number {
    return 0.05 * threads;
}

export function hackAnalyzeSecurity(threads: number): number {
    return 0.002 * threads;
}

export function growthAnalyzeSecurity(threads: number): number {
    return 0.004 * threads;
}

export function weakenThreadsAmountForGrow(threads: number): number {
    return Math.ceil(growthAnalyzeSecurity(threads) / 0.05);
}

export function weakenThreadsAmountForHack(threads: number): number {
    return Math.ceil(hackAnalyzeSecurity(threads) / 0.05);
}

export function calculateHacknetProfit(level: number, ram: number, cores: number, mult: number) {
    const levelMult = level * 1.5;
    const ramMult = Math.pow(1.035, ram - 1);
    const coresMult = (cores + 5) / 6;
    return levelMult * ramMult * coresMult * mult;
}
