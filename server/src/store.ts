import type {
  AutomationStatus,
  CasePriority,
  DashboardData,
  Id,
  Project,
  ProjectDetails,
  Release,
  ReleaseStatus,
  RunResultStatus,
  Scenario,
  ScenarioPriority,
  ScenarioStatus,
  TestCase,
  TestRun,
  TestRunResult,
} from "./types";

type ScenarioCounts = Record<number, number>;
type ReleaseCounts = Record<number, { scenarios: number; runs: number }>;
type ScenarioTag = "regression" | "acceptance" | "smoke" | "automation";

export type ProjectData = {
  project: Project;
  releases: Release[];
  scenarios: Scenario[];
  testCases: TestCase[];
  testRuns: TestRun[];
  runResults: TestRunResult[];
  counts: {
    testCasesByScenario: ScenarioCounts;
    releaseCounts: ReleaseCounts;
  };
};

export type SeedStore = {
  getDashboard: () => DashboardData;
  getProjectDetails: (projectId: Id) => ProjectData | null;
  createProject: (input: Pick<Project, "name" | "description">) => Project;
  updateProject: (
    id: Id,
    input: Partial<Pick<Project, "name" | "description">>,
  ) => Project | null;
  deleteProject: (id: Id) => boolean;
  createRelease: (
    input: Omit<Release, "id" | "created_at" | "updated_at">,
  ) => Release;
  updateRelease: (
    id: Id,
    input: Partial<Omit<Release, "id" | "created_at" | "updated_at">>,
  ) => Release | null;
  deleteRelease: (id: Id) => boolean;
  getScenarios: (projectId: Id, filters?: {
    release_id?: number;
    priority?: ScenarioPriority;
    is_regression?: boolean;
    is_acceptance?: boolean;
    is_smoke?: boolean;
    is_automation?: boolean;
    search?: string;
  }) => Scenario[];
  createScenario: (
    input: Omit<Scenario, "id" | "created_at" | "updated_at">,
  ) => Scenario;
  updateScenario: (
    id: Id,
    input: Partial<Omit<Scenario, "id" | "created_at" | "updated_at">>,
  ) => Scenario | null;
  deleteScenario: (id: Id) => boolean;
  duplicateScenario: (id: Id) => Scenario | null;
  cloneScenarioToRelease: (id: Id, targetReleaseId: Id) => Scenario | null;
  getTestCases: (scenarioId?: Id) => TestCase[];
  createTestCase: (
    input: Omit<TestCase, "id" | "created_at" | "updated_at">,
  ) => TestCase;
  updateTestCase: (
    id: Id,
    input: Partial<Omit<TestCase, "id" | "created_at" | "updated_at">>,
  ) => TestCase | null;
  deleteTestCase: (id: Id) => boolean;
  getTestRuns: (projectId?: Id) => TestRun[];
  createTestRun: (
    input: Omit<TestRun, "id" | "created_at" | "updated_at"> & { scenario_ids?: number[] },
  ) => TestRun;
  updateTestRun: (
    id: Id,
    input: Partial<Omit<TestRun, "id" | "created_at" | "updated_at">>,
  ) => TestRun | null;
  deleteTestRun: (id: Id) => boolean;
  initializeRunResults: (runId: Id, testCaseIds: Id[]) => TestRunResult[];
  getRunResults: (runId: Id) => TestRunResult[];
  updateRunResult: (
    id: Id,
    input: Partial<Omit<TestRunResult, "id" | "test_run_id" | "test_case_id" | "created_at" | "updated_at">>,
  ) => TestRunResult | null;
};

type SeedState = {
  projects: Project[];
  releases: Release[];
  scenarios: Scenario[];
  testCases: TestCase[];
  testRuns: TestRun[];
  runResults: TestRunResult[];
  nextId: number;
};

const scenarioPriorities: ScenarioPriority[] = ["low", "medium", "high", "critical"];
const scenarioStatuses: ScenarioStatus[] = ["draft", "ready", "in_progress", "blocked", "done"];
const releaseStatuses: ReleaseStatus[] = ["planned", "active", "completed"];
const casePriorities: CasePriority[] = ["low", "medium", "high"];
const automationStatuses: AutomationStatus[] = ["not_automated", "planned", "automated"];
const runStatuses: TestRun["status"][] = ["not_started", "in_progress", "completed"];
const runResultStatuses: RunResultStatus[] = ["not_run", "passed", "failed", "blocked"];

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nowIso() {
  return new Date().toISOString();
}

function boolFromUnknown(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function validScenarioPriority(value: unknown): ScenarioPriority {
  return scenarioPriorities.includes(value as ScenarioPriority)
    ? (value as ScenarioPriority)
    : "medium";
}

function validScenarioStatus(value: unknown): ScenarioStatus {
  return scenarioStatuses.includes(value as ScenarioStatus)
    ? (value as ScenarioStatus)
    : "draft";
}

function validReleaseStatus(value: unknown): ReleaseStatus {
  return releaseStatuses.includes(value as ReleaseStatus)
    ? (value as ReleaseStatus)
    : "planned";
}

function validCasePriority(value: unknown): CasePriority {
  return casePriorities.includes(value as CasePriority) ? (value as CasePriority) : "medium";
}

function validAutomationStatus(value: unknown): AutomationStatus {
  return automationStatuses.includes(value as AutomationStatus)
    ? (value as AutomationStatus)
    : "not_automated";
}

function validRunStatus(value: unknown): TestRun["status"] {
  return runStatuses.includes(value as TestRun["status"])
    ? (value as TestRun["status"])
    : "not_started";
}

function validRunResultStatus(value: unknown): RunResultStatus {
  return runResultStatuses.includes(value as RunResultStatus)
    ? (value as RunResultStatus)
    : "not_run";
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function tagsFromScenario(s: Pick<
  Scenario,
  "is_regression" | "is_acceptance" | "is_smoke" | "is_automation"
>): ScenarioTag[] {
  const tags: ScenarioTag[] = [];
  if (s.is_regression) tags.push("regression");
  if (s.is_acceptance) tags.push("acceptance");
  if (s.is_smoke) tags.push("smoke");
  if (s.is_automation) tags.push("automation");
  return tags;
}

function seedSnapshot(): SeedState {
  const now = nowIso();
  const project: Project = {
    id: 1,
    name: "Velocity Commerce",
    description: "QA workspace for checkout, promotions, and account reliability.",
    created_at: now,
    updated_at: now,
  };

  const releases: Release[] = [
    {
      id: 1,
      project_id: 1,
      name: "Spring Checkout Refresh",
      version: "v2.4.0",
      description: "UX polish and payment hardening.",
      status: "active",
      target_date: "2026-04-15",
      created_at: now,
      updated_at: now,
    },
    {
      id: 2,
      project_id: 1,
      name: "Loyalty Expansion",
      version: "v2.5.0",
      description: "Rewards points and promo stack updates.",
      status: "planned",
      target_date: "2026-05-20",
      created_at: now,
      updated_at: now,
    },
  ];

  const scenarios: Scenario[] = [
    {
      id: 1,
      project_id: 1,
      release_id: 1,
      title: "Checkout with multiple payment methods",
      description: "Validate card, wallet, and fallback payment options.",
      priority: "critical",
      status: "in_progress",
      is_regression: true,
      is_acceptance: true,
      is_smoke: true,
      is_automation: true,
      owner: "Avery",
      labels: ["checkout", "payments"],
      created_at: now,
      updated_at: now,
    },
    {
      id: 2,
      project_id: 1,
      release_id: 1,
      title: "Promo code conflict handling",
      description: "Ensure stacked and invalid promos behave predictably.",
      priority: "high",
      status: "blocked",
      is_regression: true,
      is_acceptance: false,
      is_smoke: false,
      is_automation: false,
      owner: "Jordan",
      labels: ["promo"],
      created_at: now,
      updated_at: now,
    },
    {
      id: 3,
      project_id: 1,
      release_id: 2,
      title: "Loyalty points redemption at checkout",
      description: "Users can redeem points and apply eligible discounts.",
      priority: "medium",
      status: "ready",
      is_regression: false,
      is_acceptance: true,
      is_smoke: false,
      is_automation: false,
      owner: "Mina",
      labels: ["loyalty"],
      created_at: now,
      updated_at: now,
    },
    {
      id: 4,
      project_id: 1,
      release_id: null,
      title: "Guest account recovery emails",
      description: "Recovery flow should be reliable and secure.",
      priority: "low",
      status: "draft",
      is_regression: false,
      is_acceptance: false,
      is_smoke: false,
      is_automation: true,
      owner: "Sam",
      labels: [],
      created_at: now,
      updated_at: now,
    },
  ];

  const testCases: TestCase[] = [
    {
      id: 1,
      scenario_id: 1,
      title: "Card payment succeeds",
      preconditions: "User has one item in cart.",
      steps: "Enter valid card details and submit checkout.",
      expected_result: "Order confirmation is displayed and email sent.",
      priority: "high",
      automation_status: "automated",
      created_at: now,
      updated_at: now,
    },
    {
      id: 2,
      scenario_id: 1,
      title: "Tax recalculation after shipping change",
      preconditions: "Cart has taxable product.",
      steps: "Change shipping address from CA to NY and refresh summary.",
      expected_result: "Tax totals update accurately.",
      priority: "high",
      automation_status: "planned",
      created_at: now,
      updated_at: now,
    },
    {
      id: 3,
      scenario_id: 2,
      title: "Reject invalid promo code",
      preconditions: "Checkout loaded with active cart.",
      steps: "Apply expired promo code.",
      expected_result: "Inline error shown and totals unchanged.",
      priority: "medium",
      automation_status: "not_automated",
      created_at: now,
      updated_at: now,
    },
    {
      id: 4,
      scenario_id: 3,
      title: "Redeem loyalty points with free shipping",
      preconditions: "User has sufficient points and eligible cart.",
      steps: "Apply loyalty points and free shipping promo.",
      expected_result: "Totals reflect both adjustments correctly.",
      priority: "medium",
      automation_status: "planned",
      created_at: now,
      updated_at: now,
    },
    {
      id: 5,
      scenario_id: 4,
      title: "Send recovery email to guest user",
      preconditions: "Guest order exists with valid email.",
      steps: "Trigger recovery action from account lookup.",
      expected_result: "Recovery email delivered within expected SLA.",
      priority: "low",
      automation_status: "automated",
      created_at: now,
      updated_at: now,
    },
  ];

  const testRuns: TestRun[] = [
    {
      id: 1,
      project_id: 1,
      release_id: 1,
      name: "Checkout regression sweep",
      description: "Critical path verification for Spring release.",
      status: "in_progress",
      created_at: now,
      updated_at: now,
    },
    {
      id: 2,
      project_id: 1,
      release_id: 2,
      name: "Loyalty pre-release run",
      description: "Pre-flight run for loyalty feature branch.",
      status: "not_started",
      created_at: now,
      updated_at: now,
    },
  ];

  const runResults: TestRunResult[] = [
    {
      id: 1,
      test_run_id: 1,
      test_case_id: 1,
      status: "passed",
      actual_result: "Checkout succeeded with valid card details.",
      notes: "Happy path validated.",
      executed_by: "Avery",
      executed_at: now,
      created_at: now,
      updated_at: now,
    },
    {
      id: 2,
      test_run_id: 1,
      test_case_id: 2,
      status: "failed",
      actual_result: "Tax total inconsistent after shipping update.",
      notes: "Raised bug QA-129.",
      executed_by: "Avery",
      executed_at: now,
      created_at: now,
      updated_at: now,
    },
    {
      id: 3,
      test_run_id: 1,
      test_case_id: 3,
      status: "blocked",
      actual_result: "",
      notes: "Payment sandbox unavailable.",
      executed_by: "Jordan",
      executed_at: now,
      created_at: now,
      updated_at: now,
    },
    {
      id: 4,
      test_run_id: 2,
      test_case_id: 4,
      status: "not_run",
      actual_result: "",
      notes: "",
      executed_by: "",
      executed_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 5,
      test_run_id: 2,
      test_case_id: 5,
      status: "not_run",
      actual_result: "",
      notes: "",
      executed_by: "",
      executed_at: null,
      created_at: now,
      updated_at: now,
    },
  ];

  return {
    projects: [project],
    releases,
    scenarios,
    testCases,
    testRuns,
    runResults,
    nextId: 100,
  };
}

function nextId(state: SeedState): Id {
  const current = state.nextId;
  state.nextId += 1;
  return current;
}

export function createSeedStore(): SeedStore {
  const state = seedSnapshot();

  function getProject(projectId: Id) {
    return state.projects.find((p) => p.id === projectId) ?? null;
  }

  function getDashboard(): DashboardData {
    return {
      projects: clone(state.projects),
      recentReleases: clone(
        [...state.releases].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)).slice(0, 6),
      ),
      recentRuns: clone(
        [...state.testRuns].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)).slice(0, 6),
      ),
      summary: {
        totalScenarios: state.scenarios.length,
        totalTestCases: state.testCases.length,
        activeReleases: state.releases.filter((r) => r.status === "active").length,
        runsInProgress: state.testRuns.filter((r) => r.status === "in_progress").length,
      },
    };
  }

  function getProjectDetails(projectId: Id): ProjectData | null {
    const project = getProject(projectId);
    if (!project) return null;
    const releases = state.releases.filter((r) => r.project_id === projectId);
    const scenarios = state.scenarios.filter((s) => s.project_id === projectId);
    const scenarioIds = new Set(scenarios.map((s) => s.id));
    const testCases = state.testCases.filter((tc) => scenarioIds.has(tc.scenario_id));
    const testRuns = state.testRuns.filter((tr) => tr.project_id === projectId);
    const runIds = new Set(testRuns.map((tr) => tr.id));
    const runResults = state.runResults.filter((rr) => runIds.has(rr.test_run_id));

    const testCasesByScenario: ScenarioCounts = {};
    for (const tc of testCases) {
      testCasesByScenario[tc.scenario_id] = (testCasesByScenario[tc.scenario_id] ?? 0) + 1;
    }
    const releaseCounts: ReleaseCounts = {};
    for (const release of releases) {
      releaseCounts[release.id] = { scenarios: 0, runs: 0 };
    }
    for (const scenario of scenarios) {
      if (scenario.release_id && releaseCounts[scenario.release_id]) {
        releaseCounts[scenario.release_id].scenarios += 1;
      }
    }
    for (const run of testRuns) {
      if (run.release_id && releaseCounts[run.release_id]) {
        releaseCounts[run.release_id].runs += 1;
      }
    }

    return {
      project: clone(project),
      releases: clone(releases),
      scenarios: clone(scenarios),
      testCases: clone(testCases),
      testRuns: clone(testRuns),
      runResults: clone(runResults),
      counts: { testCasesByScenario, releaseCounts },
    };
  }

  function createProject(input: Pick<Project, "name" | "description">): Project {
    const now = nowIso();
    const project: Project = {
      id: nextId(state),
      name: normalizeText(input.name),
      description: normalizeText(input.description),
      created_at: now,
      updated_at: now,
    };
    state.projects.push(project);
    return clone(project);
  }

  function updateProject(
    id: Id,
    input: Partial<Pick<Project, "name" | "description">>,
  ): Project | null {
    const project = getProject(id);
    if (!project) return null;
    if (input.name !== undefined) project.name = normalizeText(input.name);
    if (input.description !== undefined) project.description = normalizeText(input.description);
    project.updated_at = nowIso();
    return clone(project);
  }

  function deleteProject(id: Id): boolean {
    if (!getProject(id)) return false;
    const releaseIds = new Set(state.releases.filter((r) => r.project_id === id).map((r) => r.id));
    const scenarioIds = new Set(state.scenarios.filter((s) => s.project_id === id).map((s) => s.id));
    const caseIds = new Set(state.testCases.filter((c) => scenarioIds.has(c.scenario_id)).map((c) => c.id));
    const runIds = new Set(state.testRuns.filter((r) => r.project_id === id).map((r) => r.id));

    state.projects = state.projects.filter((p) => p.id !== id);
    state.releases = state.releases.filter((r) => r.project_id !== id);
    state.scenarios = state.scenarios.filter((s) => s.project_id !== id);
    state.testCases = state.testCases.filter((c) => !scenarioIds.has(c.scenario_id));
    state.testRuns = state.testRuns.filter((r) => r.project_id !== id);
    state.runResults = state.runResults.filter(
      (rr) => !runIds.has(rr.test_run_id) && !caseIds.has(rr.test_case_id),
    );

    if (releaseIds.size > 0) {
      state.scenarios = state.scenarios.map((s) =>
        s.release_id && releaseIds.has(s.release_id)
          ? { ...s, release_id: null, updated_at: nowIso() }
          : s,
      );
      state.testRuns = state.testRuns.map((r) =>
        r.release_id && releaseIds.has(r.release_id)
          ? { ...r, release_id: null, updated_at: nowIso() }
          : r,
      );
    }
    return true;
  }

  function createRelease(input: Omit<Release, "id" | "created_at" | "updated_at">): Release {
    const now = nowIso();
    const release: Release = {
      id: nextId(state),
      project_id: input.project_id,
      name: normalizeText(input.name),
      version: normalizeText(input.version),
      description: normalizeText(input.description),
      status: validReleaseStatus(input.status),
      target_date: input.target_date ? normalizeText(input.target_date) : null,
      created_at: now,
      updated_at: now,
    };
    state.releases.push(release);
    return clone(release);
  }

  function updateRelease(
    id: Id,
    input: Partial<Omit<Release, "id" | "created_at" | "updated_at">>,
  ): Release | null {
    const release = state.releases.find((r) => r.id === id);
    if (!release) return null;
    if (input.project_id !== undefined) release.project_id = input.project_id;
    if (input.name !== undefined) release.name = normalizeText(input.name);
    if (input.version !== undefined) release.version = normalizeText(input.version);
    if (input.description !== undefined) release.description = normalizeText(input.description);
    if (input.status !== undefined) release.status = validReleaseStatus(input.status);
    if (input.target_date !== undefined) {
      release.target_date = input.target_date ? normalizeText(input.target_date) : null;
    }
    release.updated_at = nowIso();
    return clone(release);
  }

  function deleteRelease(id: Id): boolean {
    if (!state.releases.some((r) => r.id === id)) return false;
    state.releases = state.releases.filter((r) => r.id !== id);
    state.scenarios = state.scenarios.map((s) =>
      s.release_id === id ? { ...s, release_id: null, updated_at: nowIso() } : s,
    );
    state.testRuns = state.testRuns.map((r) =>
      r.release_id === id ? { ...r, release_id: null, updated_at: nowIso() } : r,
    );
    return true;
  }

  function getScenarios(
    projectId: Id,
    filters?: {
      release_id?: number;
      priority?: ScenarioPriority;
      is_regression?: boolean;
      is_acceptance?: boolean;
      is_smoke?: boolean;
      is_automation?: boolean;
      search?: string;
    },
  ): Scenario[] {
    let scenarios = state.scenarios.filter((s) => s.project_id === projectId);
    if (filters?.release_id !== undefined) {
      scenarios = scenarios.filter((s) => s.release_id === filters.release_id);
    }
    if (filters?.priority) scenarios = scenarios.filter((s) => s.priority === filters.priority);
    if (filters?.is_regression !== undefined) {
      scenarios = scenarios.filter((s) => s.is_regression === filters.is_regression);
    }
    if (filters?.is_acceptance !== undefined) {
      scenarios = scenarios.filter((s) => s.is_acceptance === filters.is_acceptance);
    }
    if (filters?.is_smoke !== undefined) {
      scenarios = scenarios.filter((s) => s.is_smoke === filters.is_smoke);
    }
    if (filters?.is_automation !== undefined) {
      scenarios = scenarios.filter((s) => s.is_automation === filters.is_automation);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      scenarios = scenarios.filter((s) => s.title.toLowerCase().includes(q));
    }
    return clone(scenarios.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)));
  }

  function createScenario(input: Omit<Scenario, "id" | "created_at" | "updated_at">): Scenario {
    const now = nowIso();
    const scenario: Scenario = {
      id: nextId(state),
      project_id: input.project_id,
      release_id: input.release_id ?? null,
      title: normalizeText(input.title),
      description: normalizeText(input.description),
      priority: validScenarioPriority(input.priority),
      status: validScenarioStatus(input.status),
      is_regression: boolFromUnknown(input.is_regression),
      is_acceptance: boolFromUnknown(input.is_acceptance),
      is_smoke: boolFromUnknown(input.is_smoke),
      is_automation: boolFromUnknown(input.is_automation),
      owner: normalizeText(input.owner),
      labels: (input.labels ?? []).map(normalizeText).filter(Boolean),
      created_at: now,
      updated_at: now,
    };
    state.scenarios.push(scenario);
    return clone(scenario);
  }

  function updateScenario(
    id: Id,
    input: Partial<Omit<Scenario, "id" | "created_at" | "updated_at">>,
  ): Scenario | null {
    const scenario = state.scenarios.find((s) => s.id === id);
    if (!scenario) return null;
    if (input.project_id !== undefined) scenario.project_id = input.project_id;
    if (input.release_id !== undefined) scenario.release_id = input.release_id;
    if (input.title !== undefined) scenario.title = normalizeText(input.title);
    if (input.description !== undefined) scenario.description = normalizeText(input.description);
    if (input.priority !== undefined) scenario.priority = validScenarioPriority(input.priority);
    if (input.status !== undefined) scenario.status = validScenarioStatus(input.status);
    if (input.owner !== undefined) scenario.owner = normalizeText(input.owner);
    if (input.labels !== undefined) {
      scenario.labels = input.labels.map(normalizeText).filter(Boolean);
    }
    if (input.is_regression !== undefined) scenario.is_regression = boolFromUnknown(input.is_regression);
    if (input.is_acceptance !== undefined) scenario.is_acceptance = boolFromUnknown(input.is_acceptance);
    if (input.is_smoke !== undefined) scenario.is_smoke = boolFromUnknown(input.is_smoke);
    if (input.is_automation !== undefined) scenario.is_automation = boolFromUnknown(input.is_automation);
    scenario.updated_at = nowIso();
    return clone(scenario);
  }

  function deleteScenario(id: Id): boolean {
    if (!state.scenarios.some((s) => s.id === id)) return false;
    const caseIds = new Set(state.testCases.filter((tc) => tc.scenario_id === id).map((tc) => tc.id));
    state.scenarios = state.scenarios.filter((s) => s.id !== id);
    state.testCases = state.testCases.filter((tc) => tc.scenario_id !== id);
    state.runResults = state.runResults.filter((rr) => !caseIds.has(rr.test_case_id));
    return true;
  }

  function duplicateScenario(id: Id): Scenario | null {
    const source = state.scenarios.find((s) => s.id === id);
    if (!source) return null;
    const now = nowIso();
    const duplicated: Scenario = {
      ...clone(source),
      id: nextId(state),
      title: `${source.title} (Copy)`,
      status: "draft",
      created_at: now,
      updated_at: now,
    };
    state.scenarios.push(duplicated);
    const sourceCases = state.testCases.filter((tc) => tc.scenario_id === id);
    for (const sourceCase of sourceCases) {
      const copied: TestCase = {
        ...clone(sourceCase),
        id: nextId(state),
        scenario_id: duplicated.id,
        created_at: now,
        updated_at: now,
      };
      state.testCases.push(copied);
    }
    return clone(duplicated);
  }

  function cloneScenarioToRelease(id: Id, targetReleaseId: Id): Scenario | null {
    const source = state.scenarios.find((s) => s.id === id);
    if (!source) return null;
    const now = nowIso();
    const cloned: Scenario = {
      ...clone(source),
      id: nextId(state),
      release_id: targetReleaseId,
      title: `${source.title} (Release Clone)`,
      status: "draft",
      created_at: now,
      updated_at: now,
    };
    state.scenarios.push(cloned);
    const sourceCases = state.testCases.filter((tc) => tc.scenario_id === id);
    for (const sourceCase of sourceCases) {
      const copied: TestCase = {
        ...clone(sourceCase),
        id: nextId(state),
        scenario_id: cloned.id,
        created_at: now,
        updated_at: now,
      };
      state.testCases.push(copied);
    }
    return clone(cloned);
  }

  function getTestCases(scenarioId?: Id): TestCase[] {
    const list = scenarioId
      ? state.testCases.filter((tc) => tc.scenario_id === scenarioId)
      : state.testCases;
    return clone(list.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)));
  }

  function createTestCase(
    input: Omit<TestCase, "id" | "created_at" | "updated_at">,
  ): TestCase {
    const now = nowIso();
    const testCase: TestCase = {
      id: nextId(state),
      scenario_id: input.scenario_id,
      title: normalizeText(input.title),
      preconditions: normalizeText(input.preconditions),
      steps: normalizeText(input.steps),
      expected_result: normalizeText(input.expected_result),
      priority: validCasePriority(input.priority),
      automation_status: validAutomationStatus(input.automation_status),
      created_at: now,
      updated_at: now,
    };
    state.testCases.push(testCase);
    return clone(testCase);
  }

  function updateTestCase(
    id: Id,
    input: Partial<Omit<TestCase, "id" | "created_at" | "updated_at">>,
  ): TestCase | null {
    const testCase = state.testCases.find((tc) => tc.id === id);
    if (!testCase) return null;
    if (input.scenario_id !== undefined) testCase.scenario_id = input.scenario_id;
    if (input.title !== undefined) testCase.title = normalizeText(input.title);
    if (input.preconditions !== undefined) testCase.preconditions = normalizeText(input.preconditions);
    if (input.steps !== undefined) testCase.steps = normalizeText(input.steps);
    if (input.expected_result !== undefined) {
      testCase.expected_result = normalizeText(input.expected_result);
    }
    if (input.priority !== undefined) testCase.priority = validCasePriority(input.priority);
    if (input.automation_status !== undefined) {
      testCase.automation_status = validAutomationStatus(input.automation_status);
    }
    testCase.updated_at = nowIso();
    return clone(testCase);
  }

  function deleteTestCase(id: Id): boolean {
    if (!state.testCases.some((tc) => tc.id === id)) return false;
    state.testCases = state.testCases.filter((tc) => tc.id !== id);
    state.runResults = state.runResults.filter((rr) => rr.test_case_id !== id);
    return true;
  }

  function getTestRuns(projectId?: Id): TestRun[] {
    const list = projectId
      ? state.testRuns.filter((tr) => tr.project_id === projectId)
      : state.testRuns;
    return clone(list.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)));
  }

  function createTestRun(
    input: Omit<TestRun, "id" | "created_at" | "updated_at"> & { scenario_ids?: number[] },
  ): TestRun {
    const now = nowIso();
    const run: TestRun = {
      id: nextId(state),
      project_id: input.project_id,
      release_id: input.release_id ?? null,
      name: normalizeText(input.name),
      description: normalizeText(input.description),
      status: validRunStatus(input.status),
      created_at: now,
      updated_at: now,
    };
    state.testRuns.push(run);

    const scenarioIds = input.scenario_ids ?? [];
    if (scenarioIds.length > 0) {
      const caseIds = new Set<number>();
      for (const scenarioId of scenarioIds) {
        for (const testCase of state.testCases.filter((tc) => tc.scenario_id === scenarioId)) {
          caseIds.add(testCase.id);
        }
      }
      for (const caseId of caseIds) {
        const result: TestRunResult = {
          id: nextId(state),
          test_run_id: run.id,
          test_case_id: caseId,
          status: "not_run",
          actual_result: "",
          notes: "",
          executed_by: "",
          executed_at: null,
          created_at: now,
          updated_at: now,
        };
        state.runResults.push(result);
      }
    }
    return clone(run);
  }

  function updateTestRun(
    id: Id,
    input: Partial<Omit<TestRun, "id" | "created_at" | "updated_at">>,
  ): TestRun | null {
    const run = state.testRuns.find((tr) => tr.id === id);
    if (!run) return null;
    if (input.project_id !== undefined) run.project_id = input.project_id;
    if (input.release_id !== undefined) run.release_id = input.release_id;
    if (input.name !== undefined) run.name = normalizeText(input.name);
    if (input.description !== undefined) run.description = normalizeText(input.description);
    if (input.status !== undefined) run.status = validRunStatus(input.status);
    run.updated_at = nowIso();
    return clone(run);
  }

  function deleteTestRun(id: Id): boolean {
    if (!state.testRuns.some((tr) => tr.id === id)) return false;
    state.testRuns = state.testRuns.filter((tr) => tr.id !== id);
    state.runResults = state.runResults.filter((rr) => rr.test_run_id !== id);
    return true;
  }

  function initializeRunResults(runId: Id, testCaseIds: Id[]) {
    const existingCaseIds = new Set(
      state.runResults
        .filter((rr) => rr.test_run_id === runId)
        .map((rr) => rr.test_case_id),
    );
    const now = nowIso();
    for (const testCaseId of testCaseIds) {
      if (existingCaseIds.has(testCaseId)) continue;
      state.runResults.push({
        id: nextId(state),
        test_run_id: runId,
        test_case_id: testCaseId,
        status: "not_run",
        actual_result: "",
        notes: "",
        executed_by: "",
        executed_at: null,
        created_at: now,
        updated_at: now,
      });
    }
    return getRunResults(runId);
  }

  function getRunResults(runId: Id) {
    return clone(state.runResults.filter((rr) => rr.test_run_id === runId));
  }

  function updateRunResult(
    id: Id,
    input: Partial<
      Omit<TestRunResult, "id" | "test_run_id" | "test_case_id" | "created_at" | "updated_at">
    >,
  ): TestRunResult | null {
    const runResult = state.runResults.find((rr) => rr.id === id);
    if (!runResult) return null;
    if (input.status !== undefined) runResult.status = validRunResultStatus(input.status);
    if (input.actual_result !== undefined) runResult.actual_result = normalizeText(input.actual_result);
    if (input.notes !== undefined) runResult.notes = normalizeText(input.notes);
    if (input.executed_by !== undefined) runResult.executed_by = normalizeText(input.executed_by);
    if (runResult.status !== "not_run") {
      runResult.executed_at = nowIso();
    } else {
      runResult.executed_at = null;
    }
    runResult.updated_at = nowIso();
    return clone(runResult);
  }

  return {
    getDashboard,
    getProjectDetails,
    createProject,
    updateProject,
    deleteProject,
    createRelease,
    updateRelease,
    deleteRelease,
    getScenarios,
    createScenario,
    updateScenario,
    deleteScenario,
    duplicateScenario,
    cloneScenarioToRelease,
    getTestCases,
    createTestCase,
    updateTestCase,
    deleteTestCase,
    getTestRuns,
    createTestRun,
    updateTestRun,
    deleteTestRun,
    initializeRunResults,
    getRunResults,
    updateRunResult,
  };
}

export const store = createSeedStore();
