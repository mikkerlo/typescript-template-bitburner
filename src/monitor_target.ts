import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const target = ns.args[0] as string;
    ns.tail();
    for (;;) {
        ns.print(ns.getServerSecurityLevel(target));
        await ns.sleep(100);
    }
}
