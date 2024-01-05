import { NS } from "@ns";
import React from 'lib/react';
import Timer from "react_lib/timer";

export async function main(ns: NS): Promise<void> {
    const timerTime = ns.args[0] as number;
    const header = ns.args[1] as string;
    ns.tail();
    ns.printRaw(
    <div>
        <h1>{header}</h1>
        <Timer initialTime={timerTime}></Timer>
    </div>
    )
}
