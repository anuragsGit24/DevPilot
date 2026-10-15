// ============================================================
// Mock Seed Data — DevPilot
// Synthetic project: "RetailBanking Mobile App v2.0"
// All IDs are stable and cross-referenced throughout the app.
// ============================================================

import type {
  User,
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
  GenerationRun,
} from '@/types/domain';

// ------ Demo Users ------

export const DEMO_USERS: User[] = [
  {
    id: 'usr-001',
    email: 'admin@devpilot.demo',
    name: 'Priya Sharma',
    role: 'admin',
    active: true,
    createdAt: '2026-01-10T09:00:00Z',
    lastLogin: '2026-10-15T08:00:00Z',
    failedLoginCount: 0,
  },
  {
    id: 'usr-002',
    email: 'pm@devpilot.demo',
    name: 'James Whitfield',
    role: 'project_manager',
    active: true,
    createdAt: '2026-01-12T10:00:00Z',
    lastLogin: '2026-10-15T07:30:00Z',
    failedLoginCount: 0,
  },
  {
    id: 'usr-003',
    email: 'ba@devpilot.demo',
    name: 'Anika Patel',
    role: 'business_analyst',
    active: true,
    createdAt: '2026-01-15T11:00:00Z',
    lastLogin: '2026-10-14T16:00:00Z',
    failedLoginCount: 0,
  },
  {
    id: 'usr-004',
    email: 'dev@devpilot.demo',
    name: 'Marcus Chen',
    role: 'developer',
    active: true,
    createdAt: '2026-02-01T09:00:00Z',
    lastLogin: '2026-10-15T09:15:00Z',
    failedLoginCount: 0,
  },
  {
    id: 'usr-005',
    email: 'tester@devpilot.demo',
    name: 'Sarah O\'Brien',
    role: 'tester',
    active: true,
    createdAt: '2026-02-05T09:00:00Z',
    lastLogin: '2026-10-14T14:00:00Z',
    failedLoginCount: 1,
  },
  {
    id: 'usr-006',
    email: 'locked@devpilot.demo',
    name: 'Tom Harrison',
    role: 'developer',
    active: false,
    createdAt: '2026-03-01T09:00:00Z',
    lastLogin: '2026-09-01T08:00:00Z',
    failedLoginCount: 5,
  },
];

// ------ Projects ------

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-001',
    name: 'RetailBanking Mobile App v2.0',
    description: 'Complete redesign and feature expansion of the Barclays retail banking mobile application, targeting iOS and Android with improved accessibility, biometric authentication, and real-time notifications.',
    status: 'active',
    createdBy: 'usr-002',
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-10-15T08:00:00Z',
    memberCount: 5,
    requirementCount: 12,
    artifactCount: 47,
    pendingReviewCount: 8,
    qualityScore: 74,
    tags: ['mobile', 'banking', 'retail', 'accessibility'],
  },
  {
    id: 'proj-002',
    name: 'Fraud Detection API Modernisation',
    description: 'Modernise legacy fraud detection services to RESTful microservices architecture with ML-based scoring and real-time alert delivery.',
    status: 'active',
    createdBy: 'usr-001',
    createdAt: '2026-05-15T09:00:00Z',
    updatedAt: '2026-10-10T14:00:00Z',
    memberCount: 3,
    requirementCount: 8,
    artifactCount: 22,
    pendingReviewCount: 4,
    qualityScore: 68,
    tags: ['fraud', 'api', 'ml', 'microservices'],
  },
  {
    id: 'proj-003',
    name: 'Customer Onboarding Portal',
    description: 'Digital-first KYC and account opening flow for business banking customers, integrating with regulatory systems.',
    status: 'on_hold',
    createdBy: 'usr-002',
    createdAt: '2026-07-01T09:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    memberCount: 2,
    requirementCount: 15,
    artifactCount: 12,
    pendingReviewCount: 2,
    qualityScore: 55,
    tags: ['kyc', 'onboarding', 'business-banking'],
  },
];

// ------ Source Documents ------

export const MOCK_DOCUMENTS: SourceDocument[] = [
  {
    id: 'doc-001',
    projectId: 'proj-001',
    filename: 'RetailBanking_BRD_v2.3.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2_457_600,
    checksum: 'sha256:a3f8c2d1e4b7f0a9c2d5e8f1b4a7d0e3',
    uploadedBy: 'usr-003',
    uploadedAt: '2026-03-05T10:30:00Z',
    parseStatus: 'complete',
    extractedCount: 10,
  },
  {
    id: 'doc-002',
    projectId: 'proj-001',
    filename: 'AccessibilityRequirements_WCAG21.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 512_000,
    checksum: 'sha256:b4a2c1f8e3d7a6b5f2e1c4d8f0b3a9e7',
    uploadedBy: 'usr-003',
    uploadedAt: '2026-03-06T09:00:00Z',
    parseStatus: 'complete',
    extractedCount: 2,
  },
];

// ------ Requirements ------

export const MOCK_REQUIREMENTS: Requirement[] = [
  {
    id: 'req-001',
    projectId: 'proj-001',
    documentId: 'doc-001',
    sourceText: 'The mobile application shall support biometric authentication (Face ID and fingerprint) as a secure login mechanism, complementing password-based authentication.',
    normalizedText: 'Support biometric authentication (Face ID / fingerprint) as a secondary login mechanism alongside password authentication.',
    category: 'security',
    priority: 'must',
    tags: ['authentication', 'biometric', 'security'],
    status: 'confirmed',
    sourceLocation: 'Section 3.2, Page 12',
    version: 1,
    duplicateWarnings: [],
    contradictionWarnings: [],
    createdAt: '2026-03-05T11:00:00Z',
    updatedAt: '2026-03-10T09:00:00Z',
    confirmedBy: 'usr-003',
  },
  {
    id: 'req-002',
    projectId: 'proj-001',
    documentId: 'doc-001',
    sourceText: 'Users must be able to view real-time balance and transaction history for all their linked accounts within 2 seconds of login.',
    normalizedText: 'Display real-time account balance and transaction history for all linked accounts; response time ≤ 2 seconds.',
    category: 'functional',
    priority: 'must',
    tags: ['accounts', 'balance', 'transactions', 'performance'],
    status: 'confirmed',
    sourceLocation: 'Section 4.1, Page 18',
    version: 1,
    duplicateWarnings: [],
    contradictionWarnings: [],
    createdAt: '2026-03-05T11:05:00Z',
    updatedAt: '2026-03-10T09:00:00Z',
    confirmedBy: 'usr-003',
  },
  {
    id: 'req-003',
    projectId: 'proj-001',
    documentId: 'doc-001',
    sourceText: 'The system shall allow customers to initiate domestic and international transfers with configurable daily limits set by the bank administrator.',
    normalizedText: 'Enable domestic and international money transfers with admin-configurable daily transaction limits.',
    category: 'functional',
    priority: 'must',
    tags: ['transfers', 'payments', 'limits'],
    status: 'confirmed',
    sourceLocation: 'Section 4.3, Page 22',
    version: 1,
    duplicateWarnings: [],
    contradictionWarnings: [],
    createdAt: '2026-03-05T11:10:00Z',
    updatedAt: '2026-03-10T09:00:00Z',
    confirmedBy: 'usr-003',
  },
  {
    id: 'req-004',
    projectId: 'proj-001',
    documentId: 'doc-001',
    sourceText: 'Push notifications must be delivered for all account activity including transactions, security alerts, and promotional offers, with user-configurable preferences.',
    normalizedText: 'Deliver push notifications for transactions, security alerts, and offers; user-configurable notification preferences required.',
    category: 'functional',
    priority: 'should',
    tags: ['notifications', 'push', 'alerts'],
    status: 'confirmed',
    sourceLocation: 'Section 5.1, Page 28',
    version: 1,
    duplicateWarnings: [],
    contradictionWarnings: [],
    createdAt: '2026-03-05T11:15:00Z',
    updatedAt: '2026-03-10T09:00:00Z',
    confirmedBy: 'usr-003',
  },
  {
    id: 'req-005',
    projectId: 'proj-001',
    documentId: 'doc-002',
    sourceText: 'The application must comply with WCAG 2.1 Level AA accessibility standards across all screens and interactive elements.',
    normalizedText: 'Comply with WCAG 2.1 AA accessibility standards on all screens.',
    category: 'non_functional',
    priority: 'must',
    tags: ['accessibility', 'wcag', 'compliance'],
    status: 'confirmed',
    sourceLocation: 'Section 2, Page 4',
    version: 1,
    duplicateWarnings: [],
    contradictionWarnings: [],
    createdAt: '2026-03-06T09:30:00Z',
    updatedAt: '2026-03-10T09:00:00Z',
    confirmedBy: 'usr-003',
  },
  {
    id: 'req-006',
    projectId: 'proj-001',
    documentId: 'doc-001',
    sourceText: 'The system shall provide a card management interface allowing users to freeze/unfreeze, set spending limits, report lost cards, and request replacements.',
    normalizedText: 'Card management: freeze/unfreeze, spending limits, lost-card reporting, and replacement requests.',
    category: 'functional',
    priority: 'must',
    tags: ['cards', 'management', 'freeze'],
    status: 'confirmed',
    sourceLocation: 'Section 4.5, Page 26',
    version: 1,
    duplicateWarnings: [],
    contradictionWarnings: [],
    createdAt: '2026-03-05T11:20:00Z',
    updatedAt: '2026-03-10T09:00:00Z',
    confirmedBy: 'usr-003',
  },
  {
    id: 'req-007',
    projectId: 'proj-001',
    documentId: 'doc-001',
    sourceText: 'A chatbot assistant integrated into the app should handle common banking queries, FAQs, and escalate complex issues to human agents.',
    normalizedText: 'In-app chatbot for common banking queries with escalation to human agents.',
    category: 'functional',
    priority: 'should',
    tags: ['chatbot', 'support', 'ai'],
    status: 'in_review',
    sourceLocation: 'Section 6.1, Page 35',
    version: 1,
    duplicateWarnings: [],
    contradictionWarnings: ['req-014'],
    createdAt: '2026-03-05T11:25:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  },
  {
    id: 'req-008',
    projectId: 'proj-001',
    documentId: 'doc-001',
    sourceText: 'The application shall encrypt all data in transit using TLS 1.3 and at rest using AES-256 encryption.',
    normalizedText: 'All data in transit encrypted with TLS 1.3; data at rest encrypted with AES-256.',
    category: 'security',
    priority: 'must',
    tags: ['encryption', 'security', 'tls', 'aes'],
    status: 'confirmed',
    sourceLocation: 'Section 7.2, Page 41',
    version: 1,
    duplicateWarnings: [],
    contradictionWarnings: [],
    createdAt: '2026-03-05T11:30:00Z',
    updatedAt: '2026-03-10T09:00:00Z',
    confirmedBy: 'usr-003',
  },
  {
    id: 'req-009',
    projectId: 'proj-001',
    documentId: 'doc-001',
    sourceText: 'The mobile app must support multi-currency accounts and provide real-time foreign exchange rates sourced from an approved provider.',
    normalizedText: 'Multi-currency account support with real-time FX rates from approved provider.',
    category: 'functional',
    priority: 'should',
    tags: ['currency', 'fx', 'international'],
    status: 'confirmed',
    sourceLocation: 'Section 4.7, Page 29',
    version: 1,
    duplicateWarnings: [],
    contradictionWarnings: [],
    createdAt: '2026-03-05T11:35:00Z',
    updatedAt: '2026-03-10T09:00:00Z',
    confirmedBy: 'usr-003',
  },
  {
    id: 'req-010',
    projectId: 'proj-001',
    documentId: 'doc-001',
    sourceText: 'Session timeout must be implemented after 5 minutes of inactivity, requiring re-authentication.',
    normalizedText: 'Session timeout after 5 minutes of inactivity, requiring re-authentication.',
    category: 'security',
    priority: 'must',
    tags: ['session', 'timeout', 'security'],
    status: 'confirmed',
    sourceLocation: 'Section 7.4, Page 43',
    version: 1,
    duplicateWarnings: [],
    contradictionWarnings: [],
    createdAt: '2026-03-05T11:40:00Z',
    updatedAt: '2026-03-10T09:00:00Z',
    confirmedBy: 'usr-003',
  },
  {
    id: 'req-011',
    projectId: 'proj-001',
    sourceText: 'Users should be able to set up scheduled payments and standing orders with configurable frequency and amount.',
    normalizedText: 'Scheduled payments and standing orders with configurable frequency and amount.',
    category: 'functional',
    priority: 'should',
    tags: ['payments', 'scheduled', 'standing-orders'],
    status: 'in_review',
    version: 1,
    duplicateWarnings: [],
    contradictionWarnings: [],
    createdAt: '2026-04-10T14:00:00Z',
    updatedAt: '2026-10-05T10:00:00Z',
  },
  {
    id: 'req-012',
    projectId: 'proj-001',
    documentId: 'doc-001',
    sourceText: 'The application performance shall not degrade by more than 10% under 10,000 concurrent users.',
    normalizedText: 'Application performance degradation ≤ 10% under 10,000 concurrent users.',
    category: 'performance',
    priority: 'must',
    tags: ['performance', 'load', 'scalability'],
    status: 'confirmed',
    sourceLocation: 'Section 8.1, Page 47',
    version: 1,
    duplicateWarnings: [],
    contradictionWarnings: [],
    createdAt: '2026-03-05T11:45:00Z',
    updatedAt: '2026-03-10T09:00:00Z',
    confirmedBy: 'usr-003',
  },
];

// ------ User Stories ------

export const MOCK_USER_STORIES: UserStory[] = [
  {
    id: 'us-001',
    projectId: 'proj-001',
    artifactVersionId: 'av-001',
    title: 'Biometric Login',
    asA: 'registered mobile banking customer',
    iWant: 'to log in using Face ID or fingerprint recognition',
    soThat: 'I can access my account quickly and securely without typing a password',
    priority: 'must',
    category: 'authentication',
    storyPoints: 8,
    estimatedHours: 24,
    sourceRequirementIds: ['req-001'],
    dependencyIds: [],
    status: 'accepted',
    assumptions: ['Device biometric capability is available', 'Customer has previously set up biometrics'],
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-20T09:00:00Z',
  },
  {
    id: 'us-002',
    projectId: 'proj-001',
    artifactVersionId: 'av-001',
    title: 'Real-time Account Dashboard',
    asA: 'bank customer',
    iWant: 'to see all my account balances and recent transactions upon login',
    soThat: 'I can quickly understand my financial position',
    priority: 'must',
    category: 'account-management',
    storyPoints: 13,
    estimatedHours: 40,
    sourceRequirementIds: ['req-002'],
    dependencyIds: ['us-001'],
    status: 'accepted',
    assumptions: ['Account data is available via secure API', 'Maximum 3 linked accounts displayed by default'],
    createdAt: '2026-03-15T10:05:00Z',
    updatedAt: '2026-03-20T09:00:00Z',
  },
  {
    id: 'us-003',
    projectId: 'proj-001',
    artifactVersionId: 'av-001',
    title: 'Domestic Money Transfer',
    asA: 'bank customer',
    iWant: 'to transfer funds to another UK bank account',
    soThat: 'I can pay friends, family, or bills conveniently from my phone',
    priority: 'must',
    category: 'payments',
    storyPoints: 13,
    estimatedHours: 40,
    sourceRequirementIds: ['req-003'],
    dependencyIds: ['us-001', 'us-002'],
    status: 'accepted',
    assumptions: ['Faster Payments scheme used for domestic transfers', 'Daily limit enforced server-side'],
    createdAt: '2026-03-15T10:10:00Z',
    updatedAt: '2026-03-20T09:00:00Z',
  },
  {
    id: 'us-004',
    projectId: 'proj-001',
    artifactVersionId: 'av-001',
    title: 'International Transfer',
    asA: 'bank customer',
    iWant: 'to initiate international wire transfers to overseas accounts',
    soThat: 'I can send money abroad without visiting a branch',
    priority: 'must',
    category: 'payments',
    storyPoints: 21,
    estimatedHours: 64,
    sourceRequirementIds: ['req-003', 'req-009'],
    dependencyIds: ['us-003'],
    status: 'in_review',
    assumptions: ['SWIFT network integration required', 'FX rates sourced from approved provider'],
    createdAt: '2026-03-15T10:15:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  },
  {
    id: 'us-005',
    projectId: 'proj-001',
    artifactVersionId: 'av-001',
    title: 'Configurable Push Notifications',
    asA: 'bank customer',
    iWant: 'to receive and manage push notifications for my account activity',
    soThat: 'I stay informed about transactions and security events in real time',
    priority: 'should',
    category: 'notifications',
    storyPoints: 8,
    estimatedHours: 24,
    sourceRequirementIds: ['req-004'],
    dependencyIds: ['us-001'],
    status: 'accepted',
    assumptions: ['FCM/APNs integration is pre-configured'],
    createdAt: '2026-03-15T10:20:00Z',
    updatedAt: '2026-03-20T09:00:00Z',
  },
  {
    id: 'us-006',
    projectId: 'proj-001',
    artifactVersionId: 'av-001',
    title: 'Card Management',
    asA: 'card holder',
    iWant: 'to freeze my card, set spending limits, and report it as lost',
    soThat: 'I can protect my funds immediately if my card is compromised',
    priority: 'must',
    category: 'card-management',
    storyPoints: 13,
    estimatedHours: 40,
    sourceRequirementIds: ['req-006'],
    dependencyIds: ['us-001'],
    status: 'accepted',
    assumptions: ['Card management API is available', 'Freeze is near-instant via real-time card network'],
    createdAt: '2026-03-15T10:25:00Z',
    updatedAt: '2026-03-20T09:00:00Z',
  },
  {
    id: 'us-007',
    projectId: 'proj-001',
    artifactVersionId: 'av-001',
    title: 'Session Timeout and Re-authentication',
    asA: 'security-conscious bank customer',
    iWant: 'my session to expire after 5 minutes of inactivity',
    soThat: 'my account is protected if I leave my phone unattended',
    priority: 'must',
    category: 'security',
    storyPoints: 5,
    estimatedHours: 16,
    sourceRequirementIds: ['req-010'],
    dependencyIds: ['us-001'],
    status: 'accepted',
    assumptions: ['Timeout period is configurable by admin within regulatory bounds'],
    createdAt: '2026-03-15T10:30:00Z',
    updatedAt: '2026-03-20T09:00:00Z',
  },
  {
    id: 'us-008',
    projectId: 'proj-001',
    artifactVersionId: 'av-001',
    title: 'Scheduled Payments and Standing Orders',
    asA: 'bank customer',
    iWant: 'to set up recurring payments with custom frequency and amounts',
    soThat: 'I can automate regular bills and savings without manual intervention',
    priority: 'should',
    category: 'payments',
    storyPoints: 13,
    estimatedHours: 40,
    sourceRequirementIds: ['req-011'],
    dependencyIds: ['us-003'],
    status: 'draft',
    assumptions: ['Scheduling engine runs server-side', 'Conflicts with payment limits flagged to user'],
    createdAt: '2026-04-10T14:30:00Z',
    updatedAt: '2026-10-05T10:00:00Z',
  },
];

// ------ Acceptance Criteria ------

export const MOCK_ACCEPTANCE_CRITERIA: AcceptanceCriteria[] = [
  {
    id: 'ac-001',
    projectId: 'proj-001',
    artifactVersionId: 'av-002',
    storyId: 'us-001',
    title: 'Successful Biometric Authentication',
    format: 'gherkin',
    scenarios: [
      {
        title: 'Successful Face ID login',
        given: ['I am a registered user with Face ID enrolled', 'The app is on the login screen'],
        when: ['I tap "Login with Face ID"', 'The device recognises my face'],
        then: ['I am authenticated successfully', 'The account dashboard is displayed within 2 seconds'],
        type: 'positive',
      },
      {
        title: 'Failed biometric attempt',
        given: ['I am a registered user with biometrics enrolled'],
        when: ['I attempt biometric login with an unrecognised biometric'],
        then: ['The login attempt fails', 'I am offered to try again or use password', 'No account data is displayed'],
        type: 'negative',
      },
      {
        title: 'Biometric not enrolled',
        given: ['I am a registered user without biometrics set up on my device'],
        when: ['I open the login screen'],
        then: ['Biometric login option is not displayed', 'Password login is available as the primary method'],
        type: 'edge',
      },
    ],
    status: 'accepted',
    sourceRequirementIds: ['req-001'],
    coverageIndicators: { positive: true, negative: true, edge: true, boundary: false },
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-03-25T09:00:00Z',
  },
  {
    id: 'ac-002',
    projectId: 'proj-001',
    artifactVersionId: 'av-002',
    storyId: 'us-002',
    title: 'Account Dashboard Display',
    format: 'gherkin',
    scenarios: [
      {
        title: 'Dashboard loads with account data',
        given: ['I am logged in', 'I have 2 linked accounts'],
        when: ['The dashboard screen is displayed'],
        then: ['All account balances are visible', 'Last 10 transactions are listed per account', 'Data loads within 2 seconds'],
        type: 'positive',
      },
      {
        title: 'Dashboard with no transactions',
        given: ['I am a new customer with a newly opened account', 'I am logged in'],
        when: ['The dashboard screen is displayed'],
        then: ['Account balance shows £0.00', 'An empty state message is shown for transactions', 'No error is displayed'],
        type: 'edge',
      },
      {
        title: 'Dashboard performance under slow network',
        given: ['I am logged in', 'Network latency is above 3 seconds'],
        when: ['The dashboard screen is displayed'],
        then: ['A loading skeleton is shown immediately', 'An error message appears if data fails to load after 10 seconds', 'A retry option is provided'],
        type: 'boundary',
      },
    ],
    status: 'accepted',
    sourceRequirementIds: ['req-002'],
    coverageIndicators: { positive: true, negative: false, edge: true, boundary: true },
    createdAt: '2026-03-20T10:10:00Z',
    updatedAt: '2026-03-25T09:00:00Z',
  },
  {
    id: 'ac-003',
    projectId: 'proj-001',
    artifactVersionId: 'av-002',
    storyId: 'us-003',
    title: 'Domestic Transfer Execution',
    format: 'gherkin',
    scenarios: [
      {
        title: 'Successful domestic transfer',
        given: ['I am logged in', 'I have sufficient balance in my account'],
        when: ['I enter a valid UK sort code and account number', 'I enter an amount within my daily limit', 'I confirm the transfer'],
        then: ['The transfer is initiated', 'A confirmation reference is shown', 'My balance is updated', 'A push notification is sent'],
        type: 'positive',
      },
      {
        title: 'Transfer exceeds daily limit',
        given: ['I am logged in', 'My daily transfer limit is £10,000'],
        when: ['I attempt to transfer £15,000'],
        then: ['The transfer is rejected', 'An error message explains the daily limit', 'No funds are moved'],
        type: 'negative',
      },
    ],
    status: 'accepted',
    sourceRequirementIds: ['req-003'],
    coverageIndicators: { positive: true, negative: true, edge: false, boundary: false },
    createdAt: '2026-03-20T10:20:00Z',
    updatedAt: '2026-03-25T09:00:00Z',
  },
  {
    id: 'ac-004',
    projectId: 'proj-001',
    artifactVersionId: 'av-002',
    storyId: 'us-006',
    title: 'Card Freeze Feature',
    format: 'checklist',
    checklist: [
      { id: 'cl-001', text: 'User can freeze their card from the card management screen', type: 'positive' },
      { id: 'cl-002', text: 'Freeze takes effect within 30 seconds', type: 'positive' },
      { id: 'cl-003', text: 'User receives confirmation notification when card is frozen', type: 'positive' },
      { id: 'cl-004', text: 'Attempting to use a frozen card results in an informative error', type: 'negative' },
      { id: 'cl-005', text: 'User can unfreeze the card using the same screen', type: 'positive' },
      { id: 'cl-006', text: 'Freeze/unfreeze action is recorded in the audit log', type: 'edge' },
    ],
    status: 'in_review',
    sourceRequirementIds: ['req-006'],
    coverageIndicators: { positive: true, negative: true, edge: true, boundary: false },
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  },
];

// ------ Test Cases ------

export const MOCK_TEST_CASES: TestCase[] = [
  {
    id: 'tc-001',
    projectId: 'proj-001',
    artifactVersionId: 'av-003',
    storyId: 'us-001',
    criteriaId: 'ac-001',
    title: 'Verify successful Face ID login on iOS',
    category: 'functional',
    priority: 'critical',
    preconditions: ['User account exists', 'Face ID enrolled on device', 'App is freshly installed or session expired'],
    steps: [
      { stepNumber: 1, action: 'Open the DevPilot Banking app', expectedResult: 'Login screen is displayed' },
      { stepNumber: 2, action: 'Tap the "Login with Face ID" button', expectedResult: 'Face ID prompt appears' },
      { stepNumber: 3, action: 'Present enrolled face to camera', expectedResult: 'Face is recognised successfully' },
      { stepNumber: 4, action: 'Observe app behaviour', expectedResult: 'Account dashboard loads within 2 seconds' },
    ],
    expectedResult: 'User is authenticated via Face ID and taken to the dashboard within 2 seconds',
    testData: 'Test device: iPhone 15 Pro | Test account: test.user.01@example.com',
    status: 'accepted',
    sourceRequirementIds: ['req-001'],
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-04-05T09:00:00Z',
  },
  {
    id: 'tc-002',
    projectId: 'proj-001',
    artifactVersionId: 'av-003',
    storyId: 'us-001',
    criteriaId: 'ac-001',
    title: 'Verify biometric login failure and fallback to password',
    category: 'negative',
    priority: 'high',
    preconditions: ['User account exists', 'Biometrics enrolled', 'App on login screen'],
    steps: [
      { stepNumber: 1, action: 'Open the app login screen', expectedResult: 'Login options visible' },
      { stepNumber: 2, action: 'Tap biometric login button', expectedResult: 'Biometric prompt appears' },
      { stepNumber: 3, action: 'Present an unrecognised biometric 3 times', expectedResult: 'Each attempt fails gracefully' },
      { stepNumber: 4, action: 'Observe offered alternative', expectedResult: 'Password fallback option is shown' },
    ],
    expectedResult: 'Biometric failure shows error without exposing account data; password fallback is accessible',
    testData: 'Use a different finger/face not enrolled on the device',
    status: 'in_review',
    sourceRequirementIds: ['req-001'],
    createdAt: '2026-04-01T10:10:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  },
  {
    id: 'tc-003',
    projectId: 'proj-001',
    artifactVersionId: 'av-003',
    storyId: 'us-002',
    criteriaId: 'ac-002',
    title: 'Dashboard load performance with multiple accounts',
    category: 'boundary',
    priority: 'high',
    preconditions: ['Logged-in user with 3 linked accounts', 'Each account has 50+ transactions'],
    steps: [
      { stepNumber: 1, action: 'Start performance timer', expectedResult: 'Timer running' },
      { stepNumber: 2, action: 'Navigate to account dashboard', expectedResult: 'Loading skeleton displayed immediately' },
      { stepNumber: 3, action: 'Wait for data to fully load', expectedResult: 'All balances and transactions displayed' },
      { stepNumber: 4, action: 'Stop timer', expectedResult: 'Total elapsed time recorded' },
    ],
    expectedResult: 'Dashboard fully renders within 2 seconds for a user with 3 accounts and 50+ transactions each',
    testData: 'Accounts: CHK-001, SAV-001, ISA-001 with 50 transactions each in test environment',
    status: 'draft',
    sourceRequirementIds: ['req-002', 'req-012'],
    createdAt: '2026-04-01T10:20:00Z',
    updatedAt: '2026-04-05T09:00:00Z',
  },
  {
    id: 'tc-004',
    projectId: 'proj-001',
    artifactVersionId: 'av-003',
    storyId: 'us-003',
    criteriaId: 'ac-003',
    title: 'Domestic transfer with valid details',
    category: 'functional',
    priority: 'critical',
    preconditions: ['Logged-in user', 'Source account balance ≥ £100', 'Valid recipient account details available'],
    steps: [
      { stepNumber: 1, action: 'Navigate to Transfers section', expectedResult: 'Transfer screen displayed' },
      { stepNumber: 2, action: 'Enter sort code: 20-45-67 and account: 12345678', expectedResult: 'Recipient details accepted' },
      { stepNumber: 3, action: 'Enter amount: £50.00 and reference: "Test payment"', expectedResult: 'Amount entered, reference accepted' },
      { stepNumber: 4, action: 'Tap "Review Transfer"', expectedResult: 'Confirmation screen shown with all details' },
      { stepNumber: 5, action: 'Tap "Confirm"', expectedResult: 'Transfer submitted successfully' },
    ],
    expectedResult: 'Transfer executes, balance updates, reference number displayed, notification sent',
    testData: 'Source: 20-00-00 / 00000001 | Destination: 20-45-67 / 12345678 | Amount: £50.00',
    status: 'accepted',
    sourceRequirementIds: ['req-003'],
    createdAt: '2026-04-01T10:30:00Z',
    updatedAt: '2026-04-05T09:00:00Z',
  },
  {
    id: 'tc-005',
    projectId: 'proj-001',
    artifactVersionId: 'av-003',
    storyId: 'us-003',
    criteriaId: 'ac-003',
    title: 'Transfer rejected when exceeding daily limit',
    category: 'negative',
    priority: 'critical',
    preconditions: ['Logged-in user', 'Daily transfer limit set to £10,000', 'Already transferred £9,500 today'],
    steps: [
      { stepNumber: 1, action: 'Navigate to Transfers', expectedResult: 'Transfer screen shown' },
      { stepNumber: 2, action: 'Enter recipient details', expectedResult: 'Details accepted' },
      { stepNumber: 3, action: 'Enter amount: £1,000', expectedResult: 'Amount entered' },
      { stepNumber: 4, action: 'Confirm transfer', expectedResult: 'Error message shown citing daily limit exceeded' },
    ],
    expectedResult: 'Transfer is rejected with informative error; no funds are moved; balance unchanged',
    testData: 'User with £9,500 already transferred today; limit £10,000',
    status: 'accepted',
    sourceRequirementIds: ['req-003'],
    createdAt: '2026-04-01T10:40:00Z',
    updatedAt: '2026-04-05T09:00:00Z',
  },
  {
    id: 'tc-006',
    projectId: 'proj-001',
    artifactVersionId: 'av-003',
    storyId: 'us-007',
    title: 'Session timeout after 5 minutes inactivity',
    category: 'security',
    priority: 'critical',
    preconditions: ['User is logged in', 'App is in foreground'],
    steps: [
      { stepNumber: 1, action: 'Leave app idle without interaction', expectedResult: 'App remains on current screen for 5 minutes' },
      { stepNumber: 2, action: 'Wait 5 minutes and 1 second', expectedResult: 'Session timeout triggered' },
      { stepNumber: 3, action: 'Observe app state', expectedResult: 'Login screen displayed, session data cleared' },
      { stepNumber: 4, action: 'Attempt to press back', expectedResult: 'Remains on login screen, no account data visible' },
    ],
    expectedResult: 'Session expires after exactly 5 minutes of inactivity; re-authentication required',
    testData: 'Use a stopwatch or automated timer to measure inactivity period precisely',
    status: 'accepted',
    sourceRequirementIds: ['req-010'],
    createdAt: '2026-04-01T11:00:00Z',
    updatedAt: '2026-04-05T09:00:00Z',
  },
];

// ------ API Specification ------

export const MOCK_API_SPEC: ApiSpecification = {
  id: 'api-001',
  projectId: 'proj-001',
  artifactVersionId: 'av-004',
  title: 'RetailBanking Mobile API',
  version: '2.0.0',
  description: 'RESTful API specification for the RetailBanking Mobile App v2.0. Generated from confirmed requirements.',
  endpoints: [
    {
      path: '/auth/login',
      method: 'POST',
      summary: 'Authenticate user',
      description: 'Authenticate a user with credentials or initiate biometric challenge.',
      tags: ['Authentication'],
      authentication: false,
      requestBody: { email: 'string', password: 'string', biometric_token: 'string|optional' },
      responses: {
        '200': { description: 'Authentication successful; returns session token' },
        '401': { description: 'Invalid credentials' },
        '429': { description: 'Too many failed attempts; account temporarily locked' },
      },
    },
    {
      path: '/accounts',
      method: 'GET',
      summary: 'List user accounts',
      description: 'Returns all accounts linked to the authenticated user with current balances.',
      tags: ['Accounts'],
      authentication: true,
      responses: {
        '200': { description: 'List of accounts with balances' },
        '401': { description: 'Unauthenticated' },
      },
    },
    {
      path: '/accounts/{accountId}/transactions',
      method: 'GET',
      summary: 'Get transaction history',
      description: 'Returns paginated transaction history for the specified account.',
      tags: ['Accounts', 'Transactions'],
      authentication: true,
      parameters: [{ name: 'accountId', in: 'path', required: true }, { name: 'page', in: 'query' }, { name: 'limit', in: 'query' }],
      responses: {
        '200': { description: 'Paginated transaction list' },
        '404': { description: 'Account not found or not owned by user' },
      },
    },
    {
      path: '/transfers',
      method: 'POST',
      summary: 'Initiate money transfer',
      description: 'Create a domestic or international transfer from a user account.',
      tags: ['Payments'],
      authentication: true,
      requestBody: { from_account_id: 'string', to_sort_code: 'string', to_account_number: 'string', amount: 'number', currency: 'string', reference: 'string' },
      responses: {
        '201': { description: 'Transfer initiated successfully; returns reference' },
        '400': { description: 'Invalid transfer details' },
        '422': { description: 'Exceeds daily limit or insufficient funds' },
      },
    },
    {
      path: '/cards/{cardId}/freeze',
      method: 'POST',
      summary: 'Freeze a card',
      description: 'Immediately freeze the specified card to prevent further transactions.',
      tags: ['Cards'],
      authentication: true,
      responses: {
        '200': { description: 'Card frozen successfully' },
        '404': { description: 'Card not found or not owned by user' },
      },
    },
    {
      path: '/notifications/preferences',
      method: 'PUT',
      summary: 'Update notification preferences',
      description: 'Set which notification types the user wishes to receive.',
      tags: ['Notifications'],
      authentication: true,
      requestBody: { transactions: 'boolean', security_alerts: 'boolean', promotions: 'boolean' },
      responses: {
        '200': { description: 'Preferences updated' },
        '400': { description: 'Invalid preferences payload' },
      },
    },
    {
      path: '/fx/rates',
      method: 'GET',
      summary: 'Get FX exchange rates',
      description: 'Returns current foreign exchange rates for supported currency pairs.',
      tags: ['FX', 'International'],
      authentication: true,
      parameters: [{ name: 'base', in: 'query' }, { name: 'targets', in: 'query' }],
      responses: {
        '200': { description: 'Current exchange rates' },
        '503': { description: 'FX provider unavailable; cached rates may be returned' },
      },
    },
    {
      path: '/scheduled-payments',
      method: 'POST',
      summary: 'Create scheduled payment',
      description: 'Set up a recurring or one-time future payment.',
      tags: ['Payments', 'Scheduled'],
      authentication: true,
      requestBody: { from_account_id: 'string', to_account_number: 'string', amount: 'number', frequency: 'string', start_date: 'string', end_date: 'string|optional' },
      responses: {
        '201': { description: 'Scheduled payment created' },
        '400': { description: 'Invalid schedule parameters' },
      },
    },
  ],
  rawYaml: `openapi: "3.0.3"
info:
  title: RetailBanking Mobile API
  version: "2.0.0"
  description: RESTful API for RetailBanking Mobile App v2.0
servers:
  - url: https://api.retailbanking.demo/v2
paths:
  /auth/login:
    post:
      summary: Authenticate user
      tags: [Authentication]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email: { type: string, format: email }
                password: { type: string }
                biometric_token: { type: string }
              required: [email, password]
      responses:
        "200":
          description: Authentication successful
        "401":
          description: Invalid credentials
        "429":
          description: Too many attempts`,
  validationStatus: 'valid',
  validationFindings: [],
  status: 'in_review',
  sourceRequirementIds: ['req-001', 'req-002', 'req-003', 'req-004', 'req-006', 'req-009'],
  createdAt: '2026-04-15T10:00:00Z',
  updatedAt: '2026-10-01T09:00:00Z',
};

// ------ Architecture Recommendation ------

export const MOCK_ARCHITECTURE: ArchitectureRecommendation = {
  id: 'arch-001',
  projectId: 'proj-001',
  artifactVersionId: 'av-005',
  title: 'Mobile Banking App — Microservices Architecture',
  summary: 'Event-driven microservices architecture with an API Gateway, stateless services, and a React Native mobile client. Prioritises security, scalability, and compliance.',
  pattern: 'Microservices with API Gateway',
  components: [
    { name: 'React Native Mobile Client', role: 'User-facing mobile application', technology: 'React Native / TypeScript' },
    { name: 'API Gateway', role: 'Single entry point; auth, rate limiting, routing', technology: 'AWS API Gateway / Kong' },
    { name: 'Auth Service', role: 'JWT issuance, biometric tokens, session management', technology: 'Node.js / Fastify' },
    { name: 'Account Service', role: 'Balance queries, transaction history', technology: 'Python / FastAPI' },
    { name: 'Payment Service', role: 'Transfer initiation, Faster Payments, SWIFT', technology: 'Java / Spring Boot' },
    { name: 'Notification Service', role: 'FCM/APNs push delivery, preferences', technology: 'Node.js / Bull Queue' },
    { name: 'Card Service', role: 'Card freeze/unfreeze, limit management', technology: 'Python / FastAPI' },
    { name: 'FX Service', role: 'Real-time FX rate retrieval and caching', technology: 'Python / FastAPI + Redis' },
    { name: 'PostgreSQL', role: 'Primary relational data store', technology: 'PostgreSQL 15' },
    { name: 'Redis', role: 'Session cache, rate limiting, FX rate cache', technology: 'Redis 7' },
    { name: 'Event Bus', role: 'Async communication between services', technology: 'Apache Kafka' },
  ],
  securityConsiderations: [
    'TLS 1.3 enforced on all service-to-service and client-to-gateway communication',
    'JWT tokens with 15-minute expiry; refresh tokens stored in secure HttpOnly cookies',
    'Biometric tokens are device-bound and never transmitted in raw form',
    'API Gateway enforces rate limiting (100 req/min per user)',
    'All PII encrypted at rest with AES-256',
    'Audit events published to immutable log store',
    'OWASP Mobile Top 10 mitigations applied in client code review',
  ],
  deploymentTopology: 'Containerised services on Kubernetes; auto-scaling via HPA; multi-AZ PostgreSQL; CDN for static assets',
  alternatives: [
    {
      name: 'Monolithic Architecture',
      rationale: 'Simpler to develop initially; single deployment unit',
      tradeoffs: 'Poor scalability for high-traffic payment operations; harder to apply independent security updates per service',
    },
    {
      name: 'BFF (Backend for Frontend) Pattern',
      rationale: 'Optimise payloads specifically for mobile client',
      tradeoffs: 'Additional service to maintain; may duplicate logic from core services',
    },
  ],
  assumptions: [
    'Team has Kubernetes operational experience',
    'Kafka cluster is managed (e.g., Confluent Cloud) to reduce ops overhead',
    'PostgreSQL is managed (e.g., AWS RDS) for automatic backups and failover',
  ],
  risks: [
    'Distributed tracing complexity increases debugging effort',
    'Network latency between services may affect perceived dashboard load time',
    'Kafka adds operational complexity; message schema governance required',
  ],
  mermaidDiagram: `graph TD
  Client["React Native App"] --> GW["API Gateway"]
  GW --> Auth["Auth Service"]
  GW --> Acct["Account Service"]
  GW --> Pay["Payment Service"]
  GW --> Card["Card Service"]
  GW --> Notif["Notification Service"]
  GW --> FX["FX Service"]
  Acct --> DB[("PostgreSQL")]
  Pay --> DB
  Card --> DB
  Auth --> Redis[("Redis Cache")]
  FX --> Redis
  Pay --> Kafka[["Kafka Event Bus"]]
  Kafka --> Notif`,
  status: 'in_review',
  sourceRequirementIds: ['req-001', 'req-002', 'req-003', 'req-006', 'req-008', 'req-009', 'req-012'],
  createdAt: '2026-05-01T10:00:00Z',
  updatedAt: '2026-10-01T09:00:00Z',
};

// ------ Sprint Plans ------

export const MOCK_SPRINTS: Sprint[] = [
  {
    id: 'sprint-001',
    projectId: 'proj-001',
    name: 'Sprint 1 — Authentication & Dashboard Foundation',
    goal: 'Deliver working biometric login, session management, and the account dashboard MVP',
    startDate: '2026-04-28T00:00:00Z',
    endDate: '2026-05-09T00:00:00Z',
    status: 'completed',
    totalPoints: 34,
    completedPoints: 34,
    teamCapacity: 200,
    teamVelocity: 34,
    items: [
      { id: 'si-001', sprintId: 'sprint-001', storyId: 'us-001', storyTitle: 'Biometric Login', storyPoints: 8, estimatedHours: 24, priority: 'must', status: 'done', isCriticalPath: true, dependencyIds: [] },
      { id: 'si-002', sprintId: 'sprint-001', storyId: 'us-007', storyTitle: 'Session Timeout and Re-authentication', storyPoints: 5, estimatedHours: 16, priority: 'must', status: 'done', isCriticalPath: true, dependencyIds: ['si-001'] },
      { id: 'si-003', sprintId: 'sprint-001', storyId: 'us-002', storyTitle: 'Real-time Account Dashboard', storyPoints: 13, estimatedHours: 40, priority: 'must', status: 'done', isCriticalPath: true, dependencyIds: ['si-001'] },
      { id: 'si-004', sprintId: 'sprint-001', storyId: 'us-005', storyTitle: 'Configurable Push Notifications', storyPoints: 8, estimatedHours: 24, priority: 'should', status: 'done', isCriticalPath: false, dependencyIds: ['si-001'] },
    ],
    warnings: [],
  },
  {
    id: 'sprint-002',
    projectId: 'proj-001',
    name: 'Sprint 2 — Payments & Card Management',
    goal: 'Implement domestic transfers, card management, and begin international transfer work',
    startDate: '2026-05-12T00:00:00Z',
    endDate: '2026-05-23T00:00:00Z',
    status: 'active',
    totalPoints: 47,
    completedPoints: 18,
    teamCapacity: 200,
    teamVelocity: 34,
    items: [
      { id: 'si-005', sprintId: 'sprint-002', storyId: 'us-003', storyTitle: 'Domestic Money Transfer', storyPoints: 13, estimatedHours: 40, priority: 'must', status: 'done', isCriticalPath: true, dependencyIds: [] },
      { id: 'si-006', sprintId: 'sprint-002', storyId: 'us-006', storyTitle: 'Card Management', storyPoints: 13, estimatedHours: 40, priority: 'must', status: 'in_progress', isCriticalPath: false, dependencyIds: [] },
      { id: 'si-007', sprintId: 'sprint-002', storyId: 'us-004', storyTitle: 'International Transfer', storyPoints: 21, estimatedHours: 64, priority: 'must', status: 'todo', isCriticalPath: true, dependencyIds: ['si-005'] },
    ],
    warnings: ['Sprint may exceed team velocity (47 pts vs 34 avg). Consider moving US-004 to Sprint 3.'],
  },
];

// ------ Prompt Templates ------

export const MOCK_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'pt-001',
    name: 'User Story Generator',
    description: 'Generates structured user stories from confirmed requirements following "As a [role], I want [feature], so that [benefit]" format.',
    artifactType: 'user_stories',
    tags: ['stories', 'generation', 'core'],
    owner: 'usr-001',
    versions: [
      {
        id: 'pv-001',
        templateId: 'pt-001',
        versionNumber: 1,
        status: 'retired',
        content: 'Given the following requirement:\n{{requirement_text}}\n\nGenerate user stories...',
        variables: [{ name: 'requirement_text', type: 'string', description: 'Normalized requirement text', required: true, example: 'Support biometric authentication' }],
        outputSchema: { type: 'array', items: { type: 'object' } },
        notes: 'Initial version — basic format without category or dependency fields',
        createdBy: 'usr-001',
        createdAt: '2026-02-01T10:00:00Z',
        retiredAt: '2026-03-15T10:00:00Z',
        performanceMetrics: { sampleCount: 45, avgAccuracy: 62, avgCompleteness: 58, avgRelevance: 65, avgLatencyMs: 3200, dateRange: { from: '2026-02-01', to: '2026-03-15' } },
      },
      {
        id: 'pv-002',
        templateId: 'pt-001',
        versionNumber: 2,
        status: 'active',
        content: `You are a Senior Business Analyst. Given the following software requirement, generate well-formed user stories.

Requirement: {{requirement_text}}
Category: {{category}}
Priority: {{priority}}

For each user story, provide:
- id: unique identifier
- title: brief descriptive title
- as_a: the user role
- i_want: the feature or capability
- so_that: the business benefit
- priority: must/should/could/wont
- category: feature area
- assumptions: list of assumptions made
- source_requirement_ids: list containing the source requirement ID

Output as valid JSON array. Generate 1-3 stories per requirement. Do not invent business rules not present in the requirement.`,
        variables: [
          { name: 'requirement_text', type: 'string', description: 'Normalized requirement text', required: true, example: 'Support biometric authentication' },
          { name: 'category', type: 'string', description: 'Requirement category', required: true, example: 'security' },
          { name: 'priority', type: 'string', description: 'MoSCoW priority', required: true, example: 'must' },
        ],
        outputSchema: { type: 'array', items: { type: 'object', required: ['id', 'title', 'as_a', 'i_want', 'so_that'] } },
        notes: 'Added category, priority, and assumption fields. Improved JSON schema. +14% accuracy over v1.',
        createdBy: 'usr-001',
        createdAt: '2026-03-15T10:00:00Z',
        activatedAt: '2026-03-20T09:00:00Z',
        performanceMetrics: { sampleCount: 120, avgAccuracy: 76, avgCompleteness: 72, avgRelevance: 78, avgLatencyMs: 4100, dateRange: { from: '2026-03-20', to: '2026-10-14' } },
        testResults: [
          { id: 'tr-001', versionId: 'pv-002', sampleInput: { requirement_text: 'Support biometric authentication', category: 'security', priority: 'must' }, output: '[{"id":"us-001","title":"Biometric Login"...}]', schemaValid: true, latencyMs: 3800, tokenUsage: 420, reviewerFeedback: 'Good output quality; stories are well-formed', runAt: '2026-03-18T10:00:00Z' },
        ],
      },
    ],
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-03-20T09:00:00Z',
  },
  {
    id: 'pt-002',
    name: 'Gherkin Acceptance Criteria Generator',
    description: 'Produces Given-When-Then Gherkin scenarios covering positive, negative, edge, and boundary cases.',
    artifactType: 'acceptance_criteria',
    tags: ['gherkin', 'criteria', 'bdd'],
    owner: 'usr-001',
    versions: [
      {
        id: 'pv-003',
        templateId: 'pt-002',
        versionNumber: 1,
        status: 'active',
        content: `Generate Gherkin acceptance criteria for the following user story.

Story: {{story_title}}
As a {{as_a}}, I want {{i_want}}, so that {{so_that}}

Produce scenarios covering: positive (happy path), negative (failure cases), edge cases.
Each scenario: title, given (array), when (array), then (array), type (positive|negative|edge|boundary).
Output valid JSON array of scenarios.`,
        variables: [
          { name: 'story_title', type: 'string', description: 'User story title', required: true, example: 'Biometric Login' },
          { name: 'as_a', type: 'string', description: 'Role in story', required: true, example: 'registered user' },
          { name: 'i_want', type: 'string', description: 'Desired feature', required: true, example: 'to log in with biometrics' },
          { name: 'so_that', type: 'string', description: 'Business benefit', required: true, example: 'I can access my account quickly' },
        ],
        outputSchema: { type: 'array', items: { type: 'object', required: ['title', 'given', 'when', 'then', 'type'] } },
        notes: 'Initial active version with full scenario type coverage',
        createdBy: 'usr-001',
        createdAt: '2026-03-01T10:00:00Z',
        activatedAt: '2026-03-10T09:00:00Z',
        performanceMetrics: { sampleCount: 85, avgAccuracy: 71, avgCompleteness: 69, avgRelevance: 74, avgLatencyMs: 3600, dateRange: { from: '2026-03-10', to: '2026-10-14' } },
      },
    ],
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-10T09:00:00Z',
  },
  {
    id: 'pt-003',
    name: 'Test Case Generator',
    description: 'Generates structured test cases with unique IDs, preconditions, step-by-step instructions, and expected results.',
    artifactType: 'test_cases',
    tags: ['testing', 'qa', 'test-cases'],
    owner: 'usr-001',
    versions: [
      {
        id: 'pv-004',
        templateId: 'pt-003',
        versionNumber: 1,
        status: 'active',
        content: `Generate test cases for the following user story and acceptance criteria.

Story: {{story_title}}
Acceptance Criteria: {{criteria_summary}}

Generate test cases for categories: functional, negative, boundary, edge, security (where applicable).
Each test case: id, title, category, priority, preconditions (array), steps (array of {action, expectedResult}), expectedResult, testData.
Ensure unique IDs. Report if any scenario categories cannot be generated.`,
        variables: [
          { name: 'story_title', type: 'string', description: 'User story title', required: true, example: 'Biometric Login' },
          { name: 'criteria_summary', type: 'string', description: 'Summary of acceptance criteria', required: true, example: 'User can login with Face ID' },
        ],
        outputSchema: { type: 'array', items: { type: 'object', required: ['id', 'title', 'category', 'priority', 'steps'] } },
        notes: 'Initial version',
        createdBy: 'usr-001',
        createdAt: '2026-03-15T10:00:00Z',
        activatedAt: '2026-03-20T09:00:00Z',
        performanceMetrics: { sampleCount: 60, avgAccuracy: 68, avgCompleteness: 71, avgRelevance: 73, avgLatencyMs: 4800, dateRange: { from: '2026-03-20', to: '2026-10-14' } },
      },
    ],
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-20T09:00:00Z',
  },
  {
    id: 'pt-004',
    name: 'OpenAPI Specification Generator',
    description: 'Generates valid OpenAPI 3.0 YAML from confirmed user stories and requirements.',
    artifactType: 'api_specification',
    tags: ['openapi', 'api', 'specification'],
    owner: 'usr-001',
    versions: [
      {
        id: 'pv-005',
        templateId: 'pt-004',
        versionNumber: 1,
        status: 'tested',
        content: `Generate an OpenAPI 3.0 YAML specification from the following user stories and requirements.

Stories: {{stories_summary}}
Requirements: {{requirements_summary}}

Include: paths, HTTP methods, request/response schemas, authentication (Bearer JWT), error responses (400,401,403,404,422,429,500).
Output valid OpenAPI 3.0 YAML only.`,
        variables: [
          { name: 'stories_summary', type: 'array', description: 'List of user story titles', required: true, example: '["Biometric Login", "Account Dashboard"]' },
          { name: 'requirements_summary', type: 'array', description: 'Normalized requirement texts', required: true, example: '["Support biometric auth"]' },
        ],
        outputSchema: { type: 'object', description: 'Valid OpenAPI 3.0 document' },
        notes: 'In test phase — awaiting OpenAPI validator integration',
        createdBy: 'usr-001',
        createdAt: '2026-04-01T10:00:00Z',
        performanceMetrics: { sampleCount: 12, avgAccuracy: 73, avgCompleteness: 70, avgRelevance: 75, avgLatencyMs: 7200, dateRange: { from: '2026-04-01', to: '2026-10-01' } },
      },
    ],
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  },
  {
    id: 'pt-005',
    name: 'Architecture Recommendation Generator',
    description: 'Generates architecture recommendations with component views, security considerations, and deployment topology.',
    artifactType: 'architecture_recommendation',
    tags: ['architecture', 'design', 'recommendations'],
    owner: 'usr-001',
    versions: [
      {
        id: 'pv-006',
        templateId: 'pt-005',
        versionNumber: 1,
        status: 'draft',
        content: `Analyse the following project requirements and generate architecture recommendations.

Requirements: {{requirements_summary}}
Constraints: {{constraints}}

Provide: architectural pattern, component list, security considerations, deployment topology, alternatives with trade-offs, assumptions, and risks.
Label output as a draft recommendation for human review.`,
        variables: [
          { name: 'requirements_summary', type: 'array', description: 'Key requirements texts', required: true, example: '["TLS 1.3", "10,000 concurrent users"]' },
          { name: 'constraints', type: 'string', description: 'Known technical or organisational constraints', required: false, example: 'Must use AWS; PostgreSQL only' },
        ],
        outputSchema: { type: 'object', description: 'Architecture recommendation object' },
        notes: 'Draft — not yet tested against sample architecture baseline',
        createdBy: 'usr-001',
        createdAt: '2026-05-01T10:00:00Z',
      },
    ],
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z',
  },
];

export const MOCK_PROMPTS = MOCK_PROMPT_TEMPLATES;

// ------ Evaluation Runs ------

export const MOCK_EVALUATIONS: EvaluationRun[] = [
  {
    id: 'eval-001',
    projectId: 'proj-001',
    artifactType: 'user_stories',
    artifactVersionId: 'av-001',
    baselineArtifactId: 'base-001',
    promptVersionId: 'pv-002',
    metrics: { accuracy: 76, completeness: 72, relevance: 78, formatCompliance: 91, consistency: 80, hallucinationRisk: 12 },
    overallScore: 74,
    sampleCount: 8,
    reviewerId: 'usr-003',
    reviewerFeedback: 'Stories are well-formed and traceable. A few instances of assumed business rules not present in requirements — flagged for review.',
    humanAdjustedScore: 72,
    status: 'complete',
    notes: 'Baseline comparison using manually authored stories from the same requirements set. Sample size is small; results are illustrative.',
    createdAt: '2026-05-01T10:00:00Z',
    completedAt: '2026-05-02T09:00:00Z',
  },
  {
    id: 'eval-002',
    projectId: 'proj-001',
    artifactType: 'acceptance_criteria',
    artifactVersionId: 'av-002',
    baselineArtifactId: 'base-002',
    promptVersionId: 'pv-003',
    metrics: { accuracy: 71, completeness: 69, relevance: 74, formatCompliance: 88, consistency: 76, hallucinationRisk: 15 },
    overallScore: 69,
    sampleCount: 4,
    reviewerId: 'usr-005',
    reviewerFeedback: 'Gherkin structure is correct. Coverage of negative cases needs improvement — some scenarios omit boundary conditions.',
    status: 'complete',
    notes: 'ILLUSTRATIVE SAMPLE DATA — n=4 is too small for statistical significance. Accuracy target is ≥70%; this run narrowly misses it.',
    createdAt: '2026-05-15T10:00:00Z',
    completedAt: '2026-05-16T09:00:00Z',
  },
  {
    id: 'eval-003',
    projectId: 'proj-001',
    artifactType: 'test_cases',
    artifactVersionId: 'av-003',
    baselineArtifactId: 'base-003',
    promptVersionId: 'pv-004',
    metrics: { accuracy: 68, completeness: 71, relevance: 73, formatCompliance: 85, consistency: 74, hallucinationRisk: 18 },
    overallScore: 68,
    sampleCount: 6,
    status: 'complete',
    notes: 'ILLUSTRATIVE SAMPLE DATA — not a verified measurement. Hallucination risk indicator relates to invented preconditions not grounded in requirements.',
    createdAt: '2026-06-01T10:00:00Z',
    completedAt: '2026-06-02T09:00:00Z',
  },
];

export const MOCK_EVALUATION_RUNS = MOCK_EVALUATIONS;

// ------ Case Study ------

export const MOCK_CASE_STUDY: CaseStudyComparison = {
  id: 'cs-001',
  projectId: 'proj-001',
  title: 'DevPilot vs Manual SDLC — Open Source Banking Reference App',
  openSourceProject: 'Open Banking Reference Implementation',
  projectUrl: 'https://github.com/example/open-banking-ref',
  license: 'Apache 2.0',
  scope: 'Comparison of AI-assisted vs manual authoring for user stories, acceptance criteria, and test cases using public banking domain requirements.',
  baselineArtifacts: [
    { type: 'user_stories', humanCount: 8, generatedCount: 9, matchRate: 72 },
    { type: 'acceptance_criteria', humanCount: 12, generatedCount: 14, matchRate: 68 },
    { type: 'test_cases', humanCount: 20, generatedCount: 18, matchRate: 65 },
  ],
  effortComparison: {
    manualHours: 32,
    assistedHours: 14,
    reduction: 56,
  },
  evaluationResults: MOCK_EVALUATIONS,
  findings: [
    'AI-generated user stories matched human baseline at ~72% — approaching the 70% target but with small sample size.',
    'Acceptance criteria coverage for negative/edge cases was weaker than human-authored baseline.',
    'Effort reduction of ~56% was observed for initial drafting; human review time is additional.',
    'Format compliance was consistently high (85-91%) across all artifact types.',
  ],
  limitations: [
    'Sample size (n=4–8) is too small for statistically significant conclusions.',
    'Human baseline was authored by a single BA; results may not generalise.',
    'Evaluation metric formulae are provisional; method has not been peer-reviewed.',
    'Results are from a synthetic project; real-world banking requirements may differ significantly.',
    'This is ILLUSTRATIVE DATA for demonstration purposes only.',
  ],
  lessonsLearned: [
    'Prompt iteration significantly improves output quality — v2 showed +14% accuracy over v1.',
    'Human review remains essential; AI drafts reduce time-to-first-review, not time-to-acceptance.',
    'Clear output schema constraints in prompts reduce hallucination risk.',
    'Traceability to requirements is a strong quality signal that can be automatically verified.',
  ],
  status: 'in_progress',
  createdAt: '2026-06-01T10:00:00Z',
};

// ------ Generation Runs ------

export const MOCK_GENERATION_RUNS: GenerationRun[] = [
  {
    id: 'gr-001',
    projectId: 'proj-001',
    artifactType: 'user_stories',
    sourceRequirementIds: ['req-001', 'req-002', 'req-003'],
    promptVersionId: 'pv-002',
    provider: 'openai',
    model: 'gpt-4o',
    status: 'complete',
    latencyMs: 4100,
    tokenUsage: 1820,
    validationStatus: 'valid',
    validationFindings: [],
    createdAt: '2026-03-15T10:00:00Z',
    completedAt: '2026-03-15T10:00:04Z',
  },
  {
    id: 'gr-002',
    projectId: 'proj-001',
    artifactType: 'acceptance_criteria',
    sourceRequirementIds: ['req-001'],
    promptVersionId: 'pv-003',
    provider: 'openai',
    model: 'gpt-4o',
    status: 'complete',
    latencyMs: 3800,
    tokenUsage: 1240,
    validationStatus: 'valid',
    validationFindings: [],
    createdAt: '2026-03-20T10:00:00Z',
    completedAt: '2026-03-20T10:00:04Z',
  },
  {
    id: 'gr-003',
    projectId: 'proj-001',
    artifactType: 'test_cases',
    sourceRequirementIds: ['req-001', 'req-002', 'req-003'],
    promptVersionId: 'pv-004',
    provider: 'openai',
    model: 'gpt-4o',
    status: 'complete',
    latencyMs: 5200,
    tokenUsage: 2100,
    validationStatus: 'warnings',
    validationFindings: ['TC-007 is missing preconditions', 'TC-012 references undefined test data'],
    createdAt: '2026-04-01T10:00:00Z',
    completedAt: '2026-04-01T10:00:05Z',
  },
];

// ------ Activity Feed ------

export const MOCK_ACTIVITIES: ActivityEntry[] = [
  { id: 'act-001', projectId: 'proj-001', userId: 'usr-003', userName: 'Anika Patel', userRole: 'business_analyst', action: 'confirmed requirement', entityType: 'requirement', entityId: 'req-001', entityTitle: 'Biometric Authentication', timestamp: '2026-10-15T08:05:00Z' },
  { id: 'act-002', projectId: 'proj-001', userId: 'usr-002', userName: 'James Whitfield', userRole: 'project_manager', action: 'approved user story', entityType: 'user_story', entityId: 'us-003', entityTitle: 'Domestic Money Transfer', timestamp: '2026-10-15T08:20:00Z' },
  { id: 'act-003', projectId: 'proj-001', userId: 'usr-004', userName: 'Marcus Chen', userRole: 'developer', action: 'ran AI generation for test cases', entityType: 'test_case', entityId: 'gr-003', entityTitle: 'Test Case Generation Run', timestamp: '2026-10-15T09:00:00Z' },
  { id: 'act-004', projectId: 'proj-001', userId: 'usr-005', userName: 'Sarah O\'Brien', userRole: 'tester', action: 'reviewed evaluation results', entityType: 'evaluation', entityId: 'eval-001', entityTitle: 'User Stories Quality Benchmark', timestamp: '2026-10-15T09:30:00Z' },
  { id: 'act-005', projectId: 'proj-001', userId: 'usr-001', userName: 'Priya Sharma', userRole: 'admin', action: 'activated prompt version', entityType: 'prompt', entityId: 'pv-002', entityTitle: 'User Story Generator v2', timestamp: '2026-10-14T14:00:00Z' },
  { id: 'act-006', projectId: 'proj-001', userId: 'usr-003', userName: 'Anika Patel', userRole: 'business_analyst', action: 'uploaded BRD document', entityType: 'document', entityId: 'doc-001', entityTitle: 'RetailBanking_BRD_v2.3.pdf', timestamp: '2026-10-14T11:00:00Z' },
  { id: 'act-007', projectId: 'proj-001', userId: 'usr-002', userName: 'James Whitfield', userRole: 'project_manager', action: 'rejected acceptance criteria', entityType: 'acceptance_criteria', entityId: 'ac-004', entityTitle: 'Card Freeze Feature Criteria', details: 'Missing boundary conditions for limit values', timestamp: '2026-10-14T10:30:00Z' },
  { id: 'act-008', projectId: 'proj-001', userId: 'usr-001', userName: 'Priya Sharma', userRole: 'admin', action: 'created project', entityType: 'project', entityId: 'proj-001', entityTitle: 'RetailBanking Mobile App v2.0', timestamp: '2026-03-01T09:00:00Z' },
];

// ------ Assistant Conversation ------

export const MOCK_ASSISTANT_CONVERSATION: AssistantConversation = {
  id: 'conv-001',
  projectId: 'proj-001',
  userId: 'usr-003',
  title: 'Requirements clarification session',
  messages: [
    {
      id: 'msg-001',
      sender: 'user',
      text: 'How many confirmed requirements does this project have?',
      timestamp: '2026-10-15T10:00:00Z',
    },
    {
      id: 'msg-002',
      sender: 'assistant',
      text: 'The RetailBanking Mobile App v2.0 project currently has **10 confirmed requirements** out of 12 total. REQ-007 (In-app Chatbot) and REQ-011 (Scheduled Payments) are still In Review, pending stakeholder sign-off.\n\nOf the confirmed requirements:\n- **5** are Must-have (REQ-001, REQ-002, REQ-003, REQ-005, REQ-008)\n- **3** are Should-have\n\n*Note: This response uses mock project data for demonstration purposes.*',
      sourceArtifacts: [{ type: 'requirement', id: 'req-001', title: 'Biometric Authentication' }, { type: 'requirement', id: 'req-007', title: 'In-app Chatbot' }],
      isMock: true,
      timestamp: '2026-10-15T10:00:03Z',
    },
    {
      id: 'msg-003',
      sender: 'user',
      text: 'What user stories are linked to the biometric authentication requirement?',
      timestamp: '2026-10-15T10:01:00Z',
    },
    {
      id: 'msg-004',
      sender: 'assistant',
      text: 'Requirement **REQ-001** (Biometric Authentication) traces to **1 accepted user story**:\n\n**US-001 — Biometric Login**\n> *As a registered mobile banking customer, I want to log in using Face ID or fingerprint recognition, so that I can access my account quickly and securely without typing a password.*\n\n- **Priority:** Must\n- **Story Points:** 8\n- **Status:** ✅ Accepted\n- **Sprint:** Sprint 1 (Completed)\n\nUS-001 also has 3 acceptance criteria and 2 test cases linked to it.\n\n*Note: This is a mock response for demonstration. Production answers would be retrieved from the project knowledge base.*',
      sourceArtifacts: [
        { type: 'requirement', id: 'req-001', title: 'Biometric Authentication' },
        { type: 'user_story', id: 'us-001', title: 'Biometric Login' },
      ],
      isMock: true,
      timestamp: '2026-10-15T10:01:04Z',
    },
  ],
  createdAt: '2026-10-15T10:00:00Z',
  updatedAt: '2026-10-15T10:01:04Z',
};

// ------ Dashboard Summary ------

export const MOCK_DASHBOARD: DashboardSummary = {
  projectId: 'proj-001',
  health: 'at_risk',
  requirementCount: 12,
  confirmedRequirements: 10,
  artifactCounts: {
    user_stories: 8,
    acceptance_criteria: 4,
    test_cases: 6,
    api_specification: 1,
    architecture_recommendation: 1,
    sprint_plan: 2,
    case_study_report: 1,
  },
  pendingReviewCount: 8,
  qualityScore: 74,
  activeSprintProgress: 38,
  recentActivity: MOCK_ACTIVITIES.slice(0, 6),
  evaluationTrend: [
    { date: '2026-05-01', score: 64 },
    { date: '2026-06-01', score: 67 },
    { date: '2026-07-01', score: 70 },
    { date: '2026-08-01', score: 71 },
    { date: '2026-09-01', score: 73 },
    { date: '2026-10-01', score: 74 },
  ],
  promptPerformance: [
    { name: 'User Story Generator v2', score: 76, runs: 120 },
    { name: 'Gherkin AC Generator v1', score: 71, runs: 85 },
    { name: 'Test Case Generator v1', score: 68, runs: 60 },
    { name: 'OpenAPI Generator v1', score: 73, runs: 12 },
  ],
  warnings: [
    'Sprint 2 allocation (47 pts) exceeds team velocity (34 pts) — consider backlog adjustment',
    '2 requirements still In Review — pending BA confirmation before artifact generation',
    'Evaluation accuracy (68–76%) remains below the ≥70% target for test cases',
  ],
};
