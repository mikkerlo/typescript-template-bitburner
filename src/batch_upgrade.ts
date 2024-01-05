import { NS } from "@ns";
import { formatMoney } from "./lib/helpers";
import { purchasedServerNames } from "./lib/constants";

const MIN_FIRST_SERVER_RAM = 128;
const MIN_SECOND_SERVER_RAM = 1024;
const firstServer = purchasedServerNames[0];


export async function main(ns: NS): Promise<void> {
    if (!ns.scan("home").includes(firstServer)) {
        if (ns.getServerMoneyAvailable("home") < ns.getPurchasedServerCost(MIN_FIRST_SERVER_RAM)) {
            ns.tprint(`Required ${ns.getPurchasedServerCost(MIN_FIRST_SERVER_RAM)} but only ${ns.getServerMoneyAvailable("home")} is available`);
            return;
        }
        ns.purchaseServer(firstServer, MIN_FIRST_SERVER_RAM);
        ns.tprint(`Purchased ${firstServer} with ${ns.formatRam(MIN_FIRST_SERVER_RAM)} RAM`);
    }

    for (const srv of purchasedServerNames) {
        if (!ns.scan("home").includes(srv)) {
            if (ns.getServerMoneyAvailable("home") < ns.getPurchasedServerCost(MIN_SECOND_SERVER_RAM)) {
                ns.tprint(`Required ${formatMoney(ns, ns.getPurchasedServerCost(MIN_SECOND_SERVER_RAM))} but only ${ns.getServerMoneyAvailable("home")} is available`);
                return;
            }
            ns.purchaseServer(srv, MIN_SECOND_SERVER_RAM);
            ns.tprint(`Purchased ${srv} with ${ns.formatRam(MIN_SECOND_SERVER_RAM)} RAM`);
        }

        let upgraded = false;
        if (ns.getPurchasedServerMaxRam() >= 2 * ns.getServerMaxRam(srv)) {
            const ramBefore = ns.getServerMaxRam(srv);
            while (ns.getPurchasedServerMaxRam() > ns.getServerMaxRam(srv) && ns.getServerMoneyAvailable("home") >= ns.getPurchasedServerUpgradeCost(srv, 2 * ns.getServerMaxRam(srv))) {
                ns.upgradePurchasedServer(srv, 2 * ns.getServerMaxRam(srv));
                upgraded = true;
            }
            const ramAfter = ns.getServerMaxRam(srv);
            const nextUpgradeCost = ns.getPurchasedServerUpgradeCost(srv, 2 * ns.getServerMaxRam(srv));
            ns.tprint(`${srv}: ${ramBefore} -> ${ramAfter}, need ${formatMoney(ns, nextUpgradeCost - ns.getServerMoneyAvailable("home"))} for more`);
        } else {
            ns.tprint(`${srv}: already max upgraded`);
            continue;
        }

        if (!upgraded) {
            return;
        }
    }
}
   