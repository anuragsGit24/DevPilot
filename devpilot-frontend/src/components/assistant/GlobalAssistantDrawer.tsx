import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/date';
import {
  Sparkles,
  Send,
  Bot,
  X,
  Trash2,
  FileText,
  Layers,
  Cpu,
  Calendar,
  AlertTriangle,
  ChevronDown,
  Minimize2,
  Maximize2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface GlobalAssistantDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function GlobalAssistantDrawer({ isOpen: controlledIsOpen, onClose: controlledOnClose }: GlobalAssistantDrawerProps = {}) {
  const { user } = useAuth();
  const {
    activeProject,
    requirements,
    userStories,
    sprints,
    architecture,
    assistantConversation,
    sendAssistantMessage,
    isProcessing,
  } = useProjectData();

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = controlledOnClose !== undefined ? (open: boolean) => { if (!open) controlledOnClose(); } : setInternalIsOpen;

  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messages = assistantConversation?.messages ?? [];
  const activeSprint = sprints.find((s) => s.status === 'active') || sprints[0];

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen && chatEndRef.current && typeof chatEndRef.current.scrollIntoView === 'function') {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing.assistantTyping, isOpen]);

  // Global keyboard shortcut: Cmd+K or Ctrl+K to toggle drawer, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing.assistantTyping) return;
    const text = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await sendAssistantMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleChipClick = async (promptText: string) => {
    if (isProcessing.assistantTyping) return;
    await sendAssistantMessage(promptText);
  };

  const promptSuggestions = [
    {
      title: 'Summarize Requirements',
      icon: FileText,
      query: `Summarize the key functional and security requirements for project "${activeProject.name || 'this workspace'}".`,
    },
    {
      title: 'Analyze Contradictions',
      icon: AlertTriangle,
      query: 'Are there any specification contradictions or security policy conflicts in our requirements?',
    },
    {
      title: 'INVEST Story Review',
      icon: Layers,
      query: 'Evaluate our user stories against the INVEST quality standard and highlight any gaps.',
    },
    {
      title: 'Sprint Capacity Status',
      icon: Calendar,
      query: 'What is our current sprint allocation, capacity velocity, and any backlog overflow risks?',
    },
    {
      title: 'Architecture Blueprint',
      icon: Cpu,
      query: 'Explain the recommended architecture pattern, database topology, and resilience trade-offs.',
    },
  ];

  return (
    <>
      {/* Floating Launcher Trigger (bottom-right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-navy-900 to-blue-600 hover:from-navy-800 hover:to-blue-500 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/25 border border-white/20"
          title="Open AI Co-Pilot (Cmd+K)"
          aria-label="Open AI Assistant"
        >
          <div className="relative">
            <Sparkles size={18} className="text-blue-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-navy-900" />
          </div>
          <span className="text-xs font-bold tracking-tight">AI Co-Pilot</span>
          <span className="hidden sm:inline-block text-2xs px-1.5 py-0.5 rounded bg-white/20 text-white font-mono">
            ⌘K
          </span>
        </button>
      )}

      {/* Drawer Overlay / Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sliding Drawer Container */}
      <div
        className={`fixed inset-y-0 right-0 z-50 bg-white shadow-2xl flex flex-col border-l border-slate-200 transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${isExpanded ? 'w-full sm:w-[720px]' : 'w-full sm:w-[480px]'}`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-navy-900 via-navy-800 to-blue-900 text-white flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0 text-blue-300">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-white truncate">DevPilot AI SDLC Co-Pilot</h2>
                <Badge variant="success" size="xs" dot>
                  Online
                </Badge>
              </div>
              <p className="text-2xs text-blue-200 truncate mt-0.5">
                Active Project: <span className="font-semibold text-white">{activeProject.name || 'Workspace'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors hidden sm:block"
              title={isExpanded ? 'Collapse width' : 'Expand width'}
            >
              {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Close drawer (Esc)"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Context Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 text-2xs text-slate-600 flex-shrink-0">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-0.5">
            <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
              <FileText size={12} className="text-blue-600" />
              <span>{requirements.length} Reqs</span>
            </span>
            <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
              <Layers size={12} className="text-purple-600" />
              <span>{userStories.length} Stories</span>
            </span>
            {activeSprint && (
              <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                <Calendar size={12} className="text-amber-600" />
                <span>{activeSprint.name}</span>
              </span>
            )}
            {architecture?.pattern && (
              <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                <Cpu size={12} className="text-emerald-600" />
                <span>{architecture.pattern}</span>
              </span>
            )}
          </div>
          <span className="text-slate-400 font-mono text-3xs">RAG v2.0</span>
        </div>

        {/* Message Thread Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="py-8 px-4 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                <Bot size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">How can I assist your SDLC today?</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  I have semantic access to your uploaded requirements, INVEST user stories, architecture blueprints,
                  and sprint schedules.
                </p>
              </div>

              {/* Quick suggestion buttons */}
              <div className="space-y-2 text-left pt-2">
                <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider px-1">
                  Suggested Context Actions
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {promptSuggestions.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleChipClick(item.query)}
                        className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition-all duration-150 shadow-xs group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Icon size={14} />
                          </div>
                          <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-900 truncate">
                            {item.title}
                          </span>
                        </div>
                        <ArrowRight size={13} className="text-slate-300 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {msg.sender === 'user' ? (
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-2xs flex-shrink-0 shadow-xs">
                    {user?.name?.[0] || 'U'}
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-navy-900 text-blue-400 flex items-center justify-center flex-shrink-0 shadow-xs border border-navy-700">
                    <Bot size={14} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-2 shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                  {/* Entity References / Citations */}
                  {msg.sourceArtifacts && msg.sourceArtifacts.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 mt-2 space-y-1">
                      <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 block">
                        Referenced Entities
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {msg.sourceArtifacts.map((art, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-3xs font-mono text-blue-700"
                          >
                            <FileText size={9} />
                            <span>[{art.id}]</span>
                            <span className="truncate max-w-[100px]">{art.title}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`text-3xs ${
                      msg.sender === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'
                    }`}
                  >
                    {formatDate(msg.timestamp, 'HH:mm')}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Assistant typing indicator */}
          {isProcessing.assistantTyping && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-navy-900 text-blue-400 flex items-center justify-center flex-shrink-0 shadow-xs border border-navy-700">
                <Bot size={14} />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3 shadow-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                <span className="text-2xs text-slate-500 ml-1 font-medium">Synthesizing context...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar Area */}
        <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0 space-y-2">
          {/* Quick chip bar when messages exist */}
          {messages.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => handleChipClick('What are the critical risks and mitigations?')}
                className="px-2 py-0.5 text-3xs rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 whitespace-nowrap transition-colors"
              >
                Risks & Mitigations
              </button>
              <button
                onClick={() => handleChipClick('Summarize sprint velocity allocation')}
                className="px-2 py-0.5 text-3xs rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 whitespace-nowrap transition-colors"
              >
                Sprint Velocity
              </button>
              <button
                onClick={() => handleChipClick('Show traceability coverage matrix status')}
                className="px-2 py-0.5 text-3xs rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 whitespace-nowrap transition-colors"
              >
                Traceability Score
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="relative flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about requirements, stories, architecture, sprints..."
              className="w-full resize-none rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs px-3.5 py-2.5 max-h-32 min-h-[42px] leading-relaxed shadow-2xs pr-10"
              disabled={isProcessing.assistantTyping}
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!input.trim() || isProcessing.assistantTyping}
              className="absolute right-1.5 bottom-1.5 h-7 w-7 !p-0 rounded-lg flex items-center justify-center flex-shrink-0"
              title="Send message (Enter)"
            >
              <Send size={13} />
            </Button>
          </form>
          <div className="flex items-center justify-between px-1 text-3xs text-slate-400">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span className="font-mono">DevPilot AI v1.0</span>
          </div>
        </div>
      </div>
    </>
  );
}
