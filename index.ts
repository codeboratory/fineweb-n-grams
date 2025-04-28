// import { listFiles } from "@huggingface/hub";
//
// const files = listFiles({
// 	repo: process.env.HUGGINGFACE_REPO!,
// 	path: "data/CC-MAIN-2024-51",
// 	accessToken: process.env.HUGGINGFACE_TOKEN,
// 	recursive: false,
// });
//
// for await (const file of files) {
// 	if (file.type === "file") {
// 		console.log(file.path.slice(file.path.lastIndexOf("/") + 1));
// 	}
// }

import { DuckDBConnection, DuckDBVarCharVector } from "@duckdb/node-api";
import { open } from "lmdb";

const duckdb = await DuckDBConnection.create();

const unigram_lmdb = open("./grams/unigrams.lmdb", {
	strictAsyncOrder: true,
	useVersions: false,
	cache: true,
});
await unigram_lmdb.drop();

const bigram_lmdb = open("./grams/bigrams.lmdb", {
	strictAsyncOrder: true,
	useVersions: false,
	cache: true,
});
await bigram_lmdb.drop();

const trigram_lmdb = open("./grams/trigrams.lmdb", {
	strictAsyncOrder: true,
	useVersions: false,
	cache: true,
});
await trigram_lmdb.drop();

const unigram_map = new Map<string, number>;
const bigram_map = new Map<string, number>;
const trigram_map = new Map<string, number>;

const valid = /[a-zA-Z0-9\p{P}\p{Sm}\p{Sc}\p{Sk}]/u;

const increment = (map: Map<string, number>, key: string) => {
	map.set(key, (map.get(key) ?? 0) + 1);
};

const computeGrams = (text: string) => {
	const chars = Array.from(text);
	const length = chars.length;

	if (length === 0) return;

	let c1: string = "";
	let v1: boolean = false;
	let c2: string = "";
	let v2: boolean = false;

	for (let i = 0; i < length; ++i) {
		const c3 = chars[i]!;
		const v3 = valid.test(c3);

		if (v3) {
			increment(unigram_map, c3);

			if (v2) {
				increment(bigram_map, `${c2}${c3}`);

				if (v1) {
					increment(trigram_map, `${c1}${c2}${c3}`);
				}
			}
		}

		c1 = c2;
		v1 = v2;
		c2 = c3;
		v2 = v3;
	}
};

const start = Date.now();

const count_reader = await duckdb.runAndReadAll("SELECT COUNT(*) FROM 'data/000_00000.parquet';");
const count_first_row = count_reader.getRows()[0];

if (count_first_row === undefined) {
	throw new Error("Could not get data row count");
}

const row_count = Number(count_first_row[0]);

const data_reader = await duckdb.stream("SELECT text FROM 'data/000_00000.parquet';");

let chunk_count = 0;
let rows_read = 0;

while(true) {
	const chunk = await data_reader.fetchChunk();

	if (!chunk || chunk.rowCount === 0) {
		break;
	}

	const text_vector = chunk.getColumnVector(0) as DuckDBVarCharVector;

	for (let i = 0; i < text_vector.itemCount; ++i) {
		const text = text_vector.getItem(i)!;
		computeGrams(text.toLowerCase());
	}

	const unigram_keys = Array.from(unigram_map.keys());
	const bigram_keys = Array.from(bigram_map.keys());
	const trigram_keys = Array.from(trigram_map.keys());

	await Promise.all([
		unigram_lmdb.transaction(async () => {
			const unigram_values = await unigram_lmdb.getMany(unigram_keys);

			for (let i = 0; i < unigram_keys.length; ++i) {
				unigram_lmdb.put(unigram_keys[i]!, (unigram_values[i] ?? 0) + unigram_map.get(unigram_keys[i]!));
			}
		}),
		bigram_lmdb.transaction(async () => {
			const bigram_values = await bigram_lmdb.getMany(bigram_keys);

			for (let i = 0; i < bigram_keys.length; ++i) {
				bigram_lmdb.put(bigram_keys[i]!, (bigram_values[i] ?? 0) + bigram_map.get(bigram_keys[i]!));
			}
		}),
		trigram_lmdb.transaction(async () => {
			const trigram_values = await trigram_lmdb.getMany(trigram_keys);

			for (let i = 0; i < trigram_keys.length; ++i) {
				trigram_lmdb.put(trigram_keys[i]!, (trigram_values[i] ?? 0) + trigram_map.get(trigram_keys[i]!));
			}
		}),
	]);

	unigram_map.clear();
	bigram_map.clear();
	trigram_map.clear();

	rows_read += chunk.rowCount;
	chunk_count++;

	console.log(chunk_count, rows_read, row_count);
}

console.log("Done");

const end = Date.now();

console.log(`Took ${(end - start) / 1_000}s`);
console.log(`Rows read ${rows_read}`);

duckdb.closeSync();

await unigram_lmdb.close();
await bigram_lmdb.close();
await trigram_lmdb.close();
