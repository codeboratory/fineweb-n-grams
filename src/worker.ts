export const workerProcess = async () => {
	process.on("message", (data) => {
		console.log("Data from main: ", data);
	});

	process.send(true);

	// console.log("THREAD Worker");
	//
	// const text_decoder = new TextDecoder();
	//
	// const instance = await DuckDBInstance.create(':memory:', {
	//   threads: WORKER_COUNT
	// });
	//
	// const duckdb = await instance.connect();
	// const read_query = await duckdb.prepare("SELECT text FROM read_parquet($1) LIMIT $2 OFFSET $3;");
	//
	// // TODO: has to be mutable
	// const database = openDatabase("english");
	//
	// const files_db = database.openDB({ name: "files" });
	// const unigrams_db = database.openDB({ name: "unigrams" });
	// const bigrams_db = database.openDB({ name: "bigrams" });
	// const trigrams_db = database.openDB({ name: "trigrams" });
	//
	// process.on("message", async (event) => {
	// 	console.log("Main message", event);
	//
	// 	const input = event as Input;
	//
	// 	read_query.bindVarchar(1, `data/${input.dir}/${input.file}`);
	// 	read_query.bindInteger(2, input.limit);
	// 	read_query.bindInteger(3, input.offset);
	//
	// 	const data_reader = await read_query.stream();
	//
	// 	while(true) {
	// 		unigrams_map.clear();
	// 		bigrams_map.clear();
	// 		trigrams_map.clear();
	//
	// 		const chunk = await data_reader.fetchChunk();
	//
	// 		if (!chunk || chunk.rowCount === 0) {
	// 			break;
	// 		}
	//
	// 		const text_vector = chunk.getColumnVector(0) as DuckDBVarCharVector;
	// 		const data_view = text_vector.dataView as DataView;
	// 		const buffer = data_view.buffer as ArrayBuffer;
	//
	// 		for (let i = 0; i < text_vector.itemCount; ++i) {
	// 			computeGrams(
	// 				text_decoder.decode(
	// 					bindings.get_data_from_pointer(
	// 						buffer,
	// 						data_view.byteOffset + (i * 16) + 8,
	// 						data_view.getUint32(i * 16, true)
	// 					)
	// 				)
	// 			);
	// 		}
	//
	// 		await unigrams_db.transaction(() => {
	// 			const file_value = files_db.get(input.file) as FileValue;
	//
	// 			file_value.chunks[input.index] = true;
	// 			file_value.done = file_value.chunks.includes(false);
	//
	// 			files_db.put(input.file, file_value);
	//
	// 			for (const [key, value] of unigrams_map) {
	// 				unigrams_db.put(key, (unigrams_db.get(key) ?? 0) + value);
	// 			}
	//
	// 			for (const [key, value] of bigrams_map) {
	// 				bigrams_db.put(key, (bigrams_db.get(key) ?? 0) + value);
	// 			}
	//
	// 			for (const [key, value] of trigrams_map) {
	// 				trigrams_db.put(key, (trigrams_db.get(key) ?? 0) + value);
	// 			}
	// 		});
	// 	}
	//
	// 	process.send(State.DONE);
	// });
	//
	// process.send(State.READY);
};
