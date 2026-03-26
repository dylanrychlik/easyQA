import cors from "cors";
import express from "express";
import path from "node:path";
import { z } from "zod";
import { store } from "./store";
import type {
  CasePriority,
  RunResultStatus,
  RunStatus,
  ScenarioPriority,
  ScenarioStatus,
} from "./types";

const app = express();

app.use(cors());
app.use(express.json());

const scenarioPrioritySchema = z.enum(["low", "medium", "high", "critical"]);
const scenarioStatusSchema = z.enum(["draft", "ready", "in_progress", "blocked", "done"]);
const releaseStatusSchema = z.enum(["planned", "active", "completed"]);
const testCasePrioritySchema = z.enum(["low", "medium", "high"]);
const automationStatusSchema = z.enum(["not_automated", "planned", "automated"]);
const testRunStatusSchema = z.enum(["not_started", "in_progress", "completed"]);
const runResultStatusSchema = z.enum(["not_run", "passed", "failed", "blocked"]);

const projectCreateSchema = z.object({
  name: z.string().min(2),
  description: z.string().default(""),
});

const projectUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
});

const releaseCreateSchema = z.object({
  project_id: z.number().int().positive(),
  name: z.string().min(2),
  version: z.string().min(1),
  description: z.string().default(""),
  status: releaseStatusSchema.default("planned"),
  target_date: z.string().nullable().default(null),
});

const releaseUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  version: z.string().min(1).optional(),
  description: z.string().optional(),
  status: releaseStatusSchema.optional(),
  target_date: z.string().nullable().optional(),
  project_id: z.number().int().positive().optional(),
});

const scenarioCreateSchema = z.object({
  project_id: z.number().int().positive(),
  release_id: z.number().int().positive().nullable().default(null),
  title: z.string().min(2),
  description: z.string().default(""),
  priority: scenarioPrioritySchema.default("medium"),
  status: scenarioStatusSchema.default("draft"),
  is_regression: z.boolean().default(false),
  is_acceptance: z.boolean().default(false),
  is_smoke: z.boolean().default(false),
  is_automation: z.boolean().default(false),
  owner: z.string().default(""),
  labels: z.array(z.string()).optional(),
});

const scenarioUpdateSchema = z.object({
  project_id: z.number().int().positive().optional(),
  release_id: z.number().int().positive().nullable().optional(),
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  priority: scenarioPrioritySchema.optional(),
  status: scenarioStatusSchema.optional(),
  is_regression: z.boolean().optional(),
  is_acceptance: z.boolean().optional(),
  is_smoke: z.boolean().optional(),
  is_automation: z.boolean().optional(),
  owner: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

const testCaseCreateSchema = z.object({
  scenario_id: z.number().int().positive(),
  title: z.string().min(2),
  preconditions: z.string().default(""),
  steps: z.string().default(""),
  expected_result: z.string().default(""),
  priority: testCasePrioritySchema.default("medium"),
  automation_status: automationStatusSchema.default("not_automated"),
});

const testCaseUpdateSchema = z.object({
  scenario_id: z.number().int().positive().optional(),
  title: z.string().min(2).optional(),
  preconditions: z.string().optional(),
  steps: z.string().optional(),
  expected_result: z.string().optional(),
  priority: testCasePrioritySchema.optional(),
  automation_status: automationStatusSchema.optional(),
});

const testRunCreateSchema = z.object({
  project_id: z.number().int().positive(),
  release_id: z.number().int().positive().nullable().default(null),
  name: z.string().min(2),
  description: z.string().default(""),
  status: testRunStatusSchema.default("not_started"),
  scenario_ids: z.array(z.number().int().positive()).default([]).optional(),
});

const testRunUpdateSchema = z.object({
  project_id: z.number().int().positive().optional(),
  release_id: z.number().int().positive().nullable().optional(),
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  status: testRunStatusSchema.optional(),
});

const resultUpdateSchema = z.object({
  status: runResultStatusSchema.optional(),
  actual_result: z.string().optional(),
  notes: z.string().optional(),
  executed_by: z.string().optional(),
});

const cloneCasesSchema = z.object({
  target_release_id: z.number().int().positive(),
});

type QueryFilters = {
  release_id?: number;
  priority?: ScenarioPriority;
  is_regression?: boolean;
  is_acceptance?: boolean;
  is_smoke?: boolean;
  is_automation?: boolean;
  search?: string;
};

function parseId(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Invalid id");
  }
  return parsed;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value !== "string") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/dashboard", (_req, res) => {
  res.json(store.getDashboard());
});

app.get("/api/projects/:projectId", (req, res) => {
  const projectId = parseId(req.params.projectId);
  const details = store.getProjectDetails(projectId);
  if (!details) return res.status(404).json({ error: "Project not found" });
  const runResults = details.testRuns.flatMap((run: { id: number }) => store.getRunResults(run.id));
  res.json({ ...details, runResults });
});

// Backward-compatible alias used by existing frontend clients.
app.get("/api/projects/:projectId/details", (req, res) => {
  const projectId = parseId(req.params.projectId);
  const details = store.getProjectDetails(projectId);
  if (!details) return res.status(404).json({ error: "Project not found" });
  const runResults = details.testRuns.flatMap((run: { id: number }) => store.getRunResults(run.id));
  res.json({ ...details, runResults });
});

app.post("/api/projects", (req, res) => {
  const payload = projectCreateSchema.parse(req.body);
  res.status(201).json(store.createProject(payload));
});

app.put("/api/projects/:projectId", (req, res) => {
  const projectId = parseId(req.params.projectId);
  const payload = projectUpdateSchema.parse(req.body);
  const updated = store.updateProject(projectId, payload);
  if (!updated) return res.status(404).json({ error: "Project not found" });
  res.json(updated);
});

app.delete("/api/projects/:projectId", (req, res) => {
  const projectId = parseId(req.params.projectId);
  store.deleteProject(projectId);
  res.status(204).send();
});

app.post("/api/releases", (req, res) => {
  const payload = releaseCreateSchema.parse(req.body);
  res.status(201).json(store.createRelease(payload));
});

app.put("/api/releases/:releaseId", (req, res) => {
  const releaseId = parseId(req.params.releaseId);
  const payload = releaseUpdateSchema.parse(req.body);
  const updated = store.updateRelease(releaseId, payload);
  if (!updated) return res.status(404).json({ error: "Release not found" });
  res.json(updated);
});

app.delete("/api/releases/:releaseId", (req, res) => {
  store.deleteRelease(parseId(req.params.releaseId));
  res.status(204).send();
});

app.get("/api/scenarios", (req, res) => {
  const projectId = parseId(String(req.query.project_id ?? "0"));
  const filters: QueryFilters = {};

  if (req.query.release_id !== undefined && req.query.release_id !== "") {
    const parsed = Number(req.query.release_id);
    if (Number.isInteger(parsed) && parsed > 0) filters.release_id = parsed;
  }
  if (typeof req.query.priority === "string") {
    filters.priority = scenarioPrioritySchema.parse(req.query.priority);
  }
  const isRegression = parseOptionalBoolean(req.query.is_regression);
  const isAcceptance = parseOptionalBoolean(req.query.is_acceptance);
  const isSmoke = parseOptionalBoolean(req.query.is_smoke);
  const isAutomation = parseOptionalBoolean(req.query.is_automation);
  if (isRegression !== undefined) filters.is_regression = isRegression;
  if (isAcceptance !== undefined) filters.is_acceptance = isAcceptance;
  if (isSmoke !== undefined) filters.is_smoke = isSmoke;
  if (isAutomation !== undefined) filters.is_automation = isAutomation;
  if (typeof req.query.search === "string" && req.query.search.trim().length > 0) {
    filters.search = req.query.search.trim();
  }

  res.json(store.getScenarios(projectId, filters));
});

app.post("/api/scenarios", (req, res) => {
  const payload = scenarioCreateSchema.parse(req.body);
  res.status(201).json(
    store.createScenario({
      ...payload,
      labels: payload.labels ?? [],
    }),
  );
});

app.put("/api/scenarios/:scenarioId", (req, res) => {
  const scenarioId = parseId(req.params.scenarioId);
  const payload = scenarioUpdateSchema.parse(req.body);
  const updated = store.updateScenario(scenarioId, payload);
  if (!updated) return res.status(404).json({ error: "Scenario not found" });
  res.json(updated);
});

app.delete("/api/scenarios/:scenarioId", (req, res) => {
  store.deleteScenario(parseId(req.params.scenarioId));
  res.status(204).send();
});

app.post("/api/scenarios/:scenarioId/duplicate", (req, res) => {
  const duplicated = store.duplicateScenario(parseId(req.params.scenarioId));
  if (!duplicated) return res.status(404).json({ error: "Scenario not found" });
  res.status(201).json(duplicated);
});

app.post("/api/scenarios/:scenarioId/clone-cases", (req, res) => {
  const scenarioId = parseId(req.params.scenarioId);
  const payload = cloneCasesSchema.parse(req.body);
  const cloned = store.cloneScenarioToRelease(scenarioId, payload.target_release_id);
  if (!cloned) return res.status(404).json({ error: "Scenario not found" });
  res.status(201).json(cloned);
});

app.get("/api/scenarios/:scenarioId/test-cases", (req, res) => {
  res.json(store.getTestCases(parseId(req.params.scenarioId)));
});

app.post("/api/test-cases", (req, res) => {
  const payload = testCaseCreateSchema.parse(req.body);
  res.status(201).json(store.createTestCase(payload));
});

app.put("/api/test-cases/:testCaseId", (req, res) => {
  const testCaseId = parseId(req.params.testCaseId);
  const payload = testCaseUpdateSchema.parse(req.body);
  const updated = store.updateTestCase(testCaseId, payload);
  if (!updated) return res.status(404).json({ error: "Test case not found" });
  res.json(updated);
});

app.delete("/api/test-cases/:testCaseId", (req, res) => {
  store.deleteTestCase(parseId(req.params.testCaseId));
  res.status(204).send();
});

app.post("/api/test-runs", (req, res) => {
  const payload = testRunCreateSchema.parse(req.body);
  res.status(201).json(store.createTestRun(payload));
});

app.put("/api/test-runs/:testRunId", (req, res) => {
  const testRunId = parseId(req.params.testRunId);
  const payload = testRunUpdateSchema.parse(req.body);
  const updated = store.updateTestRun(testRunId, payload);
  if (!updated) return res.status(404).json({ error: "Test run not found" });
  res.json(updated);
});

app.delete("/api/test-runs/:testRunId", (req, res) => {
  store.deleteTestRun(parseId(req.params.testRunId));
  res.status(204).send();
});

app.get("/api/test-runs/:testRunId/results", (req, res) => {
  const testRunId = parseId(req.params.testRunId);
  res.json(store.getRunResults(testRunId));
});

app.post("/api/test-runs/:testRunId/initialize", (req, res) => {
  const testRunId = parseId(req.params.testRunId);
  const payload = z.object({ testCaseIds: z.array(z.number().int().positive()) }).parse(req.body);
  res.json(store.initializeRunResults(testRunId, payload.testCaseIds));
});

app.put("/api/test-runs/:testRunId/results/:resultId", (req, res) => {
  const testRunId = parseId(req.params.testRunId);
  const run = store.getTestRuns().find((item: { id: number }) => item.id === testRunId);
  if (!run) return res.status(404).json({ error: "Run not found" });
  const resultId = parseId(req.params.resultId);
  const payload = resultUpdateSchema.parse(req.body);
  const updated = store.updateRunResult(resultId, payload);
  if (!updated) return res.status(404).json({ error: "Run result not found" });
  if (updated.test_run_id !== testRunId) {
    return res.status(404).json({ error: "Run result not found" });
  }
  res.json(updated);
});

const clientDistPath = path.resolve(process.cwd(), "../client/dist");
app.use(express.static(clientDistPath));
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.issues });
  }
  const message = err instanceof Error ? err.message : "Unexpected error";
  res.status(500).json({ error: message });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}`);
});

export const _types = {
  scenarioStatusSchema,
  scenarioPrioritySchema,
  testCasePrioritySchema,
  automationStatusSchema,
  testRunStatusSchema,
  runResultStatusSchema,
} satisfies {
  scenarioStatusSchema: z.ZodType<ScenarioStatus>;
  scenarioPrioritySchema: z.ZodType<ScenarioPriority>;
  testCasePrioritySchema: z.ZodType<CasePriority>;
  automationStatusSchema: z.ZodType<"not_automated" | "planned" | "automated">;
  testRunStatusSchema: z.ZodType<RunStatus>;
  runResultStatusSchema: z.ZodType<RunResultStatus>;
};
