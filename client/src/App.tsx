import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  FlaskConical,
  LayoutGrid,
  Loader2,
  PlayCircle,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type {
  ApiErrorResponse as ApiError,
  DashboardData,
  ProjectDetails as ProjectData,
  Project as ProjectEntity,
  Release as ReleaseEntity,
  ReleaseStatus,
  RunResultStatus as ResultStatus,
  Scenario as ScenarioEntity,
  ScenarioPriority,
  ScenarioStatus,
  ScenarioTypeTag as ScenarioTag,
  TestCase as TestCaseEntity,
  CasePriority as TestCasePriority,
  TestRun as TestRunEntity,
  TestRunResult as TestRunResultEntity,
  RunStatus as TestRunStatus,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const fallback = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as ApiError;
      throw new Error(payload.error ?? fallback);
    } catch {
      throw new Error(fallback);
    }
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

type Tab = "overview" | "releases" | "scenarios" | "runs";
type RunExecutionRow = {
  result: TestRunResultEntity;
  testCase: TestCaseEntity | undefined;
  scenario: ScenarioEntity | undefined;
};

const scenarioStatuses: ScenarioStatus[] = [
  "draft",
  "ready",
  "in_progress",
  "blocked",
  "done",
];

const scenarioStatusLabel: Record<ScenarioStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

const scenarioPriorities: ScenarioPriority[] = [
  "low",
  "medium",
  "high",
  "critical",
];
const testCasePriorities: TestCasePriority[] = ["low", "medium", "high"];
const releaseStatuses: ReleaseStatus[] = ["planned", "active", "completed"];
const runStatuses: TestRunStatus[] = ["not_started", "in_progress", "completed"];
const runResultStatuses: ResultStatus[] = ["not_run", "passed", "failed", "blocked"];
const scenarioTags: ScenarioTag[] = ["regression", "acceptance", "smoke", "automation"];

const priorityClass: Record<ScenarioPriority, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-blue-100 text-blue-800 border-blue-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  critical: "bg-rose-100 text-rose-800 border-rose-200",
};

const scenarioTagClass: Record<ScenarioTag, string> = {
  regression: "bg-violet-100 text-violet-800 border-violet-200",
  acceptance: "bg-blue-100 text-blue-800 border-blue-200",
  smoke: "bg-orange-100 text-orange-800 border-orange-200",
  automation: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const releaseStatusClass: Record<ReleaseStatus, string> = {
  planned: "bg-slate-100 text-slate-700 border-slate-200",
  active: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const runStatusClass: Record<TestRunStatus, string> = {
  not_started: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const resultStatusClass: Record<ResultStatus, string> = {
  not_run: "bg-slate-100 text-slate-700 border-slate-200",
  passed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  failed: "bg-rose-100 text-rose-800 border-rose-200",
  blocked: "bg-amber-100 text-amber-800 border-amber-200",
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return (
    <div
      className={classNames(
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
        className,
      )}
      {...rest}
    />
  );
}

function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
}) {
  const variants: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 border border-blue-600",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 border border-transparent",
    outline: "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300",
    danger: "bg-rose-600 text-white hover:bg-rose-700 border border-rose-600",
  };
  return (
    <button
      className={classNames(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function emptyScenarioForm(projectId: number): Omit<ScenarioEntity, "id" | "created_at" | "updated_at"> {
  return {
    project_id: projectId,
    release_id: null,
    title: "",
    description: "",
    priority: "medium",
    status: "draft",
    tags: [],
    is_regression: false,
    is_acceptance: false,
    is_smoke: false,
    is_automation: false,
    labels: [],
    owner: "",
  };
}

function emptyReleaseForm(projectId: number): Omit<ReleaseEntity, "id" | "created_at" | "updated_at"> {
  return {
    project_id: projectId,
    name: "",
    version: "",
    description: "",
    status: "planned",
    target_date: "",
  };
}

function emptyCaseForm(scenarioId: number): Omit<TestCaseEntity, "id" | "created_at" | "updated_at"> {
  return {
    scenario_id: scenarioId,
    title: "",
    preconditions: "",
    steps: "",
    expected_result: "",
    priority: "medium",
    automation_status: "not_automated",
  };
}

function emptyRunForm(projectId: number): Omit<TestRunEntity, "id" | "created_at" | "updated_at"> {
  return {
    project_id: projectId,
    release_id: null,
    name: "",
    description: "",
    status: "not_started",
  };
}

function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const next = await request<DashboardData>("/dashboard");
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed loading dashboard");
    } finally {
      setLoading(false);
    }
  }

  useMemo(() => {
    void refresh();
    return null;
  }, []);

  return { data, loading, error, refresh };
}

function useProjectData(projectId: number | null) {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(id: number) {
    try {
      setLoading(true);
      setError(null);
      const next = await request<ProjectData>(`/projects/${id}/details`);
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed loading project");
    } finally {
      setLoading(false);
    }
  }

  useMemo(() => {
    if (projectId) {
      void refresh(projectId);
    }
    return null;
  }, [projectId]);

  return { data, loading, error, refresh };
}

function ScenarioCard({
  scenario,
  caseCount,
  release,
  onOpen,
}: {
  scenario: ScenarioEntity;
  caseCount: number;
  release: ReleaseEntity | undefined;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `scenario:${scenario.id}` });
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={classNames(
        "rounded-xl border border-slate-200 bg-white p-3 shadow-sm",
        isDragging && "opacity-70",
      )}
    >
      <button
        onClick={onOpen}
        className="mb-2 block w-full text-left text-sm font-semibold text-slate-800 hover:text-blue-700"
      >
        {scenario.title}
      </button>
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <Badge className={priorityClass[scenario.priority]}>{scenario.priority}</Badge>
        {scenario.is_regression ? <Badge className={scenarioTagClass.regression}>regression</Badge> : null}
        {scenario.is_acceptance ? <Badge className={scenarioTagClass.acceptance}>acceptance</Badge> : null}
        {scenario.is_smoke ? <Badge className={scenarioTagClass.smoke}>smoke</Badge> : null}
        {scenario.is_automation ? <Badge className={scenarioTagClass.automation}>automation</Badge> : null}
      </div>
      <div className="text-xs text-slate-600">
        <div>{release ? `${release.name} (${release.version})` : "No release"}</div>
        <div className="mt-1">{caseCount} test case(s)</div>
      </div>
      <div className="mt-2 flex items-center justify-end">
        <button
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
          {...attributes}
          {...listeners}
          aria-label="Drag scenario"
        >
          Drag
        </button>
      </div>
    </article>
  );
}

export default function App() {
  const dashboard = useDashboardData();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const projectQuery = useProjectData(selectedProjectId);

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectEntity | null>(null);
  const [projectForm, setProjectForm] = useState({ name: "", description: "" });

  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<ReleaseEntity | null>(null);
  const [releaseForm, setReleaseForm] = useState<Omit<ReleaseEntity, "id" | "created_at" | "updated_at"> | null>(null);

  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<ScenarioEntity | null>(null);
  const [scenarioForm, setScenarioForm] = useState<Omit<ScenarioEntity, "id" | "created_at" | "updated_at"> | null>(null);
  const [scenarioDetail, setScenarioDetail] = useState<ScenarioEntity | null>(null);
  const [searchText, setSearchText] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<ScenarioPriority | "all">("all");
  const [releaseFilter, setReleaseFilter] = useState<number | "all">("all");
  const [tagFilter, setTagFilter] = useState<ScenarioTag | "all">("all");

  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCaseEntity | null>(null);
  const [caseForm, setCaseForm] = useState<Omit<TestCaseEntity, "id" | "created_at" | "updated_at"> | null>(null);

  const [runModalOpen, setRunModalOpen] = useState(false);
  const [editingRun, setEditingRun] = useState<TestRunEntity | null>(null);
  const [runForm, setRunForm] = useState<Omit<TestRunEntity, "id" | "created_at" | "updated_at"> | null>(null);
  const [runExecution, setRunExecution] = useState<TestRunEntity | null>(null);

  const [busy, setBusy] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const projectData = projectQuery.data;

  const releasesById = useMemo(() => {
    const map = new Map<number, ReleaseEntity>();
    projectData?.releases.forEach((r) => map.set(r.id, r));
    return map;
  }, [projectData?.releases]);

  const caseCountByScenarioId = useMemo(() => {
    const map = new Map<number, number>();
    projectData?.testCases.forEach((testCase) => {
      map.set(testCase.scenario_id, (map.get(testCase.scenario_id) ?? 0) + 1);
    });
    return map;
  }, [projectData?.testCases]);

  const filteredScenarios = useMemo(() => {
    const scenarios = projectData?.scenarios ?? [];
    return scenarios.filter((scenario) => {
      if (releaseFilter !== "all" && scenario.release_id !== releaseFilter) return false;
      if (priorityFilter !== "all" && scenario.priority !== priorityFilter) return false;
      if (tagFilter === "regression" && !scenario.is_regression) return false;
      if (tagFilter === "acceptance" && !scenario.is_acceptance) return false;
      if (tagFilter === "smoke" && !scenario.is_smoke) return false;
      if (tagFilter === "automation" && !scenario.is_automation) return false;
      if (
        searchText.trim().length > 0 &&
        !scenario.title.toLowerCase().includes(searchText.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [projectData?.scenarios, releaseFilter, priorityFilter, tagFilter, searchText]);

  const scenariosByStatus = useMemo(() => {
    const groups: Record<ScenarioStatus, ScenarioEntity[]> = {
      draft: [],
      ready: [],
      in_progress: [],
      blocked: [],
      done: [],
    };
    filteredScenarios.forEach((scenario) => groups[scenario.status].push(scenario));
    return groups;
  }, [filteredScenarios]);

  const runResultRows = useMemo<RunExecutionRow[]>(() => {
    if (!projectData || !runExecution) return [];
    const testCasesById = new Map(projectData.testCases.map((tc) => [tc.id, tc]));
    const scenariosById = new Map(projectData.scenarios.map((sc) => [sc.id, sc]));
    return projectData.runResults
      .filter((result) => result.test_run_id === runExecution.id)
      .map((result) => {
        const testCase = testCasesById.get(result.test_case_id);
        const scenario = testCase ? scenariosById.get(testCase.scenario_id) : undefined;
        return { result, testCase, scenario };
      });
  }, [projectData, runExecution]);

  async function reloadCurrentProject() {
    if (selectedProjectId) {
      await projectQuery.refresh(selectedProjectId);
    }
    await dashboard.refresh();
  }

  async function submitProjectForm() {
    if (!projectForm.name.trim()) return;
    setBusy(true);
    try {
      if (editingProject) {
        await request(`/projects/${editingProject.id}`, {
          method: "PUT",
          body: JSON.stringify(projectForm),
        });
      } else {
        const created = await request<ProjectEntity>("/projects", {
          method: "POST",
          body: JSON.stringify(projectForm),
        });
        setSelectedProjectId(created.id);
      }
      setProjectModalOpen(false);
      setEditingProject(null);
      setProjectForm({ name: "", description: "" });
      await reloadCurrentProject();
    } finally {
      setBusy(false);
    }
  }

  async function deleteProject(projectId: number) {
    if (!confirm("Delete this project and all related test data?")) return;
    await request(`/projects/${projectId}`, { method: "DELETE" });
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
    }
    await dashboard.refresh();
  }

  async function submitReleaseForm() {
    if (!releaseForm) return;
    setBusy(true);
    try {
      if (editingRelease) {
        await request(`/releases/${editingRelease.id}`, {
          method: "PUT",
          body: JSON.stringify(releaseForm),
        });
      } else {
        await request("/releases", { method: "POST", body: JSON.stringify(releaseForm) });
      }
      setReleaseModalOpen(false);
      setEditingRelease(null);
      await reloadCurrentProject();
    } finally {
      setBusy(false);
    }
  }

  async function submitScenarioForm() {
    if (!scenarioForm) return;
    setBusy(true);
    try {
      if (editingScenario) {
        await request(`/scenarios/${editingScenario.id}`, {
          method: "PUT",
          body: JSON.stringify(scenarioForm),
        });
      } else {
        await request("/scenarios", { method: "POST", body: JSON.stringify(scenarioForm) });
      }
      setScenarioModalOpen(false);
      setEditingScenario(null);
      await reloadCurrentProject();
    } finally {
      setBusy(false);
    }
  }

  async function submitCaseForm() {
    if (!caseForm) return;
    setBusy(true);
    try {
      if (editingCase) {
        await request(`/test-cases/${editingCase.id}`, {
          method: "PUT",
          body: JSON.stringify(caseForm),
        });
      } else {
        await request("/test-cases", { method: "POST", body: JSON.stringify(caseForm) });
      }
      setCaseModalOpen(false);
      setEditingCase(null);
      await reloadCurrentProject();
    } finally {
      setBusy(false);
    }
  }

  async function submitRunForm() {
    if (!runForm) return;
    setBusy(true);
    try {
      if (editingRun) {
        await request(`/test-runs/${editingRun.id}`, {
          method: "PUT",
          body: JSON.stringify(runForm),
        });
      } else {
        await request("/test-runs", { method: "POST", body: JSON.stringify(runForm) });
      }
      setRunModalOpen(false);
      setEditingRun(null);
      await reloadCurrentProject();
    } finally {
      setBusy(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = String(event.over?.id ?? "");
    if (!activeId.startsWith("scenario:") || !overId.startsWith("status:")) return;
    const scenarioId = Number(activeId.replace("scenario:", ""));
    const newStatus = overId.replace("status:", "") as ScenarioStatus;
    const current = projectData?.scenarios.find((item) => item.id === scenarioId);
    if (!current || current.status === newStatus) return;
    await request(`/scenarios/${scenarioId}`, {
      method: "PUT",
      body: JSON.stringify({ status: newStatus }),
    });
    await reloadCurrentProject();
  }

  async function openRunExecution(run: TestRunEntity) {
    setRunExecution(run);
    if (!projectData) return;
    const existing = projectData.runResults.filter((item) => item.test_run_id === run.id);
    if (existing.length > 0) return;

    const relevantCaseIds = projectData.testCases
      .filter((testCase) => {
        const scenario = projectData.scenarios.find((sc) => sc.id === testCase.scenario_id);
        if (!scenario) return false;
        if (!run.release_id) return true;
        return scenario.release_id === run.release_id;
      })
      .map((testCase) => testCase.id);

    await request(`/test-runs/${run.id}/initialize`, {
      method: "POST",
      body: JSON.stringify({ testCaseIds: relevantCaseIds }),
    });
    await reloadCurrentProject();
  }

  async function updateRunResult(resultId: number, patch: Partial<TestRunResultEntity>) {
    if (!runExecution) return;
    await request(`/test-runs/${runExecution.id}/results/${resultId}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    await reloadCurrentProject();
  }

  const rootLoading = dashboard.loading || (selectedProjectId !== null && projectQuery.loading);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2 text-white">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">easyQA</h1>
              <p className="text-xs text-slate-500">Trello-style testing management</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingProject(null);
              setProjectForm({ name: "", description: "" });
              setProjectModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-6 px-6 py-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-700">Projects</h2>
            </div>
            <div className="space-y-2">
              {dashboard.data?.projects.map((project) => (
                <div
                  key={project.id}
                  className={classNames(
                    "rounded-xl border p-3",
                    selectedProjectId === project.id
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-white",
                  )}
                >
                  <button
                    className="w-full text-left"
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setActiveTab("overview");
                    }}
                  >
                    <div className="text-sm font-semibold text-slate-800">{project.name}</div>
                    <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                      {project.description || "No description"}
                    </div>
                  </button>
                  <div className="mt-2 flex gap-1">
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      onClick={() => {
                        setEditingProject(project);
                        setProjectForm({
                          name: project.name,
                          description: project.description,
                        });
                        setProjectModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                      onClick={() => void deleteProject(project.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {dashboard.data?.projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  No projects yet. Create your first project.
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Dashboard</h3>
            {!dashboard.data ? (
              <p className="text-sm text-slate-500">Loading summary...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Scenarios</div>
                  <div className="text-xl font-semibold">{dashboard.data.summary.totalScenarios}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Test Cases</div>
                  <div className="text-xl font-semibold">{dashboard.data.summary.totalTestCases}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Active Releases</div>
                  <div className="text-xl font-semibold">{dashboard.data.summary.activeReleases}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Runs in Progress</div>
                  <div className="text-xl font-semibold">{dashboard.data.summary.runsInProgress}</div>
                </div>
              </div>
            )}
          </Card>
        </aside>

        <section className="space-y-4">
          {rootLoading ? (
            <Card className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-slate-600">Loading workspace...</span>
            </Card>
          ) : null}
          {dashboard.error ? (
            <Card className="text-sm text-rose-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {dashboard.error}
              </div>
            </Card>
          ) : null}
          {projectQuery.error ? (
            <Card className="text-sm text-rose-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {projectQuery.error}
              </div>
            </Card>
          ) : null}

          {!selectedProjectId || !projectData ? (
            <Card className="p-10 text-center">
              <h2 className="text-xl font-semibold text-slate-800">Pick a project to start</h2>
              <p className="mt-2 text-sm text-slate-600">
                Manage releases, scenarios, test cases, and runs from a lightweight board-style
                workspace.
              </p>
            </Card>
          ) : (
            <>
              <Card>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">{projectData.project.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{projectData.project.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={activeTab === "overview" ? "primary" : "outline"}
                      onClick={() => setActiveTab("overview")}
                    >
                      Overview
                    </Button>
                    <Button
                      variant={activeTab === "releases" ? "primary" : "outline"}
                      onClick={() => setActiveTab("releases")}
                    >
                      Releases
                    </Button>
                    <Button
                      variant={activeTab === "scenarios" ? "primary" : "outline"}
                      onClick={() => setActiveTab("scenarios")}
                    >
                      Scenarios
                    </Button>
                    <Button
                      variant={activeTab === "runs" ? "primary" : "outline"}
                      onClick={() => setActiveTab("runs")}
                    >
                      Test Runs
                    </Button>
                  </div>
                </div>

                {activeTab === "overview" ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-slate-50">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Releases
                      </div>
                      <div className="text-2xl font-semibold">{projectData.releases.length}</div>
                    </Card>
                    <Card className="bg-slate-50">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Scenarios
                      </div>
                      <div className="text-2xl font-semibold">{projectData.scenarios.length}</div>
                    </Card>
                    <Card className="bg-slate-50">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Test Cases
                      </div>
                      <div className="text-2xl font-semibold">{projectData.testCases.length}</div>
                    </Card>
                    <Card className="bg-slate-50">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Test Runs
                      </div>
                      <div className="text-2xl font-semibold">{projectData.testRuns.length}</div>
                    </Card>
                    <Card className="md:col-span-2 lg:col-span-4">
                      <h3 className="mb-2 text-sm font-semibold text-slate-700">Recent Releases</h3>
                      <div className="space-y-2">
                        {projectData.releases.slice(0, 5).map((release) => (
                          <div
                            key={release.id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 p-2"
                          >
                            <div>
                              <div className="text-sm font-semibold">{release.name}</div>
                              <div className="text-xs text-slate-500">v{release.version}</div>
                            </div>
                            <Badge className={releaseStatusClass[release.status]}>{release.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                ) : null}

                {activeTab === "releases" ? (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          setEditingRelease(null);
                          setReleaseForm(emptyReleaseForm(projectData.project.id));
                          setReleaseModalOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        New Release
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {projectData.releases.map((release) => {
                        const scenarioCount = projectData.scenarios.filter(
                          (s) => s.release_id === release.id,
                        ).length;
                        const runCount = projectData.testRuns.filter(
                          (run) => run.release_id === release.id,
                        ).length;
                        return (
                          <Card key={release.id} className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-base font-semibold">{release.name}</h3>
                                <div className="text-sm text-slate-600">Version {release.version}</div>
                              </div>
                              <Badge className={releaseStatusClass[release.status]}>
                                {release.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600">{release.description}</p>
                            <div className="text-xs text-slate-500">
                              Target date: {release.target_date || "Not set"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {scenarioCount} linked scenarios • {runCount} linked test runs
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setEditingRelease(release);
                                  setReleaseForm({
                                    project_id: release.project_id,
                                    name: release.name,
                                    version: release.version,
                                    description: release.description,
                                    status: release.status,
                                    target_date: release.target_date,
                                  });
                                  setReleaseModalOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                className="text-rose-700 hover:bg-rose-50"
                                onClick={async () => {
                                  await request(`/releases/${release.id}`, { method: "DELETE" });
                                  await reloadCurrentProject();
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {activeTab === "scenarios" ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                          <input
                            value={searchText}
                            onChange={(event) => setSearchText(event.target.value)}
                            placeholder="Search scenarios..."
                            className="rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-2 text-sm"
                          />
                        </div>
                        <select
                          value={releaseFilter}
                          onChange={(event) =>
                            setReleaseFilter(
                              event.target.value === "all" ? "all" : Number(event.target.value),
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
                        >
                          <option value="all">All releases</option>
                          {projectData.releases.map((release) => (
                            <option key={release.id} value={release.id}>
                              {release.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={priorityFilter}
                          onChange={(event) =>
                            setPriorityFilter(event.target.value as ScenarioPriority | "all")
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
                        >
                          <option value="all">All priorities</option>
                          {scenarioPriorities.map((priority) => (
                            <option key={priority} value={priority}>
                              {priority}
                            </option>
                          ))}
                        </select>
                        <select
                          value={tagFilter}
                          onChange={(event) =>
                            setTagFilter(event.target.value as ScenarioTag | "all")
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
                        >
                          <option value="all">All tags</option>
                          {scenarioTags.map((tag) => (
                            <option key={tag} value={tag}>
                              {tag}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        onClick={() => {
                          setEditingScenario(null);
                          setScenarioForm(emptyScenarioForm(projectData.project.id));
                          setScenarioModalOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Quick Add Scenario
                      </Button>
                    </div>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <div className="grid gap-3 xl:grid-cols-5">
                        {scenarioStatuses.map((status) => (
                          <Card key={status} id={`status:${status}`} className="bg-slate-50">
                            <div className="mb-2 flex items-center justify-between">
                              <h4 className="text-sm font-semibold">{scenarioStatusLabel[status]}</h4>
                              <Badge className="bg-slate-200 text-slate-700 border-slate-300">
                                {scenariosByStatus[status].length}
                              </Badge>
                            </div>
                            <SortableContext
                              id={`status:${status}`}
                              items={scenariosByStatus[status].map((s) => `scenario:${s.id}`)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2">
                                {scenariosByStatus[status].map((scenario) => (
                                  <ScenarioCard
                                    key={scenario.id}
                                    scenario={scenario}
                                    caseCount={caseCountByScenarioId.get(scenario.id) ?? 0}
                                    release={scenario.release_id ? releasesById.get(scenario.release_id) : undefined}
                                    onOpen={() => setScenarioDetail(scenario)}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </Card>
                        ))}
                      </div>
                    </DndContext>
                  </div>
                ) : null}

                {activeTab === "runs" ? (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          setEditingRun(null);
                          setRunForm(emptyRunForm(projectData.project.id));
                          setRunModalOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        New Test Run
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {projectData.testRuns.map((run) => (
                        <Card key={run.id} className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{run.name}</h3>
                              <p className="text-xs text-slate-500">
                                Updated {formatDistanceToNow(new Date(run.updated_at))} ago
                              </p>
                            </div>
                            <Badge className={runStatusClass[run.status]}>{run.status}</Badge>
                          </div>
                          <p className="text-sm text-slate-600">{run.description}</p>
                          <p className="text-xs text-slate-500">
                            Release:{" "}
                            {run.release_id ? releasesById.get(run.release_id)?.name ?? "Unknown" : "Project level"}
                          </p>
                          <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => void openRunExecution(run)}>
                              <PlayCircle className="h-4 w-4" />
                              Execute
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setEditingRun(run);
                                setRunForm({
                                  project_id: run.project_id,
                                  release_id: run.release_id,
                                  name: run.name,
                                  description: run.description,
                                  status: run.status,
                                });
                                setRunModalOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-rose-700 hover:bg-rose-50"
                              onClick={async () => {
                                await request(`/test-runs/${run.id}`, { method: "DELETE" });
                                await reloadCurrentProject();
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Card>
            </>
          )}
        </section>
      </main>

      <Modal
        open={projectModalOpen}
        title={editingProject ? "Edit project" : "Create project"}
        onClose={() => setProjectModalOpen(false)}
      >
        <div className="space-y-3">
          <Field label="Project name">
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={projectForm.name}
              onChange={(e) => setProjectForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Checkout Platform"
            />
          </Field>
          <Field label="Description">
            <textarea
              className="rounded-lg border border-slate-300 px-3 py-2"
              rows={3}
              value={projectForm.description}
              onChange={(e) => setProjectForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Main QA workspace for checkout and promotions."
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setProjectModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitProjectForm()} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={releaseModalOpen}
        title={editingRelease ? "Edit release" : "Create release"}
        onClose={() => setReleaseModalOpen(false)}
      >
        {!releaseForm ? null : (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={releaseForm.name}
                onChange={(e) => setReleaseForm((s) => (s ? { ...s, name: e.target.value } : s))}
              />
            </Field>
            <Field label="Version">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={releaseForm.version}
                onChange={(e) => setReleaseForm((s) => (s ? { ...s, version: e.target.value } : s))}
              />
            </Field>
            <Field label="Status">
              <select
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={releaseForm.status}
                onChange={(e) =>
                  setReleaseForm((s) => (s ? { ...s, status: e.target.value as ReleaseStatus } : s))
                }
              >
                {releaseStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Target date">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                type="date"
                value={releaseForm.target_date ?? ""}
                onChange={(e) =>
                  setReleaseForm((s) => (s ? { ...s, target_date: e.target.value } : s))
                }
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  rows={3}
                  value={releaseForm.description}
                  onChange={(e) =>
                    setReleaseForm((s) => (s ? { ...s, description: e.target.value } : s))
                  }
                />
              </Field>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReleaseModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void submitReleaseForm()} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={scenarioModalOpen}
        title={editingScenario ? "Edit scenario" : "Create scenario"}
        onClose={() => setScenarioModalOpen(false)}
      >
        {!scenarioForm || !projectData ? null : (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Title">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={scenarioForm.title}
                onChange={(e) => setScenarioForm((s) => (s ? { ...s, title: e.target.value } : s))}
              />
            </Field>
            <Field label="Owner">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={scenarioForm.owner}
                onChange={(e) => setScenarioForm((s) => (s ? { ...s, owner: e.target.value } : s))}
                placeholder="QA owner"
              />
            </Field>
            <Field label="Priority">
              <select
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={scenarioForm.priority}
                onChange={(e) =>
                  setScenarioForm((s) =>
                    s ? { ...s, priority: e.target.value as ScenarioPriority } : s,
                  )
                }
              >
                {scenarioPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={scenarioForm.status}
                onChange={(e) =>
                  setScenarioForm((s) =>
                    s ? { ...s, status: e.target.value as ScenarioStatus } : s,
                  )
                }
              >
                {scenarioStatuses.map((status) => (
                  <option key={status} value={status}>
                    {scenarioStatusLabel[status]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Release">
              <select
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={scenarioForm.release_id ?? ""}
                onChange={(e) =>
                  setScenarioForm((s) =>
                    s ? { ...s, release_id: e.target.value ? Number(e.target.value) : null } : s,
                  )
                }
              >
                <option value="">No release</option>
                {projectData.releases.map((release) => (
                  <option key={release.id} value={release.id}>
                    {release.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  rows={3}
                  value={scenarioForm.description}
                  onChange={(e) =>
                    setScenarioForm((s) => (s ? { ...s, description: e.target.value } : s))
                  }
                />
              </Field>
            </div>
            <div className="md:col-span-2 space-y-2">
              <span className="text-sm font-medium text-slate-700">Scenario type badges</span>
              <div className="flex flex-wrap gap-2">
                {scenarioTags.map((tag) => {
                  const checked =
                    (tag === "regression" && scenarioForm.is_regression) ||
                    (tag === "acceptance" && scenarioForm.is_acceptance) ||
                    (tag === "smoke" && scenarioForm.is_smoke) ||
                    (tag === "automation" && scenarioForm.is_automation);
                  return (
                    <label
                      key={tag}
                      className={classNames(
                        "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1 text-sm",
                        checked
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-slate-300 bg-white text-slate-700",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setScenarioForm((s) => {
                            if (!s) return s;
                            if (tag === "regression") {
                              return { ...s, is_regression: e.target.checked };
                            }
                            if (tag === "acceptance") {
                              return { ...s, is_acceptance: e.target.checked };
                            }
                            if (tag === "smoke") {
                              return { ...s, is_smoke: e.target.checked };
                            }
                            return { ...s, is_automation: e.target.checked };
                          });
                        }}
                      />
                      {tag}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setScenarioModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void submitScenarioForm()} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(scenarioDetail)}
        title={scenarioDetail?.title ?? "Scenario details"}
        onClose={() => setScenarioDetail(null)}
      >
        {!scenarioDetail || !projectData ? null : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className={priorityClass[scenarioDetail.priority]}>{scenarioDetail.priority}</Badge>
              {scenarioDetail.is_regression ? (
                <Badge className={scenarioTagClass.regression}>regression</Badge>
              ) : null}
              {scenarioDetail.is_acceptance ? (
                <Badge className={scenarioTagClass.acceptance}>acceptance</Badge>
              ) : null}
              {scenarioDetail.is_smoke ? <Badge className={scenarioTagClass.smoke}>smoke</Badge> : null}
              {scenarioDetail.is_automation ? (
                <Badge className={scenarioTagClass.automation}>automation</Badge>
              ) : null}
            </div>
            <p className="text-sm text-slate-700">{scenarioDetail.description}</p>
            <div className="grid gap-2 md:grid-cols-2 text-sm text-slate-600">
              <div>Owner: {scenarioDetail.owner || "Unassigned"}</div>
              <div>
                Release:{" "}
                {scenarioDetail.release_id
                  ? releasesById.get(scenarioDetail.release_id)?.name ?? "Unknown"
                  : "None"}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingScenario(scenarioDetail);
                  setScenarioForm({
                    project_id: scenarioDetail.project_id,
                    release_id: scenarioDetail.release_id,
                    title: scenarioDetail.title,
                    description: scenarioDetail.description,
                    priority: scenarioDetail.priority,
                    status: scenarioDetail.status,
                    tags: [
                      ...(scenarioDetail.is_regression ? (["regression"] as const) : []),
                      ...(scenarioDetail.is_acceptance ? (["acceptance"] as const) : []),
                      ...(scenarioDetail.is_smoke ? (["smoke"] as const) : []),
                      ...(scenarioDetail.is_automation ? (["automation"] as const) : []),
                    ],
                    is_regression: scenarioDetail.is_regression,
                    is_acceptance: scenarioDetail.is_acceptance,
                    is_smoke: scenarioDetail.is_smoke,
                    is_automation: scenarioDetail.is_automation,
                    labels: [...scenarioDetail.labels],
                    owner: scenarioDetail.owner,
                  });
                  setScenarioModalOpen(true);
                }}
              >
                Edit Scenario
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await request(`/scenarios/${scenarioDetail.id}/duplicate`, { method: "POST" });
                  await reloadCurrentProject();
                }}
              >
                Duplicate Scenario
              </Button>
              <Button
                variant="ghost"
                className="text-rose-700 hover:bg-rose-50"
                onClick={async () => {
                  await request(`/scenarios/${scenarioDetail.id}`, { method: "DELETE" });
                  setScenarioDetail(null);
                  await reloadCurrentProject();
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">Test Cases</h4>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingCase(null);
                    setCaseForm(emptyCaseForm(scenarioDetail.id));
                    setCaseModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Quick Add Test Case
                </Button>
              </div>
              <div className="space-y-2">
                {projectData.testCases
                  .filter((testCase) => testCase.scenario_id === scenarioDetail.id)
                  .map((testCase) => (
                    <div
                      key={testCase.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="text-sm font-semibold text-slate-800">{testCase.title}</h5>
                          <p className="text-xs text-slate-600">{testCase.expected_result}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            className="px-2 py-1 text-xs"
                            onClick={() => {
                              setEditingCase(testCase);
                              setCaseForm({
                                scenario_id: testCase.scenario_id,
                                title: testCase.title,
                                preconditions: testCase.preconditions,
                                steps: testCase.steps,
                                expected_result: testCase.expected_result,
                                priority: testCase.priority,
                                automation_status: testCase.automation_status,
                              });
                              setCaseModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            className="px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                            onClick={async () => {
                              await request(`/test-cases/${testCase.id}`, { method: "DELETE" });
                              await reloadCurrentProject();
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={caseModalOpen}
        title={editingCase ? "Edit test case" : "Create test case"}
        onClose={() => setCaseModalOpen(false)}
      >
        {!caseForm ? null : (
          <div className="grid gap-3">
            <Field label="Title">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={caseForm.title}
                onChange={(e) => setCaseForm((s) => (s ? { ...s, title: e.target.value } : s))}
              />
            </Field>
            <Field label="Preconditions">
              <textarea
                className="rounded-lg border border-slate-300 px-3 py-2"
                rows={2}
                value={caseForm.preconditions}
                onChange={(e) =>
                  setCaseForm((s) => (s ? { ...s, preconditions: e.target.value } : s))
                }
              />
            </Field>
            <Field label="Steps">
              <textarea
                className="rounded-lg border border-slate-300 px-3 py-2"
                rows={3}
                value={caseForm.steps}
                onChange={(e) => setCaseForm((s) => (s ? { ...s, steps: e.target.value } : s))}
              />
            </Field>
            <Field label="Expected result">
              <textarea
                className="rounded-lg border border-slate-300 px-3 py-2"
                rows={2}
                value={caseForm.expected_result}
                onChange={(e) =>
                  setCaseForm((s) => (s ? { ...s, expected_result: e.target.value } : s))
                }
              />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Priority">
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  value={caseForm.priority}
                  onChange={(e) =>
                    setCaseForm((s) =>
                      s ? { ...s, priority: e.target.value as TestCasePriority } : s,
                    )
                  }
                >
                  {testCasePriorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Automation">
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  value={caseForm.automation_status}
                  onChange={(e) =>
                    setCaseForm((s) =>
                      s
                        ? {
                            ...s,
                            automation_status: e.target.value as TestCaseEntity["automation_status"],
                          }
                        : s,
                    )
                  }
                >
                  <option value="not_automated">not_automated</option>
                  <option value="planned">planned</option>
                  <option value="automated">automated</option>
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCaseModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void submitCaseForm()} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={runModalOpen}
        title={editingRun ? "Edit test run" : "Create test run"}
        onClose={() => setRunModalOpen(false)}
      >
        {!runForm || !projectData ? null : (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={runForm.name}
                onChange={(e) => setRunForm((s) => (s ? { ...s, name: e.target.value } : s))}
              />
            </Field>
            <Field label="Status">
              <select
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={runForm.status}
                onChange={(e) =>
                  setRunForm((s) =>
                    s ? { ...s, status: e.target.value as TestRunStatus } : s,
                  )
                }
              >
                {runStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Release">
              <select
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={runForm.release_id ?? ""}
                onChange={(e) =>
                  setRunForm((s) =>
                    s ? { ...s, release_id: e.target.value ? Number(e.target.value) : null } : s,
                  )
                }
              >
                <option value="">Project level</option>
                {projectData.releases.map((release) => (
                  <option key={release.id} value={release.id}>
                    {release.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  rows={3}
                  value={runForm.description}
                  onChange={(e) =>
                    setRunForm((s) => (s ? { ...s, description: e.target.value } : s))
                  }
                />
              </Field>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRunModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void submitRunForm()} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(runExecution)}
        title={runExecution ? `Execute Run: ${runExecution.name}` : "Execute run"}
        onClose={() => setRunExecution(null)}
      >
        {!runExecution ? null : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                Total {runResultRows.length}
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                Passed {runResultRows.filter((r) => r.result.status === "passed").length}
              </Badge>
              <Badge className="bg-rose-100 text-rose-700 border-rose-200">
                Failed {runResultRows.filter((r) => r.result.status === "failed").length}
              </Badge>
              <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                Blocked {runResultRows.filter((r) => r.result.status === "blocked").length}
              </Badge>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-auto pr-1">
              {runResultRows.map(({ result, testCase, scenario }) => (
                <div key={result.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {testCase?.title ?? "Unknown test case"}
                      </div>
                      <div className="text-xs text-slate-500">{scenario?.title ?? "Unknown scenario"}</div>
                    </div>
                    <Badge className={resultStatusClass[result.status]}>{result.status}</Badge>
                  </div>
                  <div className="grid gap-2 md:grid-cols-4">
                    <select
                      className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                      value={result.status}
                      onChange={(e) =>
                        void updateRunResult(result.id, { status: e.target.value as ResultStatus })
                      }
                    >
                      {runResultStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <input
                      className="rounded-lg border border-slate-300 px-2 py-2 text-sm md:col-span-1"
                      placeholder="Executed by"
                      value={result.executed_by}
                      onChange={(e) => void updateRunResult(result.id, { executed_by: e.target.value })}
                    />
                    <input
                      className="rounded-lg border border-slate-300 px-2 py-2 text-sm md:col-span-2"
                      placeholder="Actual result"
                      value={result.actual_result}
                      onChange={(e) => void updateRunResult(result.id, { actual_result: e.target.value })}
                    />
                    <input
                      className="rounded-lg border border-slate-300 px-2 py-2 text-sm md:col-span-4"
                      placeholder="Notes"
                      value={result.notes}
                      onChange={(e) => void updateRunResult(result.id, { notes: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setRunExecution(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <footer className="mx-auto mt-2 max-w-[1400px] px-6 pb-6 text-xs text-slate-500">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          Built as a lightweight QA workflow tool with Trello-like cards, drag-and-drop scenarios,
          and fast run execution.
        </div>
      </footer>
    </div>
  );
}
