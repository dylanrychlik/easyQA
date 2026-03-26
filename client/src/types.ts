export type ReleaseStatus = "planned" | "active" | "completed";
export type ScenarioPriority = "low" | "medium" | "high" | "critical";
export type ScenarioStatus = "draft" | "ready" | "in_progress" | "blocked" | "done";
export type CasePriority = "low" | "medium" | "high";
export type AutomationStatus = "not_automated" | "planned" | "automated";
export type RunStatus = "not_started" | "in_progress" | "completed";
export type RunResultStatus = "not_run" | "passed" | "failed" | "blocked";

export type ScenarioTypeTag = "regression" | "acceptance" | "smoke" | "automation";
export type ApiError = { error?: string };
export type ApiErrorResponse = ApiError;
export type ResultStatus = RunResultStatus;
export type ScenarioTag = ScenarioTypeTag;
export type TestCasePriority = CasePriority;
export type TestRunStatus = RunStatus;
export type TestCaseEntity = TestCase;
export type TestRunEntity = TestRun;
export type TestRunResultEntity = TestRunResult;
export type ProjectEntity = Project;
export type ReleaseEntity = Release;
export type ScenarioEntity = Scenario;

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
  tags: ScenarioTypeTag[];
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
}

export type ProjectData = ProjectDetails;
