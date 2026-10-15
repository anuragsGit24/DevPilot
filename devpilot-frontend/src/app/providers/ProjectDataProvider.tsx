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
  MOCK_PROJECTS,
  MOCK_DOCUMENTS,
  MOCK_REQUIREMENTS,
  MOCK_USER_STORIES,
  MOCK_ACCEPTANCE_CRITERIA,
  MOCK_TEST_CASES,
  MOCK_API_SPEC,
  MOCK_ARCHITECTURE,
  MOCK_SPRINTS,
  MOCK_PROMPTS,
  MOCK_EVALUATION_RUNS,
  MOCK_CASE_STUDY,
  MOCK_ACTIVITIES,
  MOCK_ASSISTANT_CONVERSATION,
  MOCK_DASHBOARD,
} from '@/mocks/seed-data/project-retail-banking';
import { sleep, generateId } from '@/lib/utils';
import { useToast } from './ToastProvider';

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
  caseStudy: CaseStudyComparison;
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

const STORAGE_KEY_PREFIX = 'devpilot_data_v3_';

function loadOrSeed<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, val: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(val));
  } catch {
    // localStorage full or disabled
  }
}

export function ProjectDataProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>(() => loadOrSeed('projects', MOCK_PROJECTS));
  const [activeProjectId, setActiveProjectId] = useState<string>('proj-001');
  const [documents, setDocuments] = useState<SourceDocument[]>(() => loadOrSeed('documents', MOCK_DOCUMENTS));
  const [requirements, setRequirements] = useState<Requirement[]>(() => loadOrSeed('requirements', MOCK_REQUIREMENTS));
  const [userStories, setUserStories] = useState<UserStory[]>(() => loadOrSeed('userStories', MOCK_USER_STORIES));
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<AcceptanceCriteria[]>(() => loadOrSeed('acceptanceCriteria', MOCK_ACCEPTANCE_CRITERIA));
  const [testCases, setTestCases] = useState<TestCase[]>(() => loadOrSeed('testCases', MOCK_TEST_CASES));
  const [apiSpec, setApiSpec] = useState<ApiSpecification>(() => loadOrSeed('apiSpec', MOCK_API_SPEC));
  const [architecture, setArchitecture] = useState<ArchitectureRecommendation>(() => loadOrSeed('architecture', MOCK_ARCHITECTURE));
  const [sprints, setSprints] = useState<Sprint[]>(() => loadOrSeed('sprints', MOCK_SPRINTS).map((sprint) => {
    const userStoryIds = sprint.userStoryIds ?? sprint.items?.map((item) => item.storyId) ?? [];
    const allocatedStoryPoints = userStoryIds.reduce((total, storyId) => (
      total + (MOCK_USER_STORIES.find((story) => story.id === storyId)?.storyPoints ?? 0)
    ), 0);
    return { ...sprint, userStoryIds, allocatedStoryPoints };
  }));
  const [prompts, setPrompts] = useState<PromptTemplate[]>(() => loadOrSeed('prompts', MOCK_PROMPTS));
  const [evaluationRuns, setEvaluationRuns] = useState<EvaluationRun[]>(() => loadOrSeed('evaluations', MOCK_EVALUATION_RUNS));
  const [caseStudy] = useState<CaseStudyComparison>(MOCK_CASE_STUDY);
  const [dashboard, setDashboard] = useState<DashboardSummary>(() => loadOrSeed('dashboard', MOCK_DASHBOARD));
  const [activities, setActivities] = useState<ActivityEntry[]>(() => loadOrSeed('activities', MOCK_ACTIVITIES));
  const [assistantConversation, setAssistantConversation] = useState<AssistantConversation>(() => loadOrSeed('assistant', MOCK_ASSISTANT_CONVERSATION));
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});

  // Sync state to localStorage
  useEffect(() => { save('projects', projects); }, [projects]);
  useEffect(() => { save('documents', documents); }, [documents]);
  useEffect(() => { save('requirements', requirements); }, [requirements]);
  useEffect(() => { save('userStories', userStories); }, [userStories]);
  useEffect(() => { save('acceptanceCriteria', acceptanceCriteria); }, [acceptanceCriteria]);
  useEffect(() => { save('testCases', testCases); }, [testCases]);
  useEffect(() => { save('apiSpec', apiSpec); }, [apiSpec]);
  useEffect(() => { save('architecture', architecture); }, [architecture]);
  useEffect(() => { save('sprints', sprints); }, [sprints]);
  useEffect(() => { save('prompts', prompts); }, [prompts]);
  useEffect(() => { save('evaluations', evaluationRuns); }, [evaluationRuns]);
  useEffect(() => { save('dashboard', dashboard); }, [dashboard]);
  useEffect(() => { save('activities', activities); }, [activities]);
  useEffect(() => { save('assistant', assistantConversation); }, [assistantConversation]);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];

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
    const newProj: Project = {
      ...data,
      id: generateId('proj'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memberCount: 1,
      requirementCount: 0,
      artifactCount: 0,
      pendingReviewCount: 0,
      qualityScore: 0,
    };
    setProjects((prev) => [newProj, ...prev]);
    logActivity('Created new project', 'project', newProj.id, newProj.name);
    toast({ variant: 'success', title: 'Project created', description: `${newProj.name} is ready.` });
    return newProj;
  }, [logActivity, toast]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)));
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
    setRequirements((prev) => prev.map((r) => (r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r)));
    logActivity(`Changed status to ${status}`, 'requirement', id, id);
    toast({ variant: 'success', title: 'Status updated', description: `Requirement ${id} marked as ${status}.` });
  }, [logActivity, toast]);

  const updateRequirement = useCallback((id: string, updates: Partial<Requirement>) => {
    setRequirements((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r)));
    toast({ variant: 'info', title: 'Requirement saved' });
  }, [toast]);

  const addRequirement = useCallback((req: Omit<Requirement, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newReq: Requirement = {
      ...req,
      id: generateId('req'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRequirements((prev) => [newReq, ...prev]);
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
    setUserStories((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s)));
    toast({ variant: 'info', title: 'User story updated' });
  }, [toast]);

  const updateUserStoryStatus = useCallback((id: string, status: ArtifactStatus) => {
    setUserStories((prev) => prev.map((s) => (s.id === id ? { ...s, status, updatedAt: new Date().toISOString() } : s)));
    logActivity(`User story marked ${status}`, 'user_story', id, id);
    toast({ variant: 'success', title: 'Story status changed', description: `${id} is now ${status}.` });
  }, [logActivity, toast]);

  const generateUserStories = useCallback(async (requirementIds: string[]) => {
    setIsProcessing((prev) => ({ ...prev, generateStories: true }));
    await sleep(1500);
    const generated: UserStory[] = requirementIds.map((reqId, idx) => {
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
    setIsProcessing((prev) => ({ ...prev, generateStories: false }));
    toast({ variant: 'success', title: 'AI Generation Finished', description: `Generated ${generated.length} user stories.` });
    return generated;
  }, [activeProjectId, requirements, toast]);

  // Acceptance Criteria
  const updateAcceptanceCriteria = useCallback((id: string, updates: Partial<AcceptanceCriteria>) => {
    setAcceptanceCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)));
    toast({ variant: 'info', title: 'Acceptance criteria updated' });
  }, [toast]);

  const updateAcceptanceCriteriaStatus = useCallback((id: string, status: ArtifactStatus) => {
    setAcceptanceCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c)));
    toast({ variant: 'success', title: 'Criteria status updated', description: `${id} set to ${status}.` });
  }, [toast]);

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
    setIsProcessing((prev) => ({ ...prev, generateCriteria: false }));
    toast({ variant: 'success', title: 'Generated Gherkin Criteria', description: `Generated ${newItems.length} acceptance criteria.` });
    return newItems;
  }, [activeProjectId, toast]);

  // Test Cases
  const updateTestCase = useCallback((id: string, updates: Partial<TestCase>) => {
    setTestCases((prev) => prev.map((tc) => (tc.id === id ? { ...tc, ...updates, updatedAt: new Date().toISOString() } : tc)));
    toast({ variant: 'info', title: 'Test case updated' });
  }, [toast]);

  const updateTestCaseStatus = useCallback((id: string, status: ArtifactStatus) => {
    setTestCases((prev) => prev.map((tc) => (tc.id === id ? { ...tc, status, updatedAt: new Date().toISOString() } : tc)));
    toast({ variant: 'success', title: 'Test case status updated' });
  }, [toast]);

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
    setIsProcessing((prev) => ({ ...prev, generateTests: false }));
    toast({ variant: 'success', title: 'Test Cases Generated', description: `Created ${newTests.length} executable test cases.` });
    return newTests;
  }, [activeProjectId, toast]);

  // API Spec
  const updateApiSpec = useCallback((spec: ApiSpecification) => {
    setApiSpec(spec);
    toast({ variant: 'info', title: 'API Specification saved' });
  }, [toast]);

  const generateApiEndpoints = useCallback(async (_storyIds: string[]) => {
    setIsProcessing((prev) => ({ ...prev, generateApi: true }));
    await sleep(1600);
    setIsProcessing((prev) => ({ ...prev, generateApi: false }));
    toast({ variant: 'success', title: 'OpenAPI Spec Synchronized', description: 'Updated endpoints to match latest user stories.' });
  }, [toast]);

  // Architecture
  const updateArchitecture = useCallback((arch: ArchitectureRecommendation) => {
    setArchitecture(arch);
    toast({ variant: 'info', title: 'Architecture updated' });
  }, [toast]);

  const generateArchitectureRecommendation = useCallback(async () => {
    setIsProcessing((prev) => ({ ...prev, generateArch: true }));
    await sleep(1800);
    setIsProcessing((prev) => ({ ...prev, generateArch: false }));
    toast({ variant: 'success', title: 'Architecture Synthesis Done', description: 'Architecture recommendations updated with risk matrix.' });
  }, [toast]);

  // Sprints
  const updateSprint = useCallback((id: string, updates: Partial<Sprint>) => {
    setSprints((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    toast({ variant: 'info', title: 'Sprint updated' });
  }, [toast]);

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

  const testPrompt = useCallback(async (_promptId: string, _variables: Record<string, string>) => {
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
      messages: [...prev.messages, userMsg],
      updatedAt: new Date().toISOString(),
    }));

    setIsProcessing((prev) => ({ ...prev, assistantTyping: true }));
    await sleep(1200);

    const botMsg: ChatMessage = {
      id: generateId('msg'),
      sender: 'assistant',
      text: `Based on your query: "${text}", I cross-referenced the RetailBanking v2.0 requirements and artifacts.\n\nKey observations:\n- REQ-001 (Biometric Auth) is confirmed and mapped to US-001.\n- 2 acceptance criteria in Gherkin syntax are ready for review.\n- Sprint 2 currently holds 47 story points against a 34-point velocity ceiling. Would you like me to suggest stories to defer to Sprint 3?`,
      sourceArtifacts: [
        { type: 'requirement', id: 'req-001', title: 'Biometric Authentication' },
        { type: 'user_story', id: 'us-001', title: 'Biometric Login' },
      ],
      isMock: true,
      timestamp: new Date().toISOString(),
    };

    setAssistantConversation((prev) => ({
      ...prev,
      messages: [...prev.messages, botMsg],
      updatedAt: new Date().toISOString(),
    }));
    setIsProcessing((prev) => ({ ...prev, assistantTyping: false }));
  }, []);

  const resetAllData = useCallback(() => {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(STORAGE_KEY_PREFIX)) localStorage.removeItem(k);
    });
    setProjects(MOCK_PROJECTS);
    setDocuments(MOCK_DOCUMENTS);
    setRequirements(MOCK_REQUIREMENTS);
    setUserStories(MOCK_USER_STORIES);
    setAcceptanceCriteria(MOCK_ACCEPTANCE_CRITERIA);
    setTestCases(MOCK_TEST_CASES);
    setApiSpec(MOCK_API_SPEC);
    setArchitecture(MOCK_ARCHITECTURE);
    setSprints(MOCK_SPRINTS);
    setPrompts(MOCK_PROMPTS);
    setEvaluationRuns(MOCK_EVALUATION_RUNS);
    setDashboard(MOCK_DASHBOARD);
    setActivities(MOCK_ACTIVITIES);
    setAssistantConversation(MOCK_ASSISTANT_CONVERSATION);
    toast({ variant: 'info', title: 'Data reset', description: 'Restored original synthetic benchmark dataset.' });
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
