import { randomInt } from "node:crypto";

export const sleep = (ms: number) => new Promise<void>((resolve) => {
	setTimeout(resolve, ms);
});

export const getRandomSleepDuration = () => randomInt(1_000);
