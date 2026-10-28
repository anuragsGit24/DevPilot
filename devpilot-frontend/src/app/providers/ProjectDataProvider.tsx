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
  PromptTemplate,
  EvaluationRun,
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
import { api, type ApiProject, type ApiWorkItem } from '@/lib/api';

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
  generateArchitectureRecommendation: () => Promise<void>;

  // Sprints
  sprints: Sprint[];
  updateSprint: (id: string, updates: Partial<Sprint>) => void;
  createSprint: (sprint: Omit<Sprint, 'id' | 'createdAt'>) => Sprint;
  assignStoryToSprint: (storyId: string, sprintId: string | null) => void;

  // Prompts
  prompts: PromptTemplate[];
  updatePrompt: (id: string, updates: Partial<PromptTemplate>) => void;
  createPrompt: (prompt: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>) => PromptTemplate;
  testPrompt: (promptId: string, variables: Record<string, string>) => Promise<string>;

  // Evaluations
  evaluationRuns: EvaluationRun[];
  runEvaluation: (name: string, dataset: string, projectId?: string) => Promise<EvaluationRun>;

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
    prompt: ['versions', 'variables'],
    evaluation: ['results', 'history'],
    assistant_conversation: ['messages'],
  };
  for (const key of arrayDefaults[item.record_type] ?? []) {
    if (!Array.isArray(payload[key])) payload[key] = [];
  }
  if (item.record_type === 'prompt') {
    payload.name = typeof payload.name === 'string' ? payload.name : item.title;
    payload.description = typeof payload.description === 'string' ? payload.description : '';
    payload.variables = Array.isArray(payload.variables) ? payload.variables : [];
    payload.versions = Array.isArray(payload.versions) && payload.versions.length > 0
      ? payload.versions
      : [{
        versionNumber: Number(payload.version ?? 1),
        status: item.status ?? 'active',
        variables: payload.variables,
      }];
    payload.activeVersion = Number(payload.activeVersion ?? payload.version ?? 1);
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
    payload.userStoryIds = Array.isArray(payload.userStoryIds) ? payload.userStoryIds : [];
    payload.totalPoints = Number(payload.totalPoints ?? payload.capacityStoryPoints ?? 0);
    payload.capacityStoryPoints = Number(payload.capacityStoryPoints ?? payload.totalPoints ?? 0);
    payload.completedPoints = Number(payload.completedPoints ?? 0);
    payload.allocatedStoryPoints = Number(payload.allocatedStoryPoints ?? 0);
    payload.targetVelocity = Number(payload.targetVelocity ?? payload.capacityStoryPoints ?? 0);
    payload.startDate = payload.startDate ?? item.created_at;
    payload.endDate = payload.endDate ?? item.updated_at;
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
    for (const key of ['components', 'decisions', 'risks', 'alternatives']) {
      if (!Array.isArray(payload[key])) payload[key] = [];
    }
  }
  if (item.record_type === 'evaluation') {
    payload.name = payload.name ?? item.title;
    payload.metrics = payload.metrics ?? {
      accuracy: Number(payload.overallScore ?? 0),
      completeness: Number(payload.overallScore ?? 0),
      relevance: Number(payload.overallScore ?? 0),
      overallScore: Number(payload.overallScore ?? 0),
    };
    payload.overallScore = Number(payload.overallScore ?? 0);
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
  return (value as object & { apiId?: string }).apiId;
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
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [evaluationRuns, setEvaluationRuns] = useState<EvaluationRun[]>([]);
  const [caseStudy, setCaseStudy] = useState<CaseStudyComparison | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary>(EMPTY_DASHBOARD);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [assistantConversation, setAssistantConversation] = useState<AssistantConversation>(EMPTY_ASSISTANT_CONVERSATION);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});

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
      setPrompts([]);
      setEvaluationRuns([]);
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
        setActiveProjectId((current) => current && loaded.some((p) => p.id === current) ? current : loaded[0]?.id ?? '');
        setDocuments(allItems.filter((i) => i.record_type === 'document').map((i) => mapWorkItem<SourceDocument>(i)));
        setRequirements(allItems.filter((i) => i.record_type === 'requirement').map((i) => mapWorkItem<Requirement>(i)));
        setUserStories(allItems.filter((i) => i.record_type === 'user_story').map((i) => mapWorkItem<UserStory>(i)));
        setAcceptanceCriteria(allItems.filter((i) => i.record_type === 'acceptance_criteria').map((i) => mapWorkItem<AcceptanceCriteria>(i)));
        setTestCases(allItems.filter((i) => i.record_type === 'test_case').map((i) => mapWorkItem<TestCase>(i)));
        const apiSpecifications = allItems.filter((i) => i.record_type === 'api_specification');
        const architectures = allItems.filter((i) => i.record_type === 'architecture');
        setApiSpec(apiSpecifications[0]
          ? mapWorkItem<ApiSpecification>(apiSpecifications[0])
          : {} as ApiSpecification);
        setArchitecture(architectures[0]
          ? mapWorkItem<ArchitectureRecommendation>(architectures[0])
          : {} as ArchitectureRecommendation);
        setSprints(allItems.filter((i) => i.record_type === 'sprint').map((i) => mapWorkItem<Sprint>(i)));
        setPrompts(allItems.filter((i) => i.record_type === 'prompt').map((i) => mapWorkItem<PromptTemplate>(i)));
        setEvaluationRuns(allItems.filter((i) => i.record_type === 'evaluation').map((i) => mapWorkItem<EvaluationRun>(i)));
      } catch (error) {
        if (!cancelled) toast({ variant: 'error', title: 'Unable to load workspace', description: (error as Error).message });
      }
    }
    void loadWorkspace();
    return () => { cancelled = true; };
  }, [activeProjectId, isAuthenticated, isDemoMode, toast, user?.id]);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? EMPTY_PROJECT;

  const persistItem = useCallback((
    recordType: string,
    item: object & { id: string; projectId: string; title?: string; status?: string },
  ) => {
    const apiId = getApiId(item);
    const payload = { ...item } as Record<string, unknown>;
    delete payload.apiId;
    const request = apiId
      ? api.updateWorkItem(item.projectId, apiId, { title: item.title, status: item.status, payload })
      : api.createWorkItem(item.projectId, {
        record_type: recordType,
        title: item.title ?? recordType,
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
    setIsProcessing((prev) => ({ ...prev, generateStories: true }));
    await sleep(1500);
    const generated: UserStory[] = requirementIds.map((reqId) => {
      const parentReq = requirements.find((r) => r.id === reqId);
      const title = parentReq ? `Enable ${parentReq.title}` : `User Story for ${reqId}`;
      return {
        id: generateId('us'),
        projectId: activeProjectId,
        requirementId: reqId,
        title,
        userRole: 'Retail Banking Customer',
        action: 'authenticate using biometric hardware',
        benefit: 'I can quickly access my account without manually entering a password',
        personaDescription: 'Digital-first retail customer wanting fast secure login',
        storyPoints: 5,
        priority: 'must',
        status: 'draft' as ArtifactStatus,
        version: 1,
        history: [],
        promptId: 'pmt-001',
        promptVersion: 2,
        modelName: 'claude-3-5-sonnet-20241022 (Simulated)',
        isEdited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    setUserStories((prev) => [...generated, ...prev]);
    generated.forEach((item) => persistItem('user_story', item));
    setIsProcessing((prev) => ({ ...prev, generateStories: false }));
    toast({ variant: 'success', title: 'AI Generation Finished', description: `Generated ${generated.length} user stories.` });
    return generated;
  }, [activeProjectId, persistItem, requirements, toast]);

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
    await sleep(1400);
    const newItems: AcceptanceCriteria[] = userStoryIds.map((storyId) => ({
      id: generateId('ac'),
      projectId: activeProjectId,
      userStoryId: storyId,
      scenarioName: 'Biometric Authenticator Hardware Sensor Match',
      gherkin: `Feature: Biometric Match Verification\n  Scenario: Customer presents registered biometric\n    Given the customer has FaceID configured on an iOS device\n    When the customer initiates app login and scans their face\n    Then biometric verification succeeds in under 300ms\n    And a signed cryptographic assertion is transmitted to the API`,
      status: 'draft',
      version: 1,
      history: [],
      promptId: 'pmt-002',
      promptVersion: 1,
      modelName: 'claude-3-5-sonnet-20241022 (Simulated)',
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    setAcceptanceCriteria((prev) => [...newItems, ...prev]);
    newItems.forEach((item) => persistItem('acceptance_criteria', item));
    setIsProcessing((prev) => ({ ...prev, generateCriteria: false }));
    toast({ variant: 'success', title: 'Generated Gherkin Criteria', description: `Generated ${newItems.length} acceptance criteria.` });
    return newItems;
  }, [activeProjectId, persistItem, toast]);

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
    await sleep(1500);
    const newTests: TestCase[] = criteriaIds.map((cId) => ({
      id: generateId('tc'),
      projectId: activeProjectId,
      artifactVersionId: 'av-003',
      storyId: 'us-001',
      criteriaId: cId,
      acceptanceCriteriaId: cId,
      userStoryId: 'us-001',
      title: `Automated Sensor Test for ${cId}`,
      category: 'functional',
      priority: 'medium',
      testType: 'integration',
      preconditions: ['Mobile app installed on biometric test harness device', 'Valid test account enrolled'],
      steps: [
        { stepNumber: 1, action: 'Launch app and trigger biometric dialog', expectedResult: 'Sensor activates without prompt lag' },
        { stepNumber: 2, action: 'Inject positive biometric match payload', expectedResult: 'Token generated within 300ms' },
      ],
      expectedResult: 'HTTP 200 OK with bearer token and claims matching authenticated customer profile',
      status: 'draft',
      sourceRequirementIds: [],
      automationStatus: 'automated',
      version: 1,
      history: [],
      promptId: 'pmt-003',
      promptVersion: 1,
      modelName: 'claude-3-5-sonnet-20241022 (Simulated)',
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    setTestCases((prev) => [...newTests, ...prev]);
    newTests.forEach((item) => persistItem('test_case', item));
    setIsProcessing((prev) => ({ ...prev, generateTests: false }));
    toast({ variant: 'success', title: 'Test Cases Generated', description: `Created ${newTests.length} executable test cases.` });
    return newTests;
  }, [activeProjectId, persistItem, toast]);

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

  const generateArchitectureRecommendation = useCallback(async () => {
    setIsProcessing((prev) => ({ ...prev, generateArch: true }));
    await sleep(1800);
    setIsProcessing((prev) => ({ ...prev, generateArch: false }));
    toast({ variant: 'success', title: 'Architecture Synthesis Done', description: 'Architecture recommendations updated with risk matrix.' });
  }, [toast]);

  // Sprints
  const updateSprint = useCallback((id: string, updates: Partial<Sprint>) => {
    const item = sprints.find((sprint) => sprint.id === id);
    if (item) persistItem('sprint', { ...item, ...updates });
    setSprints((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    toast({ variant: 'info', title: 'Sprint updated' });
  }, [persistItem, sprints, toast]);

  const createSprint = useCallback((sprintData: Omit<Sprint, 'id' | 'createdAt'>) => {
    const newSprint: Sprint = {
      ...sprintData,
      id: generateId('sprint'),
      createdAt: new Date().toISOString(),
    };
    setSprints((prev) => [...prev, newSprint]);
    toast({ variant: 'success', title: 'Sprint created', description: newSprint.name });
    return newSprint;
  }, [toast]);

  const assignStoryToSprint = useCallback((storyId: string, sprintId: string | null) => {
    setSprints((prevSprints) => {
      return prevSprints.map((sprint) => {
        const currentStoryIds = sprint.userStoryIds ?? sprint.items?.map((item) => item.storyId) ?? [];
        const withoutStory = currentStoryIds.filter((id) => id !== storyId);
        const nextStoryIds = sprint.id === sprintId && userStories.some((story) => story.id === storyId)
          ? [...withoutStory, storyId]
          : withoutStory;
        const allocatedStoryPoints = nextStoryIds.reduce((total, id) => (
          total + (userStories.find((story) => story.id === id)?.storyPoints ?? 0)
        ), 0);
        return {
          ...sprint,
          userStoryIds: nextStoryIds,
          allocatedStoryPoints,
        };
      });
    });
    toast({ variant: 'info', title: 'Sprint story assignment updated' });
  }, [userStories, toast]);

  // Prompts
  const updatePrompt = useCallback((id: string, updates: Partial<PromptTemplate>) => {
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)));
    toast({ variant: 'info', title: 'Prompt template saved' });
  }, [toast]);

  const createPrompt = useCallback((promptData: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newP: PromptTemplate = {
      ...promptData,
      id: generateId('pmt'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPrompts((prev) => [...prev, newP]);
    toast({ variant: 'success', title: 'Prompt created', description: newP.name });
    return newP;
  }, [toast]);

  const testPrompt = useCallback(async (promptId: string, variables: Record<string, string>) => {
    void promptId;
    void variables;
    await sleep(1000);
    return JSON.stringify(
      {
        simulatedOutput: 'Generated artifact based on prompt variables',
        status: 'success',
        tokenUsage: { input: 450, output: 280 },
        latencyMs: 980,
      },
      null,
      2,
    );
  }, []);

  // Evaluations
  const runEvaluation = useCallback(async (name: string, dataset: string, projectId = activeProjectId) => {
    setIsProcessing((prev) => ({ ...prev, runEval: true }));
    await sleep(2000);
    const newRun: EvaluationRun = {
      id: generateId('eval'),
      projectId,
      name,
      description: `Automated test run against ${dataset}`,
      artifactType: 'user_stories',
      promptId: 'pmt-001',
      datasetName: dataset,
      modelName: 'claude-3-5-sonnet-20241022',
      metrics: {
        accuracy: 76.5,
        relevance: 82.0,
        completeness: 79.0,
        hallucinationRate: 4.2,
        overallScore: 78.4,
      },
      totalItems: 50,
      passedItems: 42,
      failedItems: 8,
      runDate: new Date().toISOString(),
      latencyMs: 1420,
    };
    setEvaluationRuns((prev) => [newRun, ...prev]);
    setIsProcessing((prev) => ({ ...prev, runEval: false }));
    toast({ variant: 'success', title: 'Evaluation Completed', description: `Overall score: ${newRun.metrics.overallScore}%` });
    return newRun;
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
        setActiveProjectId,
        createProject,
        updateProject,
        documents,
        uploadDocument,
        deleteDocument,
        requirements,
        updateRequirementStatus,
        updateRequirement,
        addRequirement,
        extractRequirementsFromDoc,
        userStories,
        updateUserStory,
        updateUserStoryStatus,
        generateUserStories,
        acceptanceCriteria,
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
        assignStoryToSprint,
        prompts,
        updatePrompt,
        createPrompt,
        testPrompt,
        evaluationRuns,
        runEvaluation,
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
