import { availableParallelism } from "node:os";

export const REPOSITORY = "datasets/HuggingFaceFW/fineweb";
export const CHUNK_SIZE = 50_000;
export const WORKER_COUNT = availableParallelism();

export const DATABASE_OPTIONS = {
	compression: false,
	overlappingSync: true,
	noMemInit: true,
	cache: true,
	noSubdir: true,
};
