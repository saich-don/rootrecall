'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { Dashboard } from './pages/dashboard';
import { IncidentsPage } from './pages/incidents';
import { IncidentWorkspace } from './pages/incident-workspace';
import { MemoryPage } from './pages/memory';
import { DemoPage } from './pages/demo';
import { SettingsPage } from './pages/settings';
import { AgentChatPage } from './pages/agent-chat';
import { FloatingAgentChat } from './floating-agent-chat';
import { ToastContainer } from './toast';
import { useAppStore } from '@/lib/store';

export type PageId = 'overview' | 'chat' | 'incidents' | 'incident' | 'memory' | 'demo' | 'settings';

export function AppShell() {
  const [currentPage, setCurrentPage] = useState<PageId>('overview');
  const [viewingIncidentId, setViewingIncidentId] = useState<string | null>(null);
  const setActiveIncident = useAppStore((s) => s.setActiveIncident);

  const navigateTo = (page: PageId) => {
    setCurrentPage(page);
    if (page !== 'incident') {
      setViewingIncidentId(null);
      setActiveIncident(null);
    }
  };

  const openIncident = (id: string) => {
    setViewingIncidentId(id);
    setActiveIncident(id);
    setCurrentPage('incident');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <Dashboard onNavigate={navigateTo} onOpenIncident={openIncident} />;
      case 'chat':
        return <AgentChatPage onOpenIncident={openIncident} onNavigate={navigateTo} />;
      case 'incidents':
        return <IncidentsPage onOpenIncident={openIncident} />;
      case 'incident':
        return viewingIncidentId ? (
          <IncidentWorkspace
            incidentId={viewingIncidentId}
            onBack={() => navigateTo('incidents')}
          />
        ) : (
          <IncidentsPage onOpenIncident={openIncident} />
        );
      case 'memory':
        return <MemoryPage />;
      case 'demo':
        return <DemoPage onOpenIncident={openIncident} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard onNavigate={navigateTo} onOpenIncident={openIncident} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} onNavigate={navigateTo} />
      <Topbar
        currentPage={currentPage}
        onNavigate={navigateTo}
        onOpenIncident={openIncident}
      />
      <main className="app-main">{renderPage()}</main>
      <FloatingAgentChat
        currentPage={currentPage}
        onNavigate={navigateTo}
        onOpenIncident={openIncident}
      />
      <ToastContainer />
    </div>
  );
}
