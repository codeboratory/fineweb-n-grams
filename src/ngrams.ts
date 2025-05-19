export const unigrams_map = new Map<string, number>;
export const bigrams_map = new Map<string, number>;
export const trigrams_map = new Map<string, number>;

const increment = (map: Map<string, number>, key: string) => {
	map.set(key, (map.get(key) ?? 0) + 1);
};

export const computeGrams = (text: string) => {
	let c1: string = "";
	let c2: string = "";

	for (const c3 of text) {
		increment(unigrams_map, c3);
		!!c2 && increment(bigrams_map, `${c2}${c3}`);
		!!c1 && increment(trigrams_map, `${c1}${c2}${c3}`);

		c1 = c2;
		c2 = c3;
	}
};
