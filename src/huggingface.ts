import { listFiles, downloadFile, type ListFileEntry } from "@huggingface/hub";
import { createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

export class Huggingface {
	static async getDirectories(repository: string) {
		const directory_response = listFiles({
			repo: repository,
			path: "data",
			accessToken: process.env.HUGGINGFACE_TOKEN,
			recursive: false,
		});

		const directories: string[] = [];

		for await (const directory of directory_response) {
			if (directory.type === "directory") {
				directories.push(directory.path.slice(directory.path.lastIndexOf("/") + 1));
			}
		}

		return directories;
	}

	static async getFiles(repository: string, directory: string) {
		const file_response = listFiles({
			repo: repository,
			path: `data/${directory}`,
			accessToken: process.env.HUGGINGFACE_TOKEN,
			recursive: false,
		});

		const files: string[] = [];

		for await (const file of file_response) {
			if (file.type === "file") {
				files.push(file.path.slice(file.path.lastIndexOf("/") + 1));
			}
		}

		return files;
	}

	static async getFilesRecursive(respository: string) {
		const file_response = listFiles({
			repo: respository,
			path: "data",
			accessToken: process.env.HUGGINGFACE_TOKEN,
			recursive: true
		});

		const directories = new Map<string, string[]>();

		for await (const file of file_response) {
			const path = file.path.split("/");

			if (file.type === "directory") {
				directories.set(path[1]!, []);
			}

			if (file.type === "file") {
				const files = directories.get(path[1]!) ?? [];

				files.push(path[2]!);

				directories.set(path[1]!, files)
			}
		}

		return directories;
	}

	static async existsDataFile(directory: string, file: string) {
		try {
			await stat(`data/${directory}/${file}`);
			return true;
		} catch {
			return false;
		}
	}

	static async downloadDataFile(repository: string, directory: string, file: string) {
		const download_response = await downloadFile({
			repo: repository,
			path: `data/${directory}/${file}`,
			accessToken: process.env.HUGGINGFACE_TOKEN,
		});

		if (!download_response) {
			throw new Error(`Could not download a file ${directory}/${file}`);
		}

		if (!download_response.body) {
			throw new Error(`Could not access body for a file ${directory}/${file}`);
		}

		await mkdir(`./data/${directory}`, {
			recursive: true
		});

		const file_stream = createWriteStream(`./data/${directory}/${file}`);

		await pipeline(download_response.body, file_stream);
	}

	static async removeDataFile(directory: string, file: string) {
		try {
			await rm(`./data/${directory}/${file}`);
		} catch {
			// ignore ..
		}
	}
}


