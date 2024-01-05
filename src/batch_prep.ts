import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    // ns.tprint(ns.getPurchasedServerUpgradeCost("batch", 1024 / 2 * 2) / 1000000);
    // ns.upgradePurchasedServer("batch", 4096 * 2);
    ns.tprint(ns.getPurchasedServerCost(512));
}
