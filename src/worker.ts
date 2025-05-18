import { DuckDBInstance, DuckDBVarCharVector } from "@duckdb/node-api";
import bindings from "@duckdb/node-bindings";
import process from "node:process";
import type { Data } from "./types";
import { CHUNK_SIZE } from "./constants";
import { LanguageDB } from "./database/language";
import { bigrams_map, computeGrams, trigrams_map, unigrams_map } from "./ngrams";
import { getRandomSleepDuration, sleep } from "./utils";
import { Huggingface } from "./huggingface";
import { MainDB } from "./database/main";

const text_decoder = new TextDecoder();

const duck_instance = await DuckDBInstance.create();
const duck_connection = await duck_instance.connect();

const read_query = await duck_connection.prepare(
	"SELECT text FROM read_parquet($1) LIMIT $2 OFFSET $3;"
);

const main_db = new MainDB();

export const workerProcess = () => {
	let language_db: LanguageDB;
	let current_language: string;

	process.on("message", async (data) => {
		const input = data as Data;

		if (current_language !== input.language) {
			current_language = input.language;
			language_db = new LanguageDB(input.language);
		}

		await sleep(getRandomSleepDuration());

		read_query.bindVarchar(1, `data/${input.directory}/${input.file}`);
		read_query.bindInteger(2, CHUNK_SIZE);
		read_query.bindInteger(3, input.chunk * CHUNK_SIZE);

		const data_reader = await read_query.stream();

		while (true) {
			const chunk = await data_reader.fetchChunk();

			if (!chunk || chunk.rowCount === 0) {
				break;
			}

			const text_vector = chunk.getColumnVector(0) as DuckDBVarCharVector;
			const data_view = (text_vector as unknown as { dataView: DataView }).dataView;
			const buffer = data_view.buffer as ArrayBuffer;

			for (let i = 0; i < text_vector.itemCount; ++i) {
				computeGrams(
					text_decoder.decode(
						bindings.get_data_from_pointer(
							buffer,
							data_view.byteOffset + (i * 16) + 8,
							data_view.getUint32(i * 16, true)
						)
					)
				);
			}
		}

		const {
			is_file_done,
			is_language_done
		} = await language_db.insertOneChunk(
			input.directory,
			input.file,
			input.chunk,
			{
				unigrams: unigrams_map,
				bigrams: bigrams_map,
				trigrams: trigrams_map
			}
		);

		if (is_file_done) {
			await Huggingface.removeDataFile(input.directory, input.file);
		}

		if (is_language_done) {
			await main_db.upsertOneLanguage(current_language, true);
		}

		unigrams_map.clear();
		bigrams_map.clear();
		trigrams_map.clear();

		process.send?.(data);
	});

	process.send?.(true);
};
