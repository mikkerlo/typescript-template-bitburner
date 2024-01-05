import { NS } from "@ns";
import { calculateHacknetProfit } from "./lib/formulas";

type UpgradeFunction = () => void;
let debug: NS["tprint"];

class Upgrade {
  private name: string;
  private cost: number;
  private profitPerSec: number;
  private upgradeFunction: UpgradeFunction;

  constructor(name: string, cost: number, profitPerSec: number, upgradeFunction: UpgradeFunction) {
    this.name = name;
    this.cost = cost;
    this.profitPerSec = profitPerSec;
    this.upgradeFunction = upgradeFunction;
  }

  public getName(): string {
    return this.name;
  }

  public getCost(): number {
    return this.cost;
  }

  public getProfitPerSec(): number {
    return this.profitPerSec;
  }

  public doUpgrade(): void {
    debug(`Performing the ${this.name} upgrade that costs ${this.cost}`);
    this.upgradeFunction();
  }

  // Function to calculate the efficiency (cost/profitPerSec)
  public getEfficiency(): number {
    return this.cost / this.profitPerSec;
  }

  // Static function to sort an array of Upgrades based on their efficiency
  static sortUpgrades(upgrades: Upgrade[]): Upgrade[] {
    return upgrades.sort((a, b) => a.getEfficiency() - b.getEfficiency());
  }

  static upgradeComparator(a: Upgrade, b:Upgrade): number {
    return a.getEfficiency() - b.getEfficiency();
  }
}


export async function main(ns: NS): Promise<void> {
    debug = ns.tprint;
    for (;;) {  
      const possible_upgrades: Array<Upgrade> = Array.of();
      const hacknet = ns.hacknet;
      for(let i = 0; i < hacknet.numNodes(); ++i) {
          const node = hacknet.getNodeStats(i);
          const cur_profit = calculateHacknetProfit(node.level, node.ram, node.cores, ns.getHacknetMultipliers().production);
          // ns.tprint(node.production, ' ', cur_profit, ' ', node.production / cur_profit);
          // ns.tprint(ns.getHacknetMultipliers());
          if (hacknet.getRamUpgradeCost(i)) {
            const newProfit = calculateHacknetProfit(node.level, node.ram + 1, node.cores, ns.getHacknetMultipliers().production);
            possible_upgrades.push(new Upgrade(`Ram upgrade on ${node.name}`, hacknet.getRamUpgradeCost(i), newProfit - cur_profit, () => hacknet.upgradeRam(i)));
          }
          if (hacknet.getCoreUpgradeCost(i)) {
            const newProfit = calculateHacknetProfit(node.level, node.ram, node.cores + 1, ns.getHacknetMultipliers().production);
            possible_upgrades.push(new Upgrade(`Core upgrade on ${node.name}`, hacknet.getCoreUpgradeCost(i), newProfit - cur_profit, () => hacknet.upgradeCore(i)));
          }
          if (hacknet.getLevelUpgradeCost(i)) {
            const newProfit = calculateHacknetProfit(node.level + 1, node.ram, node.cores, ns.getHacknetMultipliers().production);
            possible_upgrades.push(new Upgrade(`Level upgrade on ${node.name}`, hacknet.getLevelUpgradeCost(i), newProfit - cur_profit, () => hacknet.upgradeLevel(i)));
          }
      }
      if (hacknet.maxNumNodes() > hacknet.numNodes()) {
        const profit = calculateHacknetProfit(1, 1, 1, ns.getHacknetMultipliers().production);
        possible_upgrades.push(new Upgrade(`New node`, hacknet.getPurchaseNodeCost(), profit, () => hacknet.purchaseNode()));
      }
      possible_upgrades.sort(Upgrade.upgradeComparator);
      let upgraded = false;
      if (possible_upgrades[0].getEfficiency() < 60 * 60) {
        if (ns.getServerMoneyAvailable("home") >= possible_upgrades[0].getCost()) {
          possible_upgrades[0].doUpgrade();
          upgraded = true;
        }
      } else {
        ns.tprint('Other upgrades is useless in the next 10 minutes');
        return;
      }
      await ns.sleep(upgraded ? 20 : 100);
    }
}
