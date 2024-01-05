import { NS } from "@ns"

export async function main(ns: NS): Promise<void> {
    const server = ns.args[0] as string;
    await ns.weaken(server);
}
