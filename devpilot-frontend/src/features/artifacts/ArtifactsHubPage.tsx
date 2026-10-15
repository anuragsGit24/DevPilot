import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserStoriesPage } from './UserStoriesPage';
import { AcceptanceCriteriaPage } from './AcceptanceCriteriaPage';
import { TestCasesPage } from './TestCasesPage';
import { ApiSpecPage } from './ApiSpecPage';
import { ArchitecturePage } from './ArchitecturePage';
import {
  Layers, CheckCircle2, ShieldCheck, Code2, Cpu,
} from 'lucide-react';

export function ArtifactsHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'user_stories';

  const tabs = [
    { id: 'user_stories', label: 'User Stories (UC-02)', icon: Layers },
    { id: 'acceptance_criteria', label: 'Gherkin Acceptance Criteria (UC-03)', icon: CheckCircle2 },
    { id: 'test_cases', label: 'Test Cases & Automation (UC-04)', icon: ShieldCheck },
    { id: 'api_spec', label: 'OpenAPI 3.1 Spec (UC-05)', icon: Code2 },
    { id: 'architecture', label: 'Architecture Recommendations (UC-06)', icon: Cpu },
  ];

  return (
    <div className="space-y-6">
      {/* Top Level Artifact Hub Nav Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Workspace Panel */}
      <div>
        {currentTab === 'user_stories' && <UserStoriesPage />}
        {currentTab === 'acceptance_criteria' && <AcceptanceCriteriaPage />}
        {currentTab === 'test_cases' && <TestCasesPage />}
        {currentTab === 'api_spec' && <ApiSpecPage />}
        {currentTab === 'architecture' && <ArchitecturePage />}
      </div>
    </div>
  );
}
