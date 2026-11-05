import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/date';
import {
  Sparkles, Send, Bot, FileText,
} from 'lucide-react';

export function AssistantPage() {
  const { assistantConversation, sendAssistantMessage, isProcessing } = useProjectData();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => assistantConversation?.messages ?? [], [assistantConversation?.messages]);

  useEffect(() => {
    if (messages.length || isProcessing.assistantTyping) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing.assistantTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing.assistantTyping) return;
    const text = input;
    setInput('');
    try { await sendAssistantMessage(text); } catch { setInput(text); }
  };

  const handleSuggestion = async (query: string) => {
    if (isProcessing.assistantTyping) return;
    try { await sendAssistantMessage(query); } catch { /* The provider displays the error. */ }
  };

  return (
    <div className="assistant-page w-full flex-1 min-h-[460px] flex flex-col gap-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">Project assistant</h1>

            </div>
            <p className="text-xs text-slate-500">Context grounded on active project specifications and artifacts</p>
          </div>
        </div>
      </div>

      {/* Chat Messages Scroll Container */}
      <div className="assistant-thread flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 bg-white rounded-xl border border-slate-200 shadow-sm scrollbar-thin">
        {messages.length === 0 && !isProcessing.assistantTyping && (
          <div className="flex min-h-full items-center justify-center py-10">
            <div className="max-w-lg w-full text-center">
              <Bot size={28} className="mx-auto text-slate-500 mb-4" />
              <h2 className="text-slate-900">What would you like to work on?</h2>
              <p className="text-sm text-slate-500 mt-2">Ask about this project’s requirements, stories, or sprint plan.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 text-left">
                {['Summarize requirements', 'Show requirements awaiting review', 'Review acceptance criteria', 'Summarize sprint capacity'].map((question) => (
                  <button key={question} type="button" onClick={() => void handleSuggestion(question)} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 hover:bg-slate-100">{question}</button>
                ))}
              </div>
            </div>
          </div>
        )}
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
              className={`max-w-[min(85%,900px)] break-words rounded-xl p-4 text-xs leading-relaxed space-y-2 shadow-sm ${
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
              <span className="ml-1 text-2xs">Preparing a response…</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Queries Chips */}
      {messages.length > 0 && <div className="flex flex-wrap items-center gap-2 shrink-0">
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
      </div>}

      {/* Message Input Form */}
      <form onSubmit={handleSend} className="flex gap-2 shrink-0">
        <input
          type="text"
          aria-label="Message the project assistant"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this project…"
          className="form-input text-sm py-3 flex-1 min-w-0 rounded-lg"
          disabled={isProcessing.assistantTyping}
        />
        <Button
          type="submit"
          variant="primary"
          className="rounded-lg px-4"
          disabled={!input.trim() || isProcessing.assistantTyping}
          icon={<Send size={15} />}
        >
          Send
        </Button>
      </form>
    </div>
  );
}
