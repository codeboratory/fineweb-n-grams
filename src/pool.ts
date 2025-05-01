import cluster, { Worker } from "cluster";
import type { Noop } from "./types.ts";
import type { Serializable } from "worker_threads";

type CreateWorkerPoolOptions<Input extends Serializable, Output> = {
	count: number;
	onMessage: (data: Output) => Promise<void>;
	dataLoader: AsyncGenerator<Input, void, unknown>;
}

export class WorkerPool<Input extends Serializable, Output> {
	#worker_pool: Worker[];
	#worker_promises: Promise<void>[];
	#worker_resolves: Noop[];

	constructor(options: CreateWorkerPoolOptions<Input, Output>) {
		this.#worker_pool = new Array(options.count);
		this.#worker_promises = new Array(options.count);
		this.#worker_resolves = new Array(options.count);

		for (let i = 0; i < options.count; ++i) {
			const worker = cluster.fork();

			const next = async () => {
				const next = await options.dataLoader.next();

				if (next.value) {
					worker.send(next.value);
				}

				if (next.done) {
					this.#worker_resolves[i]();
				}
			};

			worker.once("message", async () => {
				worker.on("message", async (data) => {
					await options.onMessage(data);
					await next();
				});

				await next();
			});

			this.#worker_pool[i] = worker;
			this.#worker_promises[i] = new Promise<void>((resolve) => {
				this.#worker_resolves[i] = resolve;
			});
		}
	}

	async waitUntilCompleted() {
		return Promise.all(this.#worker_promises);
	}
}
