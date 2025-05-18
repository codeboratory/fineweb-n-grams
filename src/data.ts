import { CHUNK_SIZE, REPOSITORY } from "./constants.ts";
import { LanguageDB } from "./database/language.ts";
import { MainDB } from "./database/main.ts";
import { Huggingface } from "./huggingface.ts";
import type { Data } from "./types.ts";
import { DuckDBInstance } from "@duckdb/node-api";

const main_db = new MainDB();
const duck_instance = await DuckDBInstance.create();
const duck_connection = await duck_instance.connect();

const count_query = await duck_connection.prepare("SELECT COUNT(*) FROM read_parquet($1);");

export async function* createDataLoader() {
	const languages_from_huggingface = ["eng"];
	const languages_from_database = await main_db.readManyLanguages();

	for (const language of languages_from_huggingface) {
		const matched_database_language = languages_from_database.find(
			(v) => v.key === language
		);

		if (matched_database_language?.value === true) {
			continue;
		}

		const language_db = new LanguageDB(language);

		const directories_from_huggingface = await Huggingface.getDirectories(REPOSITORY);
		const directories_from_database = await language_db.readManyDirectories();

		for (const directory of directories_from_huggingface) {
			const matched_database_directory = directories_from_database.find(
				(v) => v.key === directory
			);

			if (matched_database_directory?.value === true) {
				continue;
			}

			const files_from_database = await language_db.readManyFiles(directory);
			const files_from_huggingface = await Huggingface.getFiles(REPOSITORY, directory);

			for (const file of files_from_huggingface) {
				const matched_database_file = files_from_database.find(
					(v) => v.key === file
				);

				if (matched_database_file?.value.done === true) {
					continue;
				}

				let chunks: boolean[] = matched_database_file?.value.chunks ?? [];
				let chunk_count = chunks.length;

				if (
					matched_database_file === undefined ||
					matched_database_file.value.downloaded === false ||
					(await Huggingface.existsDataFile(directory, file)) === false
				) {
					await Huggingface.downloadDataFile(REPOSITORY, directory, file);

					if (matched_database_file === undefined) {
						await language_db.upsertOneFile(file, {
							done: false,
							downloaded: true,
							directory: directory,
							chunks: []
						});
					} else {
						await language_db.upsertOneFile(file, {
							...matched_database_file.value,
							downloaded: true
						});
					}
				}

				if (
					matched_database_file === undefined ||
					matched_database_file.value.chunks.length === 0
				) {
					count_query.bindVarchar(1, `./data/${directory}/${file}`);

					const count_reader = await count_query.streamAndReadAll();
					const count_data = count_reader.getRows();
					const row_count = Number(count_data?.[0]?.[0] ?? 0);

					chunk_count = Math.ceil(row_count / CHUNK_SIZE);
					chunks = new Array(chunk_count).fill(false);

					await language_db.upsertOneFile(file, {
						done: false,
						downloaded: true,
						directory: directory,
						chunks: chunks
					});
				}

				for (let i = 0; i < chunk_count; ++i) {
					yield {
						language: language,
						directory: directory,
						file: file,
						chunk: i,
					} satisfies Data;
				}
			}
		}
	}
}
