import { WORKER_COUNT } from "./constants.ts";
import { createDataLoader } from "./data.ts";
import { WorkerPool } from "./pool.ts";
import { Data } from "./types.ts";

export const mainProcess = async () => {
	const worker_pool = new WorkerPool<Data, void>({
		count: WORKER_COUNT,
		onMessage: async (data) => {
			console.log("Data from worker: ", data);
		},
		dataLoader: createDataLoader()
	});

	await worker_pool.waitUntilCompleted();
};
