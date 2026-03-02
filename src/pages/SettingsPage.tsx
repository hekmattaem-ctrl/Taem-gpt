import React from 'react';
import { motion } from 'motion/react';
import { 
  Sun, Moon, Monitor, User, Bell, Shield, 
  Trash2, Download, LogOut, ChevronRight, 
  Globe, Zap, MessageSquare, Sparkles 
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Appearance',
      icon: <Sun size={20} />,
      items: [
        {
          label: 'Theme',
          description: 'Choose your interface style',
          component: (
            <div className="flex bg-zinc-800 p-1 rounded-xl">
              {[
                { id: 'light', icon: <Sun size={14} />, label: 'Light' },
                { id: 'dark', icon: <Moon size={14} />, label: 'Dark' },
                { id: 'system', icon: <Monitor size={14} />, label: 'System' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as any)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    theme === t.id 
                      ? 'bg-zinc-700 text-white shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          )
        },
        {
          label: 'Accent Color',
          description: 'Personalize your primary color',
          component: (
            <div className="flex gap-2">
              {['bg-zinc-900', 'bg-blue-600', 'bg-emerald-600', 'bg-violet-600'].map((color) => (
                <button key={color} className={`w-6 h-6 rounded-full ${color} border-2 border-zinc-800 shadow-sm`} />
              ))}
            </div>
          )
        }
      ]
    },
    {
      title: 'AI Configuration',
      icon: <Sparkles size={20} />,
      items: [
        {
          label: 'Personality',
          description: 'How Taem should respond to you',
          component: (
            <div className="flex bg-zinc-800 p-1 rounded-xl">
              {['Concise', 'Detailed', 'Creative'].map((p) => (
                <button
                  key={p}
                  onClick={() => updateUser({ 
                    preferences: { 
                      ...user?.preferences, 
                      personality: p === 'Concise' ? 'Concise & Direct' : p === 'Detailed' ? 'Detailed & Explanatory' : 'Creative & Playful'
                    } 
                  })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    (user?.preferences?.personality || 'Concise & Direct').startsWith(p)
                      ? 'bg-zinc-700 text-white shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )
        },
        {
          label: 'Language',
          description: 'Preferred response language',
          component: (
            <div className="flex bg-zinc-800 p-1 rounded-xl overflow-x-auto max-w-[240px] scrollbar-hide">
              {['English', 'Arabic', 'Spanish', 'French', 'German', 'Japanese'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => updateUser({ 
                    preferences: { 
                      ...user?.preferences, 
                      language: lang === 'English' ? 'English (US)' : lang 
                    } 
                  })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    (user?.preferences?.language || 'English (US)').startsWith(lang)
                      ? 'bg-zinc-700 text-white shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )
        }
      ]
    },
    {
      title: 'Account & Security',
      icon: <Shield size={20} />,
      items: [
        {
          label: 'Profile',
          description: user?.email || 'Not signed in',
          component: <User size={18} className="text-zinc-400" />
        },
        {
          label: 'Two-Factor Auth',
          description: 'Add an extra layer of security',
          component: <div className="w-10 h-5 bg-zinc-700 rounded-full relative cursor-pointer"><div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" /></div>
        }
      ]
    },
    {
      title: 'Data Management',
      icon: <Trash2 size={20} />,
      items: [
        {
          label: 'Export Data',
          description: 'Download your chat history',
          component: <Download size={18} className="text-zinc-400 cursor-pointer hover:text-white" />
        },
        {
          label: 'Clear All Chats',
          description: 'This action cannot be undone',
          component: <button className="text-xs font-semibold text-red-500 hover:text-red-600">Clear</button>
        }
      ]
    }
  ];

  return (
    <div className="flex flex-col h-screen bg-zinc-950 max-w-4xl mx-auto shadow-2xl overflow-hidden">
      <header className="px-6 py-6 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ChevronRight className="rotate-180" size={20} />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>
        <button 
          onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-2 px-4 py-2 bg-red-900/20 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-900/30 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        {sections.map((section, idx) => (
          <motion.section 
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-zinc-500 uppercase tracking-widest text-[10px] font-bold px-1">
              {section.icon}
              {section.title}
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-800">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between p-5 hover:bg-zinc-800/50 transition-colors">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-zinc-100">{item.label}</div>
                    <div className="text-xs text-zinc-400">{item.description}</div>
                  </div>
                  {item.component}
                </div>
              ))}
            </div>
          </motion.section>
        ))}
      </main>

      <footer className="p-6 text-center">
        <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">
          Taem v1.0.4 • Built with Gemini 3 Flash
        </p>
      </footer>
    </div>
  );
}
