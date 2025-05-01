export type NGram = Map<string, number>;

export type NGrams = {
	unigrams: NGram;
	bigrams: NGram;
	trigrams: NGram;
};

export type Noop = () => void;

export type Data = {
	language: string;
	directory: string;
	file: string;
	chunk: number;
};
