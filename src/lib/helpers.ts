import { NS } from "@ns";
import { RunnerConfig } from "/runner";

export function runLater(ns: NS, script_name: string, sleep_in_ml: number, threads: number, ...args: (string | number | boolean)[]): void {
    ns.run("run_later.js", 1, sleep_in_ml, script_name, threads, Math.random() * 1000, ...args);
}

export async function exec(ns: NS, script_name: string, threads: number, host: string, ...args: (string | number | boolean)[]) {
    const runnerConfig = new RunnerConfig(script_name, host, threads, args);
    for(;;) {
        if (!ns.tryWritePort(17, runnerConfig.serialize())) {
            await ns.sleep(10);
            continue;
        }
        break;
    }
}

export function formatMoney(ns: NS, money: number) {
    return ns.nFormat(money, "$0.000a");
}

export function formatTime(milliseconds: number): string {
    // Calculate hours, minutes, seconds, and remaining milliseconds
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    const remainingMilliseconds = milliseconds % 1000;
  
    // Format to strings, ensuring two digits for hours, minutes, and seconds
    const hoursString = hours.toString().padStart(2, '0');
    const minutesString = minutes.toString().padStart(2, '0');
    const secondsString = seconds.toString().padStart(2, '0');
  
    // Format remaining milliseconds to 3 digits
    const remainingMillisecondsString = remainingMilliseconds.toString().padStart(3, '0').substring(0, 3);
  
    // Concatenate to final format
    return `${hoursString}:${minutesString}:${secondsString}.${remainingMillisecondsString}`;
}
