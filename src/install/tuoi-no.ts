import { runTuoiNoReport } from "../egas/report-service.js";

try {
    console.log(JSON.stringify(await runTuoiNoReport(), null, 2));
} catch (error: unknown) {
    const result = { success: false, command: "tuoi-no", error: error instanceof Error ? error.message : String(error) };
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
}
