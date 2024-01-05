import { NS } from "@ns";
import { exec } from "./lib/helpers";

export async function main(ns: NS): Promise<void> {
    await ns.sleep(ns.args[0] as number);
    let to_run = Array.from(ns.args);
    to_run = to_run.slice(4);
    // const trash = to_run[4];
    const exec_name = ns.args[1] as string;
    const threads = ns.args[2] as number;
    //ns.tprint(exec_name, "home", threads, ...to_run);
    exec(ns, exec_name, threads, ns.getHostname(), ...to_run);
}
