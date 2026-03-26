import { z } from "zod";

export const releaseStatusValues = ["planned", "active", "completed"] as const;
export const scenarioPriorityValues = ["low", "medium", "high", "critical"] as const;
export const scenarioStatusValues = [
  "draft",
  "ready",
  "in_progress",
  "blocked",
  "done",
] as const;
export const casePriorityValues = ["low", "medium", "high"] as const;
export const automationStatusValues = ["not_automated", "planned", "automated"] as const;
export const runStatusValues = ["not_started", "in_progress", "completed"] as const;
export const runResultStatusValues = ["not_run", "passed", "failed", "blocked"] as const;

export type ReleaseStatus = (typeof releaseStatusValues)[number];
export type ScenarioPriority = (typeof scenarioPriorityValues)[number];
export type ScenarioStatus = (typeof scenarioStatusValues)[number];
export type CasePriority = (typeof casePriorityValues)[number];
export type AutomationStatus = (typeof automationStatusValues)[number];
export type RunStatus = (typeof runStatusValues)[number];
export type RunResultStatus = (typeof runResultStatusValues)[number];

export const ReleaseStatusSchema = z.enum(releaseStatusValues);
export const ScenarioPrioritySchema = z.enum(scenarioPriorityValues);
export const ScenarioStatusSchema = z.enum(scenarioStatusValues);
export const CasePrioritySchema = z.enum(casePriorityValues);
export const AutomationStatusSchema = z.enum(automationStatusValues);
export const RunStatusSchema = z.enum(runStatusValues);
export const RunResultStatusSchema = z.enum(runResultStatusValues);

export interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Release {
  id: number;
  project_id: number;
  name: string;
  version: string;
  description: string;
  status: ReleaseStatus;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scenario {
  id: number;
  project_id: number;
  release_id: number | null;
  title: string;
  description: string;
  priority: ScenarioPriority;
  status: ScenarioStatus;
  is_regression: boolean;
  is_acceptance: boolean;
  is_smoke: boolean;
  is_automation: boolean;
  owner: string;
  labels: string[];
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  id: number;
  scenario_id: number;
  title: string;
  preconditions: string;
  steps: string;
  expected_result: string;
  priority: CasePriority;
  automation_status: AutomationStatus;
  created_at: string;
  updated_at: string;
}

export interface TestRun {
  id: number;
  project_id: number;
  release_id: number | null;
  name: string;
  description: string;
  status: RunStatus;
  created_at: string;
  updated_at: string;
}

export interface TestRunResult {
  id: number;
  test_run_id: number;
  test_case_id: number;
  status: RunResultStatus;
  actual_result: string;
  notes: string;
  executed_by: string;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  projects: Project[];
  recentReleases: Release[];
  recentRuns: TestRun[];
  summary: {
    totalScenarios: number;
    totalTestCases: number;
    activeReleases: number;
    runsInProgress: number;
  };
}

export interface ProjectDetails {
  project: Project;
  releases: Release[];
  scenarios: Scenario[];
  testCases: TestCase[];
  testRuns: TestRun[];
  runResults: TestRunResult[];
  counts: {
    testCasesByScenario: Record<number, number>;
    releaseCounts: Record<number, { scenarios: number; runs: number }>;
  };
}

export type Id = number;
export type ScenarioFlag = "regression" | "acceptance" | "smoke" | "automation";

export interface ScenarioFilters {
  release_id?: number;
  priority?: ScenarioPriority;
  status?: ScenarioStatus;
  tag?: ScenarioFlag;
  is_regression?: boolean;
  is_acceptance?: boolean;
  is_smoke?: boolean;
  is_automation?: boolean;
  search?: string;
}

export interface DatabaseSnapshot {
  projects: Project[];
  releases: Release[];
  scenarios: Scenario[];
  testCases: TestCase[];
  testRuns: TestRun[];
  runResults: TestRunResult[];
}

export type NewProject = Pick<Project, "name" | "description">;
export type UpdateProject = Partial<NewProject>;

export type NewRelease = Pick<
  Release,
  "project_id" | "name" | "version" | "description" | "status" | "target_date"
>;
export type UpdateRelease = Partial<NewRelease>;

export type NewTestScenario = Pick<
  Scenario,
  | "project_id"
  | "release_id"
  | "title"
  | "description"
  | "priority"
  | "status"
  | "is_regression"
  | "is_acceptance"
  | "is_smoke"
  | "is_automation"
  | "owner"
  | "labels"
>;
export type UpdateTestScenario = Partial<NewTestScenario>;

export type NewTestCase = Pick<
  TestCase,
  | "scenario_id"
  | "title"
  | "preconditions"
  | "steps"
  | "expected_result"
  | "priority"
  | "automation_status"
>;
export type UpdateTestCase = Partial<NewTestCase>;

export type NewTestRun = Pick<
  TestRun,
  "project_id" | "release_id" | "name" | "description" | "status"
> & {
  scenario_ids?: number[];
};
export type UpdateTestRun = Partial<NewTestRun>;

export type NewRunResult = Pick<
  TestRunResult,
  "test_run_id" | "test_case_id" | "status" | "actual_result" | "notes" | "executed_by"
>;
export type UpdateRunResult = Partial<
  Pick<TestRunResult, "status" | "actual_result" | "notes" | "executed_by" | "executed_at">
>;

