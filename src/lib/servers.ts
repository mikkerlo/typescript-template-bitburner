import { NS } from "@ns"

type SoftwareFunction = (server: string, ns: NS) => void;

export function getServesReally(ns: NS): Array<string> {
    ns.tprint("Updating server list");
    const used = new Set<string>();
    function dfs(cur_server: string) {
        if (used.has(cur_server)) {
            return;
        }
        used.add(cur_server);
        for (const server of ns.scan(cur_server)) {
            dfs(server);
        }
    }
    dfs("home");
    return Array.from(used);
}

// let servers_internal = Array.of("");

export function getServers(ns: NS): Array<string> {
    // if (servers_internal.length < 2) {
    //     servers_internal = getServesReally(ns);
    // }
    // return Array.from(servers_internal);
    return getServesReally(ns);
}

export const malwareSoftware: { [key: string]: SoftwareFunction } = {
    "BruteSSH.exe": (server: string, ns: NS) => ns.brutessh(server),
    "FTPCrack.exe": (server: string, ns: NS) => ns.ftpcrack(server),
    "relaySMTP.exe": (server: string, ns: NS) => ns.relaysmtp(server),
    "HTTPWorm.exe": (server: string, ns: NS) => ns.httpworm(server),
    "SQLInject.exe": (server: string, ns: NS) => ns.sqlinject(server),
};


export function getRootedServers(ns: NS): Array<string> {
    const available_hacks: Array<SoftwareFunction> = [];
    for (const [hack, hack_f] of Object.entries(malwareSoftware)) {
        if (ns.fileExists(hack)) {
            available_hacks.push(hack_f);
        }
    }

    const rooted_servers: Array<string> = [];
    for (const server of getServers(ns)) {
        if (ns.hasRootAccess(server)) {
            rooted_servers.push(server);
            //ns.tprint(server); 
            continue;
        }
        if (ns.getServerNumPortsRequired(server) > available_hacks.length) {
            continue;
        }
        if (ns.getHackingLevel() < ns.getServerRequiredHackingLevel(server)) {
            continue
        }
        for (const f of available_hacks) {
            f(server, ns);
        }
        ns.nuke(server);
        rooted_servers.push(server);
    }
    return Array.from(rooted_servers);
}


