import React, { useState, useRef, useEffect } from 'react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Misc';
import { formatDate } from '@/lib/date';
import {
  Sparkles, Send, Bot, User, CornerDownLeft,
  FileText, Layers, Shield, RefreshCw,
} from 'lucide-react';

export function AssistantPage() {
  const { assistantConversation, sendAssistantMessage, isProcessing } = useProjectData();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const messages = assistantConversation?.messages ?? [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing.assistantTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing.assistantTyping) return;
    const text = input;
    setInput('');
    await sendAssistantMessage(text);
  };

  const handleSuggestion = async (query: string) => {
    if (isProcessing.assistantTyping) return;
    await sendAssistantMessage(query);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">DevPilot AI SDLC Assistant (UC-14)</h1>
              <Badge variant="success" size="xs" dot>Connected</Badge>
            </div>
            <p className="text-xs text-slate-500">Context grounded on active project specifications and artifacts</p>
          </div>
        </div>
      </div>

      {/* Chat Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white rounded-xl border border-slate-200 shadow-sm scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {msg.sender === 'user' ? (
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                U
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-navy-900 text-blue-400 flex items-center justify-center flex-shrink-0">
                <Bot size={16} />
              </div>
            )}

            <div
              className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed space-y-2 shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* Citations and Linked Artifacts */}
              {msg.sourceArtifacts && msg.sourceArtifacts.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60 mt-2 space-y-1">
                  <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 block">
                    Referenced Project Entities
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sourceArtifacts.map((art, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-2xs font-mono text-blue-700"
                      >
                        <FileText size={10} />
                        <span>[{art.id}]</span>
                        <span className="truncate max-w-[120px]">{art.title}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={`text-2xs ${
                  msg.sender === 'user' ? 'text-blue-100 text-right' : 'text-slate-400'
                }`}
              >
                {formatDate(msg.timestamp, 'HH:mm')}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isProcessing.assistantTyping && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-navy-900 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none p-3 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1 text-2xs">Cross-referencing SDLC graph...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Queries Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-2xs text-slate-400 font-semibold uppercase flex-shrink-0">Suggested:</span>
        {[
          'Summarize this project’s current requirements',
          'Show requirements awaiting review',
          'Which stories still need acceptance criteria?',
          'Summarize current sprint capacity',
        ].map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSuggestion(sug)}
            className="text-2xs px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 whitespace-nowrap transition-colors shadow-2xs"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask DevPilot anything about requirements, user stories, OpenAPI endpoints, or sprint capacity..."
          className="form-input text-xs py-3 flex-1 rounded-xl shadow-sm"
          disabled={isProcessing.assistantTyping}
        />
        <Button
          type="submit"
          variant="primary"
          className="rounded-xl px-5"
          disabled={!input.trim() || isProcessing.assistantTyping}
          icon={<Send size={15} />}
        >
          Send
        </Button>
      </form>
    </div>
  );
}
