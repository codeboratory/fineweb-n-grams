import { REPOSITORY, WORKER_COUNT } from "./constants.ts";
import { createDataLoader } from "./data.ts";
import { LanguageDB } from "./database/language.ts";
import { MainDB } from "./database/main.ts";
import { Huggingface } from "./huggingface.ts";
import { WorkerPool } from "./pool.ts";
import type { Data } from "./types.ts";

const main_db = new MainDB();

export const mainProcess = async () => {
	console.log("main.start");

	const languages_from_database = await main_db.readManyLanguages();

	if (languages_from_database.length === 0) {
		const languages_from_huggingface = ["eng"];

		for (const language of languages_from_huggingface) {
			await main_db.upsertOneLanguage(language, false);

			const language_db = new LanguageDB(language);
			const directories_from_huggingface = await Huggingface.getFilesRecursive(REPOSITORY);

			await language_db.upsertManyDirectoriesWithFiles(directories_from_huggingface);
		}
	}

	const worker_pool = new WorkerPool<Data, void>({
		count: WORKER_COUNT,
		onMessage: async (data) => {
			console.log("Data from worker: ", data);
		},
		dataLoader: createDataLoader()
	});

	await worker_pool.waitUntilCompleted();

	console.log("main.done");
};
