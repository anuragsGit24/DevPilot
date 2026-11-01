import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type {
  Project,
  SourceDocument,
  Requirement,
  UserStory,
  AcceptanceCriteria,
  TestCase,
  ApiSpecification,
  ArchitectureRecommendation,
  Sprint,
  CaseStudyComparison,
  ActivityEntry,
  AssistantConversation,
  DashboardSummary,
  ChatMessage,
  ArtifactStatus,
  RequirementStatus,
  UserRole,
} from '@/types/domain';
import {
  MOCK_CASE_STUDY,
} from '@/mocks/seed-data/project-retail-banking';
import { sleep, generateId } from '@/lib/utils';
import { useToast } from './ToastProvider';
import { useAuth } from './AuthProvider';
import { api, type ApiProject, type ApiWorkItem, type ApiNormalizedStoryIn, type ApiSprintPlanResponse } from '@/lib/api';

function mapAcceptanceCriteriaArtifacts(artifacts: Awaited<ReturnType<typeof api.getArtifact>>[], projectId: string): AcceptanceCriteria[] {
  return artifacts.flatMap((artifact) => {
    const payload = artifact.current_version?.payload;
    const entries = payload?.acceptance_criteria;
    if (!Array.isArray(entries)) return [];
    return entries.flatMap((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
      const raw = entry as Record<string, unknown>;
      const title = String(raw.title ?? raw.criteria_key ?? 'Acceptance criterion');
      const given = String(raw.given ?? '');
      const when = String(raw.when ?? '');
      const then = String(raw.then ?? '');
      const storyKey = typeof raw.story_key === 'string' ? raw.story_key : undefined;
      return [{
        id: String(raw.criteria_key ?? `${artifact.id}-criteria`),
        projectId,
        artifactVersionId: artifact.current_version?.id,
        storyId: storyKey,
        userStoryId: storyKey,
        title,
        scenarioName: title,
        format: 'gherkin' as const,
        gherkin: `Feature: ${title}\n  Scenario: ${title}\n    Given ${given}\n    When ${when}\n    Then ${then}`,
        status: (artifact.status === 'accepted' || artifact.status === 'rejected' || artifact.status === 'in_review' ? artifact.status : 'draft') as ArtifactStatus,
        sourceRequirementIds: Array.isArray(raw.source_requirement_keys) ? raw.source_requirement_keys.map(String) : [],
        version: artifact.current_version?.version_number ?? 1,
        history: [],
        promptId: '',
        promptVersion: 1,
        modelName: 'Generated',
        isEdited: false,
        createdAt: artifact.created_at,
        updatedAt: artifact.updated_at,
      }];
    });
  });
}

function mapTestCaseArtifacts(artifacts: Awaited<ReturnType<typeof api.getArtifact>>[], projectId: string): TestCase[] {
  return artifacts.flatMap((artifact) => {
    const payload = artifact.current_version?.payload;
    const entries = payload?.test_cases;
    if (!Array.isArray(entries)) return [];
    return entries.flatMap((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
      const raw = entry as Record<string, unknown>;
      const categories = ['functional', 'negative', 'boundary', 'edge', 'security'] as const;
      const category = typeof raw.category === 'string' && categories.includes(raw.category as typeof categories[number])
        ? raw.category as typeof categories[number]
        : 'functional';
      const title = String(raw.title ?? raw.test_key ?? 'Test case');
      const steps = Array.isArray(raw.steps) ? raw.steps.map((step: unknown, index: number) => ({
        stepNumber: index + 1,
        action: String(step),
        expectedResult: '',
      })) : [];
      return [{
        id: String(raw.test_key ?? `${artifact.id}-test`),
        projectId,
        artifactVersionId: artifact.current_version?.id ?? '',
        storyId: '',
        title,
        category,
        priority: typeof raw.priority === 'string' && ['critical', 'high', 'medium', 'low'].includes(raw.priority)
          ? raw.priority as TestCase['priority']
          : 'medium',
        testType: category,
        preconditions: Array.isArray(raw.preconditions) ? raw.preconditions.map(String) : [],
        steps,
        expectedResult: String(raw.expected_result ?? ''),
        testData: raw.test_data == null ? undefined : JSON.stringify(raw.test_data),
        status: (artifact.status === 'accepted' || artifact.status === 'rejected' || artifact.status === 'in_review' ? artifact.status : 'draft') as ArtifactStatus,
        sourceRequirementIds: Array.isArray(raw.source_requirement_keys) ? raw.source_requirement_keys.map(String) : [],
        createdAt: artifact.created_at,
        updatedAt: artifact.updated_at,
        automationStatus: 'manual' as const,
        version: artifact.current_version?.version_number ?? 1,
        history: [],
        promptId: '',
        promptVersion: 1,
        modelName: 'Generated',
        isEdited: false,
      }];
    });
  });
}

async function loadGeneratedArtifacts(projectId: string, artifactType: string) {
  const summaries = await api.listArtifacts(projectId, artifactType);
  return Promise.all(summaries.map((artifact) => api.getArtifact(projectId, artifact.id)));
}

interface ProjectDataContextType {
  // Projects
  projects: Project[];
  activeProject: Project;
  setActiveProjectId: (id: string) => void;
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'memberCount' | 'requirementCount' | 'artifactCount' | 'pendingReviewCount' | 'qualityScore'>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;

  // Documents
  documents: SourceDocument[];
  uploadDocument: (file: { name: string; size: number; type: string }, projectId: string) => Promise<SourceDocument>;
  deleteDocument: (id: string) => void;

  // Requirements
  requirements: Requirement[];
  refreshBackendRequirements: (projectId: string) => Promise<Requirement[]>;
  updateRequirementStatus: (id: string, status: RequirementStatus) => void;
  updateRequirement: (id: string, updates: Partial<Requirement>) => void;
  addRequirement: (req: Omit<Requirement, 'id' | 'createdAt' | 'updatedAt'>) => Requirement;
  extractRequirementsFromDoc: (docId: string) => Promise<Requirement[]>;

  // User Stories
  userStories: UserStory[];
  updateUserStory: (id: string, updates: Partial<UserStory>) => void;
  updateUserStoryStatus: (id: string, status: ArtifactStatus) => void;
  generateUserStories: (requirementIds: string[]) => Promise<UserStory[]>;

  // Acceptance Criteria
  acceptanceCriteria: AcceptanceCriteria[];
  refreshGeneratedArtifacts: (projectId?: string) => Promise<void>;
  updateAcceptanceCriteria: (id: string, updates: Partial<AcceptanceCriteria>) => void;
  updateAcceptanceCriteriaStatus: (id: string, status: ArtifactStatus) => void;
  generateAcceptanceCriteria: (userStoryIds: string[]) => Promise<AcceptanceCriteria[]>;

  // Test Cases
  testCases: TestCase[];
  updateTestCase: (id: string, updates: Partial<TestCase>) => void;
  updateTestCaseStatus: (id: string, status: ArtifactStatus) => void;
  generateTestCases: (criteriaIds: string[]) => Promise<TestCase[]>;

  // API Spec
  apiSpec: ApiSpecification;
  updateApiSpec: (spec: ApiSpecification) => void;
  generateApiEndpoints: (storyIds: string[]) => Promise<void>;

  // Architecture Recommendations
  architecture: ArchitectureRecommendation;
  updateArchitecture: (arch: ArchitectureRecommendation) => void;
  generateArchitectureRecommendation: (customContext?: string) => Promise<ArchitectureRecommendation | null>;

  // Sprints
  sprints: Sprint[];
  updateSprint: (id: string, updates: Partial<Sprint>) => void;
  createSprint: (sprint: Omit<Sprint, 'id' | 'createdAt'>) => Sprint;
  deleteSprint: (sprintId: string) => Promise<void>;
  assignStoryToSprint: (storyId: string, sprintId: string | null) => void;
  planSprints: (options?: {
    capacityStoryPoints?: number;
    sprintDurationWeeks?: number;
    explicitStories?: ApiNormalizedStoryIn[];
  }) => Promise<ApiSprintPlanResponse>;
  refreshSprints: () => Promise<Sprint[]>;

  // Case Study & Dashboard
  caseStudy: CaseStudyComparison | null;
  dashboard: DashboardSummary;
  activities: ActivityEntry[];

  // Assistant
  assistantConversation: AssistantConversation;
  sendAssistantMessage: (text: string) => Promise<void>;

  // Async loading indicators
  isProcessing: Record<string, boolean>;
  resetAllData: () => void;
}

const ProjectDataContext = createContext<ProjectDataContextType | null>(null);

const EMPTY_PROJECT: Project = {
  id: '',
  name: '',
  description: '',
  status: 'active',
  createdBy: '',
  createdAt: '',
  updatedAt: '',
  memberCount: 0,
  requirementCount: 0,
  artifactCount: 0,
  pendingReviewCount: 0,
  qualityScore: 0,
  tags: [],
};

const EMPTY_DASHBOARD: DashboardSummary = {
  projectId: '',
  health: 'good',
  requirementCount: 0,
  confirmedRequirements: 0,
  artifactCounts: {
    user_stories: 0,
    acceptance_criteria: 0,
    test_cases: 0,
    api_specification: 0,
    architecture_recommendation: 0,
    sprint_plan: 0,
    case_study_report: 0,
  },
  pendingReviewCount: 0,
  qualityScore: 0,
  activeSprintProgress: 0,
  recentActivity: [],
  evaluationTrend: [],
  promptPerformance: [],
  warnings: [],
};

const EMPTY_ASSISTANT_CONVERSATION: AssistantConversation = {
  id: '',
  projectId: '',
  userId: '',
  title: '',
  messages: [],
  createdAt: '',
  updatedAt: '',
};

function mapProject(project: ApiProject, counts: { requirements: number; artifacts: number }): Project {
  return {
    ...EMPTY_PROJECT,
    id: project.id,
    name: project.name,
    description: project.description ?? '',
    createdBy: project.created_by,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    requirementCount: counts.requirements,
    artifactCount: counts.artifacts,
  };
}

function mapWorkItem<T extends object>(item: ApiWorkItem): T {
  const payload = item.payload && typeof item.payload === 'object'
    ? { ...(item.payload as Record<string, unknown>) }
    : {};
  const arrayDefaults: Record<string, string[]> = {
    user_story: ['history', 'sourceRequirementIds'],
    acceptance_criteria: ['scenarios', 'history'],
    test_case: ['preconditions', 'steps', 'history'],
    document: ['sections', 'history'],
    api_specification: ['endpoints', 'history'],
    architecture: ['components', 'decisions', 'risks', 'alternatives', 'history'],
    sprint: ['userStoryIds'],
    assistant_conversation: ['messages'],
  };
  for (const key of arrayDefaults[item.record_type] ?? []) {
    if (!Array.isArray(payload[key])) payload[key] = [];
  }
  if (item.record_type === 'document') {
    payload.filename = typeof payload.filename === 'string' ? payload.filename : item.title;
    payload.mimeType = typeof payload.mimeType === 'string' ? payload.mimeType : 'text/markdown';
    payload.parseStatus = payload.parseStatus ?? item.status ?? 'complete';
    payload.sizeBytes = Number(payload.sizeBytes ?? 0);
    payload.uploadedBy = payload.uploadedBy ?? item.created_by;
    payload.uploadedAt = payload.uploadedAt ?? item.created_at;
    payload.sectionCount = Number(payload.sectionCount ?? 0);
    payload.extractedRequirementCount = Number(payload.extractedRequirementCount ?? 0);
  }
  if (item.record_type === 'requirement') {
    payload.category = payload.category ?? 'functional';
    payload.priority = payload.priority ?? 'should';
    payload.tags = Array.isArray(payload.tags) ? payload.tags : [];
  }
  if (item.record_type === 'user_story') {
    payload.priority = payload.priority ?? 'should';
    payload.storyPoints = Number(payload.storyPoints ?? 0);
    payload.title = payload.title ?? item.title;
  }
  if (item.record_type === 'test_case') {
    payload.category = payload.category ?? 'functional';
    payload.priority = payload.priority ?? 'medium';
    payload.preconditions = Array.isArray(payload.preconditions) ? payload.preconditions : [];
    payload.steps = Array.isArray(payload.steps) ? payload.steps : [];
    payload.expectedResult = payload.expectedResult ?? '';
  }
  if (item.record_type === 'sprint') {
    payload.goal = payload.goal ?? '';
    payload.userStoryIds = Array.isArray(payload.userStoryIds)
      ? payload.userStoryIds
      : Array.isArray(payload.story_ids)
        ? payload.story_ids
        : [];
    payload.totalPoints = Number(payload.totalPoints ?? payload.total_points ?? payload.capacityStoryPoints ?? 0);
    payload.capacityStoryPoints = Number(payload.capacityStoryPoints ?? payload.capacity ?? payload.totalPoints ?? 0);
    payload.completedPoints = Number(payload.completedPoints ?? 0);
    payload.allocatedStoryPoints = Number(payload.allocatedStoryPoints ?? payload.total_points ?? 0);
    payload.targetVelocity = Number(payload.targetVelocity ?? payload.capacityStoryPoints ?? 0);
    payload.startDate = payload.startDate ?? payload.start_date ?? item.created_at;
    payload.endDate = payload.endDate ?? payload.end_date ?? item.updated_at;
    payload.warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
  }
  if (item.record_type === 'api_specification') {
    payload.title = payload.title ?? item.title;
    payload.description = payload.description ?? '';
    payload.openApiVersion = payload.openApiVersion ?? '3.1.0';
    payload.endpoints = Array.isArray(payload.endpoints) ? payload.endpoints : [];
  }
  if (item.record_type === 'architecture') {
    payload.title = payload.title ?? item.title;
    payload.summary = payload.summary ?? '';
    for (const key of ['components', 'decisions', 'risks', 'alternatives', 'securityConsiderations', 'resiliencePatterns', 'evidence']) {
      if (!Array.isArray(payload[key])) {
        if (key === 'securityConsiderations' && Array.isArray(payload.security_patterns)) {
          payload.securityConsiderations = payload.security_patterns;
        } else if (key === 'resiliencePatterns' && Array.isArray(payload.resilience_patterns)) {
          payload.resiliencePatterns = payload.resilience_patterns;
        } else {
          payload[key] = [];
        }
      }
    }
    if (!payload.dataStores && Array.isArray(payload.data_stores)) {
      payload.dataStores = payload.data_stores;
    }
    if ((!Array.isArray(payload.decisions) || payload.decisions.length === 0) && Array.isArray(payload.adrs)) {
      payload.decisions = payload.adrs.map((a: any) => ({
        id: a.id,
        title: a.title,
        context: a.context,
        decision: a.decision,
        consequences: a.consequences,
      }));
    }
    if (!payload.provider && payload.provider !== undefined) {
      payload.provider = payload.provider;
    }
    if (typeof payload.rationale === 'string' && payload.rationale.includes("Signal scores: {")) {
      payload.rationale = payload.rationale.replace(/Signal scores: \{[^}]+\}\.\s*/g, '');
    }
  }
  return {
    ...(payload as T),
    id: typeof payload.id === 'string' ? payload.id : item.id,
    projectId: item.project_id,
    title: item.title,
    status: item.status ?? payload.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    apiId: item.id,
  } as T;
}

function getApiId(value: object): string | undefined {
  const item = value as { apiId?: string; id?: string };
  if (item.apiId) return item.apiId;
  if (
    item.id &&
    !item.id.startsWith('pending-') &&
    !item.id.startsWith('sprint-') &&
    !item.id.startsWith('gen-') &&
    !item.id.startsWith('us-') &&
    !item.id.startsWith('ac-') &&
    !item.id.startsWith('tc-') &&
    !item.id.startsWith('pmt-') &&
    !item.id.startsWith('req-') &&
    !item.id.startsWith('doc-') &&
    !item.id.startsWith('act-')
  ) {
    return item.id;
  }
  return undefined;
}

export function ProjectDataProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { isAuthenticated, isDemoMode, user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<AcceptanceCriteria[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [apiSpec, setApiSpec] = useState<ApiSpecification>({} as ApiSpecification);
  const [architecture, setArchitecture] = useState<ArchitectureRecommendation>({} as ArchitectureRecommendation);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [caseStudy, setCaseStudy] = useState<CaseStudyComparison | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary>(EMPTY_DASHBOARD);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [assistantConversation, setAssistantConversation] = useState<AssistantConversation>(EMPTY_ASSISTANT_CONVERSATION);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});

  const refreshGeneratedArtifacts = useCallback(async (projectId = activeProjectId) => {
    if (!projectId) return;
    const [criteriaArtifacts, testArtifacts] = await Promise.all([
      loadGeneratedArtifacts(projectId, 'acceptance_criteria'),
      loadGeneratedArtifacts(projectId, 'test_cases'),
    ]);
    const generatedCriteria = mapAcceptanceCriteriaArtifacts(criteriaArtifacts, projectId);
    const generatedTests = mapTestCaseArtifacts(testArtifacts, projectId);
    setAcceptanceCriteria((previous) => [
      ...previous.filter((item) => !item.artifactVersionId),
      ...generatedCriteria,
    ]);
    setTestCases((previous) => [
      ...previous.filter((item) => !item.artifactVersionId),
      ...generatedTests,
    ]);
  }, [activeProjectId]);

  useEffect(() => {
    if (!isAuthenticated) {
      setProjects([]);
      setActiveProjectId('');
      setDocuments([]);
      setRequirements([]);
      setUserStories([]);
      setAcceptanceCriteria([]);
      setTestCases([]);
      setSprints([]);
      setCaseStudy(null);
      setDashboard(EMPTY_DASHBOARD);
      setActivities([]);
      setAssistantConversation(EMPTY_ASSISTANT_CONVERSATION);
      return;
    }
    let cancelled = false;
    async function loadWorkspace() {
      try {
        const apiProjects = await api.listProjects();
        const loaded = await Promise.all(apiProjects.map(async (project) => {
          const items = await api.listWorkItems(project.id);
          if (cancelled) return mapProject(project, { requirements: 0, artifacts: 0 });
          const requirements = items.filter((item) => item.record_type === 'requirement').length;
          const artifacts = items.filter((item) => !['document', 'requirement'].includes(item.record_type)).length;
          return mapProject(project, { requirements, artifacts });
        }));
        const items = await Promise.all(apiProjects.map((project) => api.listWorkItems(project.id)));
        const allItems = items.flat();
        if (cancelled) return;
        const dashboardProject = apiProjects.find((project) => project.id === activeProjectId) ?? apiProjects[0];
        const dashboardItems = allItems.filter((item) => item.project_id === dashboardProject?.id);
        const countType = (type: string) => dashboardItems.filter((item) => item.record_type === type).length;
        const requirementItems = dashboardItems.filter((item) => item.record_type === 'requirement');
        const activeSprint = dashboardItems.find((item) => item.record_type === 'sprint' && item.status === 'active');
        const activeSprintPayload = activeSprint?.payload ?? {};
        const sprintCapacity = Number(activeSprintPayload.totalPoints ?? activeSprintPayload.capacityStoryPoints ?? 0);
        const sprintCompleted = Number(activeSprintPayload.completedPoints ?? 0);
        const evaluationItems = dashboardItems.filter((item) => item.record_type === 'evaluation');
        const promptItems = dashboardItems.filter((item) => item.record_type === 'prompt');
        const qualityScores = evaluationItems
          .map((item) => Number(item.payload.overallScore ?? 0))
          .filter((score) => score > 0);
        const qualityScore = qualityScores.length
          ? Math.round(qualityScores.reduce((total, score) => total + score, 0) / qualityScores.length)
          : 0;
        const demoActivities: ActivityEntry[] = dashboardItems
          .slice()
          .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
          .slice(0, 10)
          .map((item) => ({
            id: item.id,
            projectId: item.project_id,
            userId: item.created_by,
            userName: 'DevPilot demo',
            action: 'updated',
            resourceType: item.record_type,
            resourceId: item.id,
            resourceName: item.title,
            entityTitle: item.title,
            timestamp: item.updated_at,
          }));
        setDashboard({
          ...EMPTY_DASHBOARD,
          projectId: dashboardProject?.id ?? '',
          requirementCount: requirementItems.length,
          confirmedRequirements: requirementItems.filter((item) => item.status === 'confirmed').length,
          artifactCounts: {
            user_stories: countType('user_story'),
            acceptance_criteria: countType('acceptance_criteria'),
            test_cases: countType('test_case'),
            api_specification: countType('api_specification'),
            architecture_recommendation: countType('architecture'),
            sprint_plan: countType('sprint'),
            case_study_report: countType('case_study'),
          },
          pendingReviewCount: dashboardItems.filter((item) => item.status === 'in_review').length,
          qualityScore,
          activeSprintProgress: sprintCapacity > 0 ? Math.min(100, Math.round(sprintCompleted / sprintCapacity * 100)) : 0,
          evaluationTrend: evaluationItems.map((item) => ({
            date: item.updated_at,
            score: Number(item.payload.overallScore ?? 0),
          })),
          promptPerformance: promptItems.map((item) => ({
            name: String(item.payload.name ?? item.title),
            score: Number(item.payload.benchmarkScore ?? item.payload.overallScore ?? 0),
            runs: Number(item.payload.runs ?? 0),
          })),
        });
        setActivities(demoActivities);
        setCaseStudy(isDemoMode ? MOCK_CASE_STUDY : null);
        const conversationItem = dashboardItems.find((item) => item.record_type === 'assistant_conversation');
        if (conversationItem) {
          const conversation = mapWorkItem<AssistantConversation>(conversationItem);
          setAssistantConversation({ ...conversation, messages: conversation.messages ?? [] });
        } else {
          setAssistantConversation({
            ...EMPTY_ASSISTANT_CONVERSATION,
            projectId: dashboardProject?.id ?? '',
            userId: user?.id ?? '',
            title: dashboardProject ? `${dashboardProject.name} assistant` : '',
          });
        }
        setProjects(loaded);
        const targetProjectId = (activeProjectId && loaded.some((p) => p.id === activeProjectId))
          ? activeProjectId
          : loaded[0]?.id ?? '';
        setActiveProjectId(targetProjectId);

        const projectItems = allItems.filter((i) => i.project_id === targetProjectId);
        setDocuments(projectItems.filter((i) => i.record_type === 'document').map((i) => mapWorkItem<SourceDocument>(i)));
        const workspaceRequirements = projectItems.filter((i) => i.record_type === 'requirement').map((i) => mapWorkItem<Requirement>(i));
        if (targetProjectId) {
          try {
            const persistedRequirements = await api.listRequirements(targetProjectId);
            if (!cancelled && persistedRequirements.length > 0) {
              setRequirements(persistedRequirements.map((record) => ({
                id: record.requirement_key,
                apiId: record.id,
                projectId: record.project_id,
                title: record.title,
                description: record.description,
                category: (record.category ?? 'functional') as Requirement['category'],
                priority: (record.priority ?? 'should') as Requirement['priority'],
                status: 'extracted',
                sourceDocumentId: record.source_document ?? undefined,
                sourceDocumentName: record.source_document ?? undefined,
                sourceLocation: record.source_location ? JSON.stringify(record.source_location) : undefined,
                createdAt: record.created_at,
                updatedAt: record.updated_at,
              })));
            } else if (!cancelled) {
              setRequirements(workspaceRequirements);
            }
          } catch {
            if (!cancelled) setRequirements(workspaceRequirements);
          }
        } else {
          setRequirements(workspaceRequirements);
        }

        let loadedStories = projectItems.filter((i) => i.record_type === 'user_story').map((i) => mapWorkItem<UserStory>(i));
        if (loadedStories.length === 0 && targetProjectId) {
          try {
            const artifacts = await api.listArtifacts(targetProjectId, 'user_stories');
            if (artifacts.length > 0) {
              const latestDetail = await api.getArtifact(targetProjectId, artifacts[0].id);
              const artifactStories = (latestDetail.current_version?.payload as any)?.stories;
              if (Array.isArray(artifactStories) && artifactStories.length > 0) {
                loadedStories = artifactStories.map((s: any) => ({
                  id: s.story_key || s.id || generateId('us'),
                  projectId: targetProjectId,
                  artifactVersionId: latestDetail.current_version?.id,
                  requirementId: s.source_requirement_keys?.[0] || '',
                  title: s.title || `User Story ${s.story_key || s.id}`,
                  asA: s.as_a,
                  userRole: s.as_a || 'User',
                  iWant: s.i_want,
                  action: s.i_want || '',
                  soThat: s.so_that,
                  benefit: s.so_that || '',
                  personaDescription: s.as_a || '',
                  storyPoints: typeof s.estimated_story_points === 'number' ? s.estimated_story_points : 3,
                  priority: (s.priority as any) || 'should',
                  status: 'draft' as ArtifactStatus,
                  version: latestDetail.current_version?.version_number || 1,
                  history: [],
                  sourceRequirementIds: s.source_requirement_keys || [],
                  dependencyIds: s.dependency_ids || [],
                  createdAt: latestDetail.created_at,
                  updatedAt: latestDetail.updated_at,
                }));
              }
            }
          } catch {
            // Non-fatal artifact fallback
          }
        }
        setUserStories(loadedStories);
        const workItemCriteria = projectItems.filter((i) => i.record_type === 'acceptance_criteria').map((i) => mapWorkItem<AcceptanceCriteria>(i));
        const workItemTests = projectItems.filter((i) => i.record_type === 'test_case').map((i) => mapWorkItem<TestCase>(i));
        let generatedCriteria: AcceptanceCriteria[] = [];
        let generatedTests: TestCase[] = [];
        try {
          const [criteriaArtifacts, testArtifacts] = await Promise.all([
            loadGeneratedArtifacts(targetProjectId, 'acceptance_criteria'),
            loadGeneratedArtifacts(targetProjectId, 'test_cases'),
          ]);
          generatedCriteria = mapAcceptanceCriteriaArtifacts(criteriaArtifacts, targetProjectId);
          generatedTests = mapTestCaseArtifacts(testArtifacts, targetProjectId);
        } catch {
          // Keep workspace-backed records visible if generated artifact loading is unavailable.
        }
        const mergeById = <T extends { id: string }>(existing: T[], generated: T[]) => {
          const merged = new Map(existing.map((item) => [item.id, item]));
          generated.forEach((item) => merged.set(item.id, item));
          return [...merged.values()];
        };
        setAcceptanceCriteria(mergeById(workItemCriteria, generatedCriteria));
        setTestCases(mergeById(workItemTests, generatedTests));
        const apiSpecifications = projectItems.filter((i) => i.record_type === 'api_specification');
        const architectures = projectItems.filter((i) => i.record_type === 'architecture');
        setApiSpec(apiSpecifications[0]
          ? mapWorkItem<ApiSpecification>(apiSpecifications[0])
          : {} as ApiSpecification);
        setArchitecture(architectures[0]
          ? mapWorkItem<ArchitectureRecommendation>(architectures[0])
          : {} as ArchitectureRecommendation);
        setSprints(projectItems.filter((i) => i.record_type === 'sprint').map((i) => mapWorkItem<Sprint>(i)));
      } catch (error) {
        if (!cancelled) toast({ variant: 'error', title: 'Unable to load workspace', description: (error as Error).message });
      }
    }
    void loadWorkspace();
    return () => { cancelled = true; };
  }, [activeProjectId, isAuthenticated, isDemoMode, toast, user?.id]);

  const handleSelectProjectId = useCallback((id: string) => {
    setActiveProjectId(id);
    setDocuments([]);
    setRequirements([]);
    setUserStories([]);
    setAcceptanceCriteria([]);
    setTestCases([]);
    setApiSpec({} as ApiSpecification);
    setArchitecture({} as ArchitectureRecommendation);
    setSprints([]);
  }, []);

  const refreshBackendRequirements = useCallback(async (projectId: string) => {
    const records = await api.listRequirements(projectId);
    const mapped: Requirement[] = records.map((record) => ({
      id: record.requirement_key,
      apiId: record.id,
      projectId: record.project_id,
      title: record.title,
      description: record.description,
      category: (record.category ?? 'functional') as Requirement['category'],
      priority: (record.priority ?? 'should') as Requirement['priority'],
      status: 'extracted',
      sourceDocumentId: record.source_document ?? undefined,
      sourceDocumentName: record.source_document ?? undefined,
      sourceLocation: record.source_location ? JSON.stringify(record.source_location) : undefined,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }));
    setRequirements(mapped);
    return mapped;
  }, []);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? EMPTY_PROJECT;

  const persistItem = useCallback((
    recordType: string,
    item: object & { id: string; projectId: string; title?: string; name?: string; status?: string },
  ) => {
    const apiId = getApiId(item);
    const payload = { ...item } as Record<string, unknown>;
    delete payload.apiId;
    const itemTitle = item.title ?? item.name ?? recordType;
    const request = apiId
      ? api.updateWorkItem(item.projectId, apiId, { title: itemTitle, status: item.status, payload })
      : api.createWorkItem(item.projectId, {
        record_type: recordType,
        title: itemTitle,
        status: item.status,
        payload,
      });
    void request.catch((error: Error) => {
      toast({ variant: 'error', title: 'Changes could not be saved', description: error.message });
    });
  }, [toast]);

  const logActivity = useCallback((action: string, entityType: ActivityEntry['entityType'], entityId: string, entityTitle: string) => {
    const newEntry: ActivityEntry = {
      id: generateId('act'),
      userId: 'usr-001',
      userName: 'Demo User',
      userRole: 'admin' as UserRole,
      action,
      entityType,
      entityId,
      entityTitle,
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [newEntry, ...prev.slice(0, 49)]);
  }, []);

  // Project operations
  const createProject = useCallback((data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'memberCount' | 'requirementCount' | 'artifactCount' | 'pendingReviewCount' | 'qualityScore'>) => {
    const newProj: Project = { ...EMPTY_PROJECT, ...data, id: generateId('pending-project') };
    void api.createProject({ name: data.name, description: data.description }).then((created) => {
      const persisted = mapProject(created, { requirements: 0, artifacts: 0 });
      setProjects((prev) => [persisted, ...prev.filter((project) => project.id !== newProj.id)]);
      setActiveProjectId(persisted.id);
    }).catch((error: Error) => {
      toast({ variant: 'error', title: 'Project could not be created', description: error.message });
    });
    return newProj;
  }, [toast]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    void api.updateProject(id, { name: updates.name, description: updates.description }).then((updated) => {
      setProjects((prev) => prev.map((project) => project.id === id
        ? { ...project, ...mapProject(updated, { requirements: project.requirementCount, artifacts: project.artifactCount }) }
        : project));
    }).catch((error: Error) => {
      toast({ variant: 'error', title: 'Project could not be updated', description: error.message });
    });
    toast({ variant: 'info', title: 'Project updated' });
  }, [toast]);

  // Documents
  const uploadDocument = useCallback(async (file: { name: string; size: number; type: string }, projectId: string) => {
    setIsProcessing((prev) => ({ ...prev, upload: true }));
    await sleep(800);
    const newDoc: SourceDocument = {
      id: generateId('doc'),
      projectId,
      filename: file.name,
      mimeType: file.type || 'application/pdf',
      sizeBytes: file.size,
      status: 'extracted',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'usr-003',
      sectionCount: 4,
      extractedRequirementCount: 2,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setIsProcessing((prev) => ({ ...prev, upload: false }));
    logActivity('Uploaded document', 'document', newDoc.id, newDoc.filename);
    toast({ variant: 'success', title: 'Document uploaded', description: `Processed ${file.name}` });
    return newDoc;
  }, [logActivity, toast]);

  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    toast({ variant: 'info', title: 'Document removed' });
  }, [toast]);

  // Requirements
  const updateRequirementStatus = useCallback((id: string, status: RequirementStatus) => {
    const requirement = requirements.find((item) => item.id === id);
    if (requirement && getApiId(requirement)) {
      void api.updateWorkItem(requirement.projectId, getApiId(requirement)!, { status }).catch((error: Error) => {
        toast({ variant: 'error', title: 'Requirement status could not be saved', description: error.message });
      });
    }
    setRequirements((prev) => prev.map((r) => (r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r)));
    logActivity(`Changed status to ${status}`, 'requirement', id, id);
    toast({ variant: 'success', title: 'Status updated', description: `Requirement ${id} marked as ${status}.` });
  }, [logActivity, requirements, toast]);

  const updateRequirement = useCallback((id: string, updates: Partial<Requirement>) => {
    const requirement = requirements.find((item) => item.id === id);
    if (requirement && getApiId(requirement)) {
      void api.updateWorkItem(requirement.projectId, getApiId(requirement)!, {
        title: updates.title,
        payload: { ...requirement, ...updates },
        status: updates.status,
      }).catch((error: Error) => {
        toast({ variant: 'error', title: 'Requirement could not be saved', description: error.message });
      });
    }
    setRequirements((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r)));
    toast({ variant: 'info', title: 'Requirement saved' });
  }, [requirements, toast]);

  const addRequirement = useCallback((req: Omit<Requirement, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newReq: Requirement = {
      ...req,
      id: generateId('req'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRequirements((prev) => [newReq, ...prev]);
    void api.createWorkItem(req.projectId, {
      record_type: 'requirement',
      title: newReq.title ?? 'Requirement',
      status: newReq.status,
      payload: newReq as unknown as Record<string, unknown>,
      source_ids: newReq.sourceDocumentId ? [newReq.sourceDocumentId] : [],
    }).then((created) => {
      setRequirements((prev) => prev.map((item) => item.id === newReq.id ? mapWorkItem<Requirement>(created) : item));
    }).catch((error: Error) => {
      setRequirements((prev) => prev.filter((item) => item.id !== newReq.id));
      toast({ variant: 'error', title: 'Requirement could not be created', description: error.message });
    });
    logActivity('Added requirement', 'requirement', newReq.id, newReq.title ?? newReq.id);
    toast({ variant: 'success', title: 'Requirement created', description: newReq.title });
    return newReq;
  }, [logActivity, toast]);

  const extractRequirementsFromDoc = useCallback(async (docId: string) => {
    setIsProcessing((prev) => ({ ...prev, [`extract_${docId}`]: true }));
    await sleep(1200);
    const newReqs: Requirement[] = [
      {
        id: generateId('req'),
        projectId: activeProjectId,
        sourceDocumentId: docId,
        sourceSection: 'Section 4.1 - Security Controls',
        title: 'Hardware-backed Cryptographic Keystore Isolation',
        description: 'Biometric cryptographic keys must be stored strictly within Apple Secure Enclave or Android KeyStore hardware with zero host-OS plaintext leakage.',
        category: 'security',
        priority: 'must',
        status: 'extracted',
        confidenceScore: 92,
        contradictions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId('req'),
        projectId: activeProjectId,
        sourceDocumentId: docId,
        sourceSection: 'Section 4.4 - Resilience',
        title: 'Graceful Degradation to PIN Authentication',
        description: 'When biometric hardware fails, the application must offer PIN fallback within 2 seconds without terminating the ongoing session context.',
        category: 'functional',
        priority: 'should',
        status: 'extracted',
        confidenceScore: 88,
        contradictions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    setRequirements((prev) => [...newReqs, ...prev]);
    setIsProcessing((prev) => ({ ...prev, [`extract_${docId}`]: false }));
    toast({ variant: 'success', title: 'Extraction complete', description: `Identified 2 candidate requirements from document.` });
    return newReqs;
  }, [activeProjectId, toast]);

  // User Stories
  const updateUserStory = useCallback((id: string, updates: Partial<UserStory>) => {
    const item = userStories.find((story) => story.id === id);
    if (item) persistItem('user_story', { ...item, ...updates });
    setUserStories((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s)));
    toast({ variant: 'info', title: 'User story updated' });
  }, [persistItem, toast, userStories]);

  const updateUserStoryStatus = useCallback((id: string, status: ArtifactStatus) => {
    const item = userStories.find((story) => story.id === id);
    if (item) persistItem('user_story', { ...item, status });
    setUserStories((prev) => prev.map((s) => (s.id === id ? { ...s, status, updatedAt: new Date().toISOString() } : s)));
    logActivity(`User story marked ${status}`, 'user_story', id, id);
    toast({ variant: 'success', title: 'Story status changed', description: `${id} is now ${status}.` });
  }, [logActivity, persistItem, toast, userStories]);

  const generateUserStories = useCallback(async (requirementIds: string[]) => {
    if (!activeProjectId) {
      toast({ variant: 'error', title: 'No active project selected' });
      return [];
    }

    // Workspace requirements carry a local id (e.g. "req-001") plus the real
    // backend UUID in `apiId`. The generation API only accepts UUIDs, so map
    // the local ids across before sending; unknown ids are dropped.
    const apiIdByLocalId = new Map<string, string>();
    for (const req of requirements) {
      if (req.apiId) apiIdByLocalId.set(req.id, req.apiId);
    }
    const backendRequirementIds = Array.from(
      new Set(
        requirementIds
          .map((id) => apiIdByLocalId.get(id))
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const localIdByApiId = new Map<string, string>();
    for (const [localId, apiId] of apiIdByLocalId) {
      if (!localIdByApiId.has(apiId)) localIdByApiId.set(apiId, localId);
    }

    setIsProcessing((prev) => ({ ...prev, generateStories: true }));
    try {
      const artifact = await api.generateUserStories(activeProjectId, {
        title: 'User Stories',
        requirement_ids: backendRequirementIds.length > 0 ? backendRequirementIds : undefined,
      });
      const sourceApiIds = artifact.current_version?.source_requirement_ids ?? [];
      const rawStories = (artifact.current_version?.payload as any)?.stories || [];
      const generated: UserStory[] = rawStories.map((s: any) => {
        const sid = s.story_key || s.id || generateId('us');
        return {
          id: sid,
          projectId: activeProjectId,
          artifactVersionId: artifact.current_version?.id,
          requirementId: localIdByApiId.get(sourceApiIds[0] ?? '') || requirementIds[0] || '',
          title: s.title || `User Story ${sid}`,
          asA: s.as_a,
          userRole: s.as_a || 'User',
          iWant: s.i_want,
          action: s.i_want || '',
          soThat: s.so_that,
          benefit: s.so_that || '',
          personaDescription: s.as_a || '',
          storyPoints: typeof s.estimated_story_points === 'number' ? s.estimated_story_points : 3,
          priority: (s.priority as any) || 'should',
          status: 'draft' as ArtifactStatus,
          version: artifact.current_version?.version_number || 1,
          history: [],
          sourceRequirementIds: s.source_requirement_keys || requirementIds,
          dependencyIds: s.dependency_ids || [],
          createdAt: artifact.created_at || new Date().toISOString(),
          updatedAt: artifact.updated_at || new Date().toISOString(),
        };
      });

      for (const item of generated) {
        try {
          const created = await api.createWorkItem(activeProjectId, {
            record_type: 'user_story',
            title: item.title,
            status: item.status,
            payload: {
              ...item,
              story_key: item.id,
              as_a: item.userRole,
              i_want: item.action,
              so_that: item.benefit,
            },
            source_ids: item.sourceRequirementIds || [],
          });
          item.apiId = created.id;
        } catch {
          // Keep in-memory if work item bridge creation encounters issue
        }
      }

      setUserStories((prev) => {
        const existingIds = new Set(generated.map((g) => g.id));
        return [...generated, ...prev.filter((p) => !existingIds.has(p.id))];
      });

      toast({
        variant: 'success',
        title: 'AI Generation Finished',
        description: `Generated ${generated.length} user stories from requirements.`,
      });
      return generated;
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'User story generation failed',
        description: err.message || 'Unable to generate user stories',
      });
      throw err;
    } finally {
      setIsProcessing((prev) => ({ ...prev, generateStories: false }));
    }
  }, [activeProjectId, requirements, toast]);

  // Acceptance Criteria
  const updateAcceptanceCriteria = useCallback((id: string, updates: Partial<AcceptanceCriteria>) => {
    const item = acceptanceCriteria.find((criteria) => criteria.id === id);
    if (item) persistItem('acceptance_criteria', { ...item, ...updates });
    setAcceptanceCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)));
    toast({ variant: 'info', title: 'Acceptance criteria updated' });
  }, [acceptanceCriteria, persistItem, toast]);

  const updateAcceptanceCriteriaStatus = useCallback((id: string, status: ArtifactStatus) => {
    const item = acceptanceCriteria.find((criteria) => criteria.id === id);
    if (item) persistItem('acceptance_criteria', { ...item, status });
    setAcceptanceCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c)));
    toast({ variant: 'success', title: 'Criteria status updated', description: `${id} set to ${status}.` });
  }, [acceptanceCriteria, persistItem, toast]);

  const generateAcceptanceCriteria = useCallback(async (userStoryIds: string[]) => {
    setIsProcessing((prev) => ({ ...prev, generateCriteria: true }));
    try {
      const requirementKeys = [...new Set(userStories
        .filter((story) => userStoryIds.includes(story.id))
        .flatMap((story) => story.sourceRequirementIds ?? []))];
      const requirementIds = requirementKeys
        .map((key) => requirements.find((requirement) => requirement.id === key)?.apiId)
        .filter((id): id is string => Boolean(id));
      if (!activeProjectId || !requirementIds.length) {
        throw new Error('Select a user story linked to an ingested requirement before generating acceptance criteria.');
      }

      const artifact = await api.generateAcceptanceCriteria(activeProjectId, {
        title: `Acceptance Criteria — ${activeProject.name}`,
        requirement_ids: [...new Set(requirementIds)],
      });
      const generated = mapAcceptanceCriteriaArtifacts([artifact], activeProjectId);
      await refreshGeneratedArtifacts(activeProjectId);
      toast({ variant: 'success', title: 'Acceptance criteria generated', description: `Saved ${generated.length} criteria to this project.` });
      return generated;
    } catch (error) {
      toast({ variant: 'error', title: 'Acceptance criteria generation failed', description: error instanceof Error ? error.message : 'Unable to generate acceptance criteria.' });
      return [];
    } finally {
      setIsProcessing((prev) => ({ ...prev, generateCriteria: false }));
    }
  }, [activeProject.name, activeProjectId, refreshGeneratedArtifacts, requirements, toast, userStories]);

  // Test Cases
  const updateTestCase = useCallback((id: string, updates: Partial<TestCase>) => {
    const item = testCases.find((testCase) => testCase.id === id);
    if (item) persistItem('test_case', { ...item, ...updates });
    setTestCases((prev) => prev.map((tc) => (tc.id === id ? { ...tc, ...updates, updatedAt: new Date().toISOString() } : tc)));
    toast({ variant: 'info', title: 'Test case updated' });
  }, [persistItem, testCases, toast]);

  const updateTestCaseStatus = useCallback((id: string, status: ArtifactStatus) => {
    const item = testCases.find((testCase) => testCase.id === id);
    if (item) persistItem('test_case', { ...item, status });
    setTestCases((prev) => prev.map((tc) => (tc.id === id ? { ...tc, status, updatedAt: new Date().toISOString() } : tc)));
    toast({ variant: 'success', title: 'Test case status updated' });
  }, [persistItem, testCases, toast]);

  const generateTestCases = useCallback(async (criteriaIds: string[]) => {
    setIsProcessing((prev) => ({ ...prev, generateTests: true }));
    try {
      const requirementKeys = [...new Set(acceptanceCriteria
        .filter((criteria) => criteriaIds.includes(criteria.id))
        .flatMap((criteria) => criteria.sourceRequirementIds ?? []))];
      const requirementIds = requirementKeys
        .map((key) => requirements.find((requirement) => requirement.id === key)?.apiId)
        .filter((id): id is string => Boolean(id));
      if (!activeProjectId || !requirementIds.length) {
        throw new Error('Select acceptance criteria linked to an ingested requirement before generating test cases.');
      }

      const artifact = await api.generateTestCases(activeProjectId, {
        title: `Test Cases — ${activeProject.name}`,
        requirement_ids: [...new Set(requirementIds)],
      });
      const generated = mapTestCaseArtifacts([artifact], activeProjectId);
      await refreshGeneratedArtifacts(activeProjectId);
      toast({ variant: 'success', title: 'Test cases generated', description: `Saved ${generated.length} test cases to this project.` });
      return generated;
    } catch (error) {
      toast({ variant: 'error', title: 'Test case generation failed', description: error instanceof Error ? error.message : 'Unable to generate test cases.' });
      return [];
    } finally {
      setIsProcessing((prev) => ({ ...prev, generateTests: false }));
    }
  }, [acceptanceCriteria, activeProject.name, activeProjectId, refreshGeneratedArtifacts, requirements, toast]);

  // API Spec
  const updateApiSpec = useCallback((spec: ApiSpecification) => {
    persistItem('api_specification', spec);
    setApiSpec(spec);
    toast({ variant: 'info', title: 'API Specification saved' });
  }, [persistItem, toast]);

  const generateApiEndpoints = useCallback(async (storyIds: string[]) => {
    void storyIds;
    setIsProcessing((prev) => ({ ...prev, generateApi: true }));
    await sleep(1600);
    setIsProcessing((prev) => ({ ...prev, generateApi: false }));
    toast({ variant: 'success', title: 'OpenAPI Spec Synchronized', description: 'Updated endpoints to match latest user stories.' });
  }, [toast]);

  // Architecture
  const updateArchitecture = useCallback((arch: ArchitectureRecommendation) => {
    persistItem('architecture', arch);
    setArchitecture(arch);
    toast({ variant: 'info', title: 'Architecture updated' });
  }, [persistItem, toast]);

  const generateArchitectureRecommendation = useCallback(async (customContext?: string) => {
    if (!activeProjectId) {
      toast({ variant: 'error', title: 'No active project selected' });
      return null;
    }
    setIsProcessing((prev) => ({ ...prev, generateArch: true }));
    try {
      const res = await api.recommendArchitecture(activeProjectId, { context: customContext || '' });
      const mappedArch: ArchitectureRecommendation = {
        id: res.id,
        projectId: res.project_id,
        artifactVersionId: 'v1',
        title: `Architecture: ${res.pattern}`,
        summary: res.summary,
        pattern: res.pattern,
        components: (res.components || []).map((c) => ({
          name: c.name,
          role: c.role,
          technology: c.technology,
          responsibilities: c.responsibilities,
        })),
        decisions: (res.adrs || []).map((a) => ({
          id: a.id,
          title: a.title,
          context: a.context,
          decision: a.decision,
          consequences: a.consequences,
        })),
        securityConsiderations: res.security_patterns || [],
        resiliencePatterns: res.resilience_patterns || [],
        resilience_patterns: res.resilience_patterns || [],
        dataStores: res.data_stores || [],
        data_stores: res.data_stores || [],
        deploymentTopology: res.deployment_topology || '',
        alternatives: res.alternatives || [],
        assumptions: res.assumptions || [],
        risks: res.risks || [],
        rationale: res.rationale || '',
        evidence: res.evidence || [],
        provider: res.provider || 'rules_based',
        mermaidDiagram: res.mermaid_diagram ?? undefined,
        status: 'draft',
        sourceRequirementIds: [],
        createdAt: res.created_at,
        updatedAt: res.updated_at,
      };
      setArchitecture(mappedArch);
      toast({
        variant: 'success',
        title: 'Architecture Blueprint Synthesized',
        description: `Successfully synthesized ${res.pattern} pattern (${res.provider}).`,
      });
      return mappedArch;
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Architecture synthesis failed',
        description: err.message || 'Unable to generate recommendation',
      });
      throw err;
    } finally {
      setIsProcessing((prev) => ({ ...prev, generateArch: false }));
    }
  }, [activeProjectId, toast]);

  // Sprints
  const updateSprint = useCallback((id: string, updates: Partial<Sprint>) => {
    const item = sprints.find((sprint) => sprint.id === id);
    if (item) persistItem('sprint', { ...item, ...updates });
    setSprints((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    toast({ variant: 'info', title: 'Sprint updated' });
  }, [persistItem, sprints, toast]);

  const createSprint = useCallback((sprintData: Omit<Sprint, 'id' | 'createdAt'>) => {
    const tempId = generateId('sprint');
    const newSprint: Sprint = {
      ...sprintData,
      id: tempId,
      source: 'manual',
      isManual: true,
      createdAt: new Date().toISOString(),
    };
    setSprints((prev) => [...prev, newSprint]);

    if (activeProjectId) {
      void api.createWorkItem(activeProjectId, {
        record_type: 'sprint',
        title: sprintData.name,
        status: sprintData.status || 'planning',
        payload: {
          ...sprintData,
          source: 'manual',
          is_manual: true,
        },
      }).then((createdItem) => {
        setSprints((prev) => prev.map((sp) => (sp.id === tempId ? mapWorkItem<Sprint>(createdItem) : sp)));
      }).catch((err: Error) => {
        toast({ variant: 'error', title: 'Failed to persist sprint', description: err.message });
      });
    }

    toast({ variant: 'success', title: 'Sprint created', description: newSprint.name });
    return newSprint;
  }, [activeProjectId, toast]);

  const deleteSprint = useCallback(async (sprintId: string) => {
    const sprintToDelete = sprints.find((s) => s.id === sprintId);
    if (!sprintToDelete) return;

    setSprints((prev) => prev.filter((s) => s.id !== sprintId));

    if (activeProjectId) {
      const apiId = getApiId(sprintToDelete) || sprintToDelete.id;
      try {
        await api.deleteWorkItem(activeProjectId, apiId);
        toast({ variant: 'success', title: 'Sprint deleted', description: sprintToDelete.name });
      } catch (err: any) {
        setSprints((prev) => [...prev, sprintToDelete]);
        toast({ variant: 'error', title: 'Failed to delete sprint', description: err.message });
        throw err;
      }
    }
  }, [activeProjectId, sprints, toast]);

  const assignStoryToSprint = useCallback((storyId: string, sprintId: string | null) => {
    const nextSprints = sprints.map((sprint) => {
      const currentStoryIds = sprint.userStoryIds ?? sprint.items?.map((item) => item.storyId) ?? [];
      const withoutStory = currentStoryIds.filter((id) => id !== storyId);
      const isTarget = sprint.id === sprintId;
      const nextStoryIds = isTarget ? [...withoutStory, storyId] : withoutStory;
      const allocatedStoryPoints = nextStoryIds.reduce((total, id) => {
        const found = userStories.find((story) => story.id === id);
        return total + (found?.storyPoints ?? 0);
      }, 0);

      return {
        ...sprint,
        userStoryIds: nextStoryIds,
        allocatedStoryPoints,
      };
    });

    const affected = nextSprints.filter((s) => {
      const oldSprint = sprints.find((p) => p.id === s.id);
      const oldIds = oldSprint?.userStoryIds ?? [];
      const newIds = s.userStoryIds ?? [];
      return oldIds.length !== newIds.length || oldIds.some((id) => !newIds.includes(id));
    });

    setSprints(nextSprints);

    if (activeProjectId && affected.length > 0) {
      affected.forEach((sp) => {
        persistItem('sprint', sp);
      });
    }

    toast({ variant: 'info', title: 'Sprint story assignment updated' });
  }, [activeProjectId, persistItem, sprints, userStories, toast]);

  const planSprints = useCallback(async (options?: {
    capacityStoryPoints?: number;
    sprintDurationWeeks?: number;
    explicitStories?: ApiNormalizedStoryIn[];
  }) => {
    if (!activeProjectId) {
      toast({ variant: 'error', title: 'No active project selected' });
      throw new Error('No active project selected');
    }
    setIsProcessing((prev) => ({ ...prev, planSprints: true }));
    try {
      let payloadStories: ApiNormalizedStoryIn[] | undefined = options?.explicitStories;
      if (!payloadStories && userStories.length > 0) {
        payloadStories = userStories.map((s) => ({
          id: s.id,
          title: s.title,
          priority: s.priority || 'should',
          description: s.action || s.benefit || '',
          acceptance_criteria_count: 2,
          dependency_ids: s.dependencyIds || [],
          risk_level: 'medium',
          complexity: 'medium',
          existing_estimate: s.storyPoints && s.storyPoints > 0 ? s.storyPoints : null,
        }));
      }

      const res = await api.planSprints(activeProjectId, {
        stories: payloadStories,
        capacity_story_points: options?.capacityStoryPoints ?? 30,
        sprint_duration_weeks: options?.sprintDurationWeeks ?? 2,
      });

      const mappedSprints: Sprint[] = res.sprints.map((sp) => ({
        id: sp.id,
        apiId: sp.id,
        projectId: sp.project_id,
        name: sp.name,
        goal: sp.goal,
        startDate: sp.start_date,
        endDate: sp.end_date,
        status: sp.status as any,
        totalPoints: sp.total_points,
        completedPoints: 0,
        allocatedStoryPoints: sp.total_points,
        capacityStoryPoints: sp.capacity,
        targetVelocity: sp.capacity,
        userStoryIds: sp.story_ids,
        warnings: sp.warnings,
        createdAt: sp.created_at,
        source: 'auto_planner',
        isAutoPlanned: true,
      }));

      if (res.estimates && res.estimates.length > 0) {
        const estMap = new Map(res.estimates.map((e) => [e.story_id, e.estimated_points]));
        setUserStories((prev) =>
          prev.map((s) => (estMap.has(s.id) ? { ...s, storyPoints: estMap.get(s.id) } : s))
        );
      }

      setSprints((prev) => {
        const manualSprints = prev.filter((s) => s.source === 'manual' || s.isManual);
        return [...manualSprints, ...mappedSprints];
      });
      toast({
        variant: 'success',
        title: 'Sprint Plan Generated',
        description: `Successfully planned ${res.total_stories_planned} stories across ${res.total_sprints} sprints (${res.total_story_points} pts).`,
      });
      return res;
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Sprint planning failed',
        description: err.message || 'Unable to plan sprints',
      });
      throw err;
    } finally {
      setIsProcessing((prev) => ({ ...prev, planSprints: false }));
    }
  }, [activeProjectId, toast, userStories]);

  const refreshSprints = useCallback(async () => {
    if (!activeProjectId) return [];
    try {
      const apiSprints = await api.listSprints(activeProjectId);
      const mapped: Sprint[] = apiSprints.map((sp) => ({
        id: sp.id,
        apiId: sp.id,
        projectId: sp.project_id,
        name: sp.name,
        goal: sp.goal,
        startDate: sp.start_date,
        endDate: sp.end_date,
        status: sp.status as any,
        totalPoints: sp.total_points,
        completedPoints: 0,
        allocatedStoryPoints: sp.total_points,
        capacityStoryPoints: sp.capacity,
        targetVelocity: sp.capacity,
        userStoryIds: sp.story_ids,
        warnings: sp.warnings,
        createdAt: sp.created_at,
      }));
      setSprints(mapped);
      return mapped;
    } catch (err: any) {
      toast({ variant: 'error', title: 'Failed to refresh sprints', description: err.message });
      return [];
    }
  }, [activeProjectId, toast]);

  // Assistant
  const sendAssistantMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: generateId('msg'),
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    setAssistantConversation((prev) => ({
      ...prev,
      messages: [...(prev.messages ?? []), userMsg],
      updatedAt: new Date().toISOString(),
    }));

    setIsProcessing((prev) => ({ ...prev, assistantTyping: true }));
    await sleep(1200);

    const botMsg: ChatMessage = {
      id: generateId('msg'),
      sender: 'assistant',
      text: `I received your question about ${activeProject.name || 'this workspace'}, but the project-connected assistant service is not configured yet.`,
      sourceArtifacts: [],
      isMock: true,
      timestamp: new Date().toISOString(),
    };

    setAssistantConversation((prev) => ({
      ...prev,
      messages: [...(prev.messages ?? []), botMsg],
      updatedAt: new Date().toISOString(),
    }));
    setIsProcessing((prev) => ({ ...prev, assistantTyping: false }));
  }, [activeProject.name]);

  const resetAllData = useCallback(() => {
    toast({ variant: 'info', title: 'Data reset unavailable', description: 'Canonical workspace data is managed by the backend.' });
  }, [toast]);

  return (
    <ProjectDataContext.Provider
      value={{
        projects,
        activeProject,
        setActiveProjectId: handleSelectProjectId,
        createProject,
        updateProject,
        documents,
        uploadDocument,
        deleteDocument,
        requirements,
        refreshBackendRequirements,
        updateRequirementStatus,
        updateRequirement,
        addRequirement,
        extractRequirementsFromDoc,
        userStories,
        updateUserStory,
        updateUserStoryStatus,
        generateUserStories,
        acceptanceCriteria,
        refreshGeneratedArtifacts,
        updateAcceptanceCriteria,
        updateAcceptanceCriteriaStatus,
        generateAcceptanceCriteria,
        testCases,
        updateTestCase,
        updateTestCaseStatus,
        generateTestCases,
        apiSpec,
        updateApiSpec,
        generateApiEndpoints,
        architecture,
        updateArchitecture,
        generateArchitectureRecommendation,
        sprints,
        updateSprint,
        createSprint,
        deleteSprint,
        assignStoryToSprint,
        planSprints,
        refreshSprints,
        caseStudy,
        dashboard,
        activities,
        assistantConversation,
        sendAssistantMessage,
        isProcessing,
        resetAllData,
      }}
    >
      {children}
    </ProjectDataContext.Provider>
  );
}

export function useProjectData() {
  const ctx = useContext(ProjectDataContext);
  if (!ctx) throw new Error('useProjectData must be used within ProjectDataProvider');
  return ctx;
}
