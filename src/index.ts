import cluster from "node:cluster";
import { mainProcess } from "./main.ts";
import { workerProcess } from "./worker.ts";

if (cluster.isPrimary) {
	await mainProcess();
} else {
	await workerProcess();
}

