import { createDirsDB, createFilesDB } from "./database.ts";
import { getDirectories, getFiles } from "./huggingface.ts"

const DATASET = "datasets/HuggingFaceFW/fineweb";

const dirs_db = createDirsDB();
const files_db = createFilesDB();

for await (const directory of getDirectories(DATASET)) {
	await dirs_db.put(directory, false);

	for await (const file of getFiles(DATASET, directory)) {
		await files_db.put(file, false);
	}
}
