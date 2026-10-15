import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="bg-white rounded-2xl shadow-dialog border border-slate-200 overflow-hidden">
      <div className="px-8 pt-8 pb-6 border-b border-slate-100 text-center">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Password Recovery</h1>
        <p className="text-sm text-slate-500 mt-1">Enter your registered email to receive reset instructions</p>
      </div>

      <div className="p-8">
        {submitted ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
              <CheckCircle2 size={24} />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Check your inbox</h2>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              If an enterprise account matches <span className="font-semibold text-slate-800">{email}</span>, we have dispatched a simulated reset token.
            </p>
            <div className="pt-2">
              <Link to="/reset-password">
                <Button variant="primary" size="sm">
                  Proceed to Reset Screen
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Corporate Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon={<Mail size={16} />}
              placeholder="e.g. pm@devpilot.demo"
            />
            <Button type="submit" variant="primary" className="w-full justify-center" loading={loading}>
              Send Recovery Link
            </Button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium">
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
