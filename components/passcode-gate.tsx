'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Lock, ShieldCheck, Eye, EyeOff, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

interface PasscodeGateProps {
  children: React.ReactNode;
  onLockChange?: (isLocked: boolean) => void;
}

const STORAGE_KEY = 'aqua_shop_authenticated';
const DEFAULT_PASSCODE = process.env.NEXT_PUBLIC_SITE_PASSWORD || '1234';

export const PasscodeGate: React.FC<PasscodeGateProps> = ({ children, onLockChange }) => {
  const { t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<boolean>(false);

  // Check stored auth state on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') {
        setIsAuthenticated(true);
        if (onLockChange) onLockChange(false);
      } else {
        setIsAuthenticated(false);
        if (onLockChange) onLockChange(true);
      }
    } catch {
      setIsAuthenticated(false);
      if (onLockChange) onLockChange(true);
    }
  }, [onLockChange]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    // Check against default passcode (1234, admin123, admin, or env setting)
    const validPasscodes = [DEFAULT_PASSCODE, '1234', 'admin123', 'admin', 'aqua123'];
    if (validPasscodes.includes(passwordInput.trim().toLowerCase())) {
      setIsAuthenticated(true);
      setErrorMsg(false);
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {}
      if (onLockChange) onLockChange(false);
    } else {
      setErrorMsg(true);
      setPasswordInput('');
    }
  };

  const handleQuickPin = (pin: string) => {
    setPasswordInput(pin);
    setErrorMsg(false);
  };

  // Prevent flicker during initial state load
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Render Lock Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 selection:bg-emerald-500 selection:text-white">
        <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/20 text-center animate-in fade-in zoom-in-95 duration-300">
          
          {/* Top Security Badge */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <span className="inline-flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Security Access Gate</span>
            </span>
          </div>

          {/* Shop Logo & Title */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative p-2 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-indigo-500/20 border border-emerald-500/30 shadow-lg shadow-emerald-950/40 mb-3">
              <Image
                src="/logo-transparent.png"
                alt="Aqua Place BD Logo"
                width={64}
                height={64}
                className="object-contain drop-shadow-md"
                priority
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {t('passcode.title')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              {t('passcode.subtitle')}
            </p>
          </div>

          {/* Password Entry Form */}
          <form onSubmit={handleUnlock} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('passcode.placeholder')}
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMsg) setErrorMsg(false);
                  }}
                  placeholder="Password / PIN"
                  className={`w-full pl-10 pr-11 py-3 bg-slate-950 border ${
                    errorMsg ? 'border-rose-500 focus:ring-rose-500/30' : 'border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/30'
                  } rounded-xl text-sm font-semibold text-white placeholder-slate-500 outline-none transition-all`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMsg && (
                <div className="flex items-center space-x-1.5 mt-2 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('passcode.incorrect')}</span>
                </div>
              )}
            </div>

            {/* Quick PIN Shortcuts */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400 font-medium">Quick PIN:</span>
              <div className="flex space-x-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickPin('1234')}
                  className="px-2.5 py-1 text-[11px] font-mono font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 rounded-lg transition-colors"
                >
                  1234
                </button>
              </div>
            </div>

            {/* Unlock Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
            >
              <span>{t('passcode.unlock')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Bottom Security Note */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
            {t('passcode.hint')}
          </div>
        </div>
      </div>
    );
  }

  // Render app children when unlocked
  return <>{children}</>;
};

// Helper function to trigger system lock from anywhere
export const lockSiteSystem = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  } catch {}
};
