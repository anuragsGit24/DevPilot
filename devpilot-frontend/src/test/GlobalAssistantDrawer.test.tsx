import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { GlobalAssistantDrawer } from '../components/assistant/GlobalAssistantDrawer';
import { ToastProvider } from '../app/providers/ToastProvider';

const mockSendMessage = vi.fn();

vi.mock('../app/providers/ProjectDataProvider', () => ({
  useProjectData: () => ({
    activeProject: { id: 'proj-001', name: 'Retail Banking System' },
    requirements: [
      { id: 'REQ-001', title: 'Biometric Authentication', priority: 'must', category: 'security' },
    ],
    userStories: [
      { id: 'US-001', title: 'Face ID Login', storyPoints: 5, userRole: 'Customer', action: 'log in with biometric' },
    ],
    sprints: [
      { id: 'sprint-1', name: 'Sprint 1', status: 'active', goal: 'Core Auth', capacityStoryPoints: 30, allocatedStoryPoints: 20 },
    ],
    architecture: { pattern: 'Modular Monolith' },
    assistantConversation: {
      messages: [
        { id: 'm1', sender: 'assistant', text: 'Hello Engineer! How can I assist your SDLC today?', timestamp: new Date().toISOString() },
      ],
    },
    sendAssistantMessage: mockSendMessage,
    isProcessing: { assistantTyping: false },
  }),
}));

vi.mock('../app/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', name: 'Dev Engineer' },
  }),
}));

describe('GlobalAssistantDrawer (Engineer 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders floating assistant trigger button when closed', () => {
    render(
      <ToastProvider>
        <GlobalAssistantDrawer />
      </ToastProvider>
    );

    const trigger = screen.getByTitle('Open AI Co-Pilot (Cmd+K)');
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText('AI Co-Pilot')).toBeInTheDocument();
  });

  it('opens drawer and displays active project context when launcher clicked', () => {
    render(
      <ToastProvider>
        <GlobalAssistantDrawer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTitle('Open AI Co-Pilot (Cmd+K)'));

    expect(screen.getByText('DevPilot AI SDLC Co-Pilot')).toBeInTheDocument();
    expect(screen.getByText('Retail Banking System')).toBeInTheDocument();
    expect(screen.getByText('Hello Engineer! How can I assist your SDLC today?')).toBeInTheDocument();
  });

  it('allows user to type a question and submit it', async () => {
    render(
      <ToastProvider>
        <GlobalAssistantDrawer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTitle('Open AI Co-Pilot (Cmd+K)'));

    const input = screen.getByPlaceholderText(/Ask anything about requirements/i);
    fireEvent.change(input, { target: { value: 'What is our active sprint capacity?' } });

    const sendBtn = screen.getByTitle('Send message (Enter)');
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('What is our active sprint capacity?');
    });
  });

  it('closes drawer when close button is clicked', () => {
    render(
      <ToastProvider>
        <GlobalAssistantDrawer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTitle('Open AI Co-Pilot (Cmd+K)'));
    expect(screen.getByText('DevPilot AI SDLC Co-Pilot')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Close drawer (Esc)'));
    expect(screen.getByTitle('Open AI Co-Pilot (Cmd+K)')).toBeInTheDocument();
  });
});

