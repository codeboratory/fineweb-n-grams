import { REPOSITORY, WORKER_COUNT } from "./constants.ts";
import { createDataLoader } from "./data.ts";
import { LanguageDB } from "./database/language.ts";
import { MainDB } from "./database/main.ts";
import { Huggingface } from "./huggingface.ts";
import { WorkerPool } from "./pool.ts";
import type { Data } from "./types.ts";

export const mainProcess = async () => {
	const main_db = new MainDB();

	const languages_from_huggingface = ["eng"];

	for (const language of languages_from_huggingface) {
		const language_db = new LanguageDB(language);

		const directories_from_huggingface = await Huggingface.getDirectories(REPOSITORY);

		for (const directory of directories_from_huggingface) {
			const files_from_huggingface = await Huggingface.getFiles(REPOSITORY, directory);


		}
	}

	// TODO: seed languages/directories/files
	// before creating worker pool

	const worker_pool = new WorkerPool<Data, void>({
		count: WORKER_COUNT,
		onMessage: async (data) => {
			console.log("Data from worker: ", data);
		},
		dataLoader: createDataLoader()
	});

	await worker_pool.waitUntilCompleted();
};
