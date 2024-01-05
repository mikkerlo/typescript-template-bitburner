import { NS, PortData } from "@ns";

type SerializableArg = string | number | boolean;

export class RunnerConfig {
  scriptName: string;
  host: string;
  threads: number;
  args: SerializableArg[];

  constructor(scriptName: string, host:string, threads: number, args: SerializableArg[]) {
        this.scriptName = scriptName;
        this.host = host;
        this.threads = threads;
        this.args = args;
  }

  // Serialize the instance to JSON
  serialize(): string {
        return JSON.stringify(this);
  }

  // Deserialize from JSON and update the instance fields
  deserialize(json: string): void {
    const obj = JSON.parse(json);
    this.scriptName = obj.scriptName;
    this.threads = obj.threads;
    this.args = obj.args;
  }

  // Static method to deserialize from JSON and return a new instance
  static deserializeNew(json: string): RunnerConfig {
        const obj = JSON.parse(json);
        return new RunnerConfig(obj.scriptName, obj.host, obj.threads, obj.args);
  }
}

export async function main(ns: NS): Promise<void> {
    for(;;) {
        const portData = await tryRead(ns, 17);
        const config = RunnerConfig.deserializeNew(portData.toString());
        ns.exec(config.scriptName, config.host, config.threads, ...config.args);
    }
}

async function tryRead(ns: NS, port: number): Promise<PortData> {
    const portHandle = ns.getPortHandle(port);
    while(portHandle.empty()) {
        await ns.sleep(10);
    }
    return portHandle.read();
}
