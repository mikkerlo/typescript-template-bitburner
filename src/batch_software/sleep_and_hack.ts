import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const sleep_t = ns.args[0] as number;
    const target = ns.args[1] as string;
    await ns.sleep(sleep_t);
    // ns.print(ns.getServerSecurityLevel(target));
    await ns.hack(target);
    // ns.print(ns.getServerSecurityLevel(target));
}
