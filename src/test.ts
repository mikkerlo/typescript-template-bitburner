import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    ns.tprint('Hello world!');
    ns.tprint(ns.getPurchasedServerLimit());
}
