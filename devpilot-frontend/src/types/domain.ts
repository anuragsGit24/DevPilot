// ============================================================
// DevPilot Domain Types
// Central type definitions for all entities
// ============================================================

// ------ Enums / Union Types ------

export type UserRole = 'admin' | 'project_manager' | 'business_analyst' | 'developer' | 'tester';

export type ArtifactStatus = 'draft' | 'in_review' | 'accepted' | 'rejected';

export type ArtifactType =
  | 'user_stories'
  | 'acceptance_criteria'
  | 'test_cases'
  | 'api_specification'
  | 'architecture_recommendation'
  | 'sprint_plan'
  | 'case_study_report';

export type RequirementStatus = 'extracted' | 'in_review' | 'confirmed' | 'rejected';

export type RequirementPriority = 'must' | 'should' | 'could' | 'wont';

export type RequirementCategory =
  | 'functional'
  | 'non_functional'
  | 'security'
  | 'performance'
  | 'integration'
  | 'ui_ux'
  | 'data';

export type PromptVersionStatus = 'draft' | 'tested' | 'active' | 'retired';

export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';

export type TestCaseCategory = 'functional' | 'negative' | 'boundary' | 'edge' | 'security';

export type TestCasePriority = 'critical' | 'high' | 'medium' | 'low';

export type ExportFormat = 'markdown' | 'json' | 'csv' | 'gherkin' | 'openapi_yaml' | 'openapi_json' | 'pdf' | 'zip';

// ------ User ------

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
  failedLoginCount: number;
}

// ------ Project ------

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  requirementCount: number;
  artifactCount: number;
  pendingReviewCount: number;
  qualityScore: number; // 0-100
  tags: string[];
}

export interface ProjectMember {
  userId: string;
  projectId: string;
  role: UserRole;
  joinedAt: string;
}

// ------ Document ------

export interface SourceDocument {
  id: string;
  projectId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksum?: string;
  uploadedBy: string;
  uploadedAt: string;
  parseStatus?: 'pending' | 'processing' | 'complete' | 'failed' | 'extracted';
  status?: string;
  extractedCount?: number;
  extractedRequirementCount?: number;
  sectionCount?: number;
}

// ------ Requirement ------

export interface Requirement {
  id: string;
  projectId: string;
  documentId?: string;
  sourceDocumentId?: string;
  sourceText?: string;
  normalizedText?: string;
  title?: string;
  description?: string;
  category: RequirementCategory;
  priority: RequirementPriority;
  tags?: string[];
  status: RequirementStatus;
  sourceLocation?: string;
  sourceSection?: string;
  version?: number;
  confidenceScore?: number;
  duplicateWarnings?: string[];
  contradictionWarnings?: string[];
  contradictions?: Array<{ targetRequirementId: string; description: string; severity: string }>;
  createdAt: string;
  updatedAt: string;
  confirmedBy?: string;
}

// ------ User Story ------

export interface UserStory {
  id: string;
  projectId: string;
  artifactVersionId?: string;
  requirementId?: string;
  title: string;
  asA?: string;       // Role
  userRole?: string;
  iWant?: string;     // Feature
  action?: string;
  soThat?: string;    // Benefit
  benefit?: string;
  personaDescription?: string;
  priority: RequirementPriority;
  category?: string;
  storyPoints?: number;
  estimatedHours?: number;
  sourceRequirementIds?: string[];
  dependencyIds?: string[];
  status: ArtifactStatus;
  assumptions?: string[];
  duplicateWarning?: boolean;
  contradictionWarning?: boolean;
  version?: number;
  history?: Array<{ version: number; changeSummary: string; authorId: string; timestamp: string }>;
  promptId?: string;
  promptVersion?: number;
  modelName?: string;
  isEdited?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ------ Acceptance Criteria ------

export type CriteriaFormat = 'gherkin' | 'checklist';

export interface GherkinScenario {
  title: string;
  given: string[];
  when: string[];
  then: string[];
  type: 'positive' | 'negative' | 'edge' | 'boundary';
}

export interface ChecklistItem {
  id: string;
  text: string;
  type: 'positive' | 'negative' | 'edge' | 'boundary';
}

export interface AcceptanceCriteria {
  id: string;
  projectId: string;
  artifactVersionId?: string;
  storyId?: string;
  userStoryId?: string;
  title?: string;
  scenarioName?: string;
  format?: CriteriaFormat;
  gherkin?: string;
  scenarios?: GherkinScenario[];
  checklist?: ChecklistItem[];
  status: ArtifactStatus;
  sourceRequirementIds?: string[];
  version?: number;
  history?: Array<{ version: number; changeSummary: string; authorId: string; timestamp: string }>;
  promptId?: string;
  promptVersion?: number;
  modelName?: string;
  isEdited?: boolean;
  coverageIndicators?: {
    positive?: boolean;
    negative?: boolean;
    edge?: boolean;
    boundary?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// ------ Test Case ------

export interface TestStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export interface TestCase {
  id: string;
  projectId: string;
  artifactVersionId: string;
  storyId: string;
  criteriaId?: string;
  title: string;
  category: TestCaseCategory;
  priority: TestCasePriority;
  preconditions: string[];
  steps: TestStep[];
  expectedResult: string;
  testData?: string;
  status: ArtifactStatus;
  sourceRequirementIds: string[];
  createdAt: string;
  updatedAt: string;
  /** Optional display fields used by generated/legacy test case records. */
  testType?: string;
  automationStatus?: 'automated' | 'manual';
  acceptanceCriteriaId?: string;
  userStoryId?: string;
  version?: number;
  history?: unknown[];
  promptId?: string;
  promptVersion?: number;
  modelName?: string;
  isEdited?: boolean;
}

// ------ API Specification ------

export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  summary: string;
  description: string;
  tags: string[];
  authentication: boolean;
  requestBody?: object;
  responses: Record<string, { description: string; schema?: object }>;
  parameters?: object[];
}

export interface ApiSpecification {
  id: string;
  projectId: string;
  artifactVersionId: string;
  title: string;
  version: string;
  openApiVersion?: string;
  description: string;
  endpoints: ApiEndpoint[];
  rawYaml: string;
  validationStatus: 'valid' | 'invalid' | 'pending';
  validationFindings: string[];
  status: ArtifactStatus;
  sourceRequirementIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ------ Architecture Recommendation ------

export interface ArchitectureRecommendation {
  id: string;
  projectId: string;
  artifactVersionId: string;
  title: string;
  summary: string;
  pattern: string;
  components: { name: string; role: string; technology: string }[];
  decisions?: { id: string; title: string; context: string; decision: string; consequences: string }[];
  securityConsiderations: string[];
  deploymentTopology: string;
  alternatives: { name: string; rationale: string; tradeoffs: string }[];
  assumptions: string[];
  risks: string[];
  mermaidDiagram?: string;
  status: ArtifactStatus;
  sourceRequirementIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ------ Sprint Planning ------

export interface SprintItem {
  id: string;
  sprintId: string;
  storyId: string;
  storyTitle: string;
  storyPoints: number;
  estimatedHours: number;
  priority: RequirementPriority;
  assignee?: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'done';
  isCriticalPath: boolean;
  dependencyIds: string[];
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  totalPoints?: number;
  completedPoints?: number;
  allocatedStoryPoints?: number;
  teamCapacity?: number;
  capacityStoryPoints?: number;
  teamVelocity?: number;
  targetVelocity?: number;
  items?: SprintItem[];
  userStoryIds?: string[];
  warnings?: string[];
  createdAt?: string;
}

// ------ Prompt Library ------

export interface PromptVariable {
  name: string;
  type: 'string' | 'array' | 'object';
  description: string;
  required: boolean;
  example: string;
}

export interface PromptVersion {
  id?: string;
  templateId?: string;
  versionNumber: number;
  status: PromptVersionStatus;
  content?: string;
  templateText?: string;
  variables?: PromptVariable[] | string[];
  outputSchema?: object;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  activatedAt?: string;
  retiredAt?: string;
  testResults?: PromptTestResult[];
  performanceMetrics?: PromptPerformanceMetrics;
  benchmarkScore?: number;
}

export interface PromptTestResult {
  id: string;
  versionId: string;
  sampleInput: object;
  output: string;
  schemaValid: boolean;
  latencyMs: number;
  tokenUsage: number;
  reviewerFeedback?: string;
  runAt: string;
}

export interface PromptPerformanceMetrics {
  sampleCount: number;
  avgAccuracy: number;
  avgCompleteness: number;
  avgRelevance: number;
  avgLatencyMs: number;
  dateRange: { from: string; to: string };
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  artifactType?: ArtifactType;
  targetArtifact?: string;
  tags?: string[];
  owner?: string;
  activeVersion?: number;
  currentVersion?: PromptVersion;
  variables?: string[] | PromptVariable[];
  versions: PromptVersion[];
  createdAt: string;
  updatedAt: string;
}

// ------ Evaluation ------

export interface EvaluationMetrics {
  accuracy: number;       // 0-100
  completeness: number;   // 0-100
  relevance: number;      // 0-100
  formatCompliance?: number; // 0-100
  consistency?: number;    // 0-100
  hallucinationRisk?: number; // 0-100 (lower is better)
  hallucinationRate?: number;
  overallScore?: number;
}

export interface EvaluationRun {
  id: string;
  projectId: string;
  name?: string;
  description?: string;
  artifactType: ArtifactType;
  artifactVersionId?: string;
  baselineArtifactId?: string;
  promptVersionId?: string;
  promptId?: string;
  datasetName?: string;
  modelName?: string;
  metrics: EvaluationMetrics;
  overallScore?: number;
  sampleCount?: number;
  totalItems?: number;
  passedItems?: number;
  failedItems?: number;
  latencyMs?: number;
  runDate?: string;
  reviewerId?: string;
  reviewerFeedback?: string;
  humanAdjustedScore?: number;
  status?: 'pending' | 'running' | 'complete' | 'failed';
  notes?: string;
  createdAt?: string;
  completedAt?: string;
}

// ------ Case Study ------

export interface CaseStudyComparison {
  id: string;
  projectId: string;
  title: string;
  openSourceProject: string;
  projectUrl: string;
  license: string;
  scope: string;
  baselineArtifacts: {
    type: ArtifactType;
    humanCount: number;
    generatedCount: number;
    matchRate: number;
  }[];
  effortComparison: {
    manualHours: number;
    assistedHours: number;
    reduction: number;
  };
  evaluationResults: EvaluationRun[];
  findings: string[];
  limitations: string[];
  lessonsLearned: string[];
  status: 'draft' | 'in_progress' | 'complete';
  createdAt: string;
}

// ------ Activity / Audit ------

export interface ActivityEntry {
  id: string;
  projectId?: string;
  userId: string;
  userName: string;
  userRole?: UserRole;
  action: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  entityType?: 'project' | 'requirement' | 'user_story' | 'acceptance_criteria' | 'test_case' | 'api_spec' | 'architecture' | 'sprint' | 'prompt' | 'evaluation' | 'document';
  entityId?: string;
  entityTitle?: string;
  details?: string;
  requestId?: string;
  timestamp: string;
  ipAddress?: string;
}

// ------ Artifact Generic ------

export interface ArtifactVersion {
  id: string;
  artifactId: string;
  projectId: string;
  type: ArtifactType;
  versionNumber: number;
  title: string;
  status: ArtifactStatus;
  isAiGenerated: boolean;
  promptVersionId?: string;
  generationRunId?: string;
  sourceRequirementIds: string[];
  creatorId: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

// ------ Generation Run ------

export interface GenerationRun {
  id: string;
  projectId: string;
  artifactType: ArtifactType;
  sourceRequirementIds: string[];
  promptVersionId: string;
  provider: string;
  model: string;
  status: 'queued' | 'running' | 'complete' | 'failed';
  latencyMs?: number;
  tokenUsage?: number;
  validationStatus?: 'valid' | 'invalid' | 'warnings';
  validationFindings?: string[];
  createdAt: string;
  completedAt?: string;
}

// ------ Assistant ------

export interface AssistantMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sourceArtifacts?: { type: string; id: string; title: string }[];
  isMock: boolean;
  timestamp: string;
}

/** ChatMessage is the runtime format used by the chat UI (sender + text) */
export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sourceArtifacts?: { type: string; id: string; title: string }[];
  isMock?: boolean;
  timestamp: string;
}

export interface AssistantConversation {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// ------ Dashboard ------

export interface DashboardSummary {
  projectId: string;
  health: 'good' | 'at_risk' | 'critical';
  requirementCount: number;
  confirmedRequirements: number;
  artifactCounts: Record<ArtifactType, number>;
  pendingReviewCount: number;
  qualityScore: number;
  activeSprintProgress: number;
  recentActivity: ActivityEntry[];
  evaluationTrend: { date: string; score: number }[];
  promptPerformance: { name: string; score: number; runs: number }[];
  warnings: string[];
}

// ------ Pagination ------

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ------ Filter / Sort ------

export interface FilterState {
  search: string;
  status?: string;
  category?: string;
  priority?: string;
  tags?: string[];
}

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}
