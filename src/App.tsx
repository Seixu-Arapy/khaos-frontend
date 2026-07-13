import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import CalendarPage from './pages/CalendarPage';
import TagsPage from './pages/TagsPage';
import AssistantPage from './pages/AssistantPage';
import RoutinesPage from './pages/RoutinesPage';
import VaultIndexPage from './pages/dev/VaultIndexPage';
import PantheonPage from './pages/dev/PantheonPage';
import ChorusPage from './pages/dev/ChorusPage';
import WellspringPage from './pages/dev/WellspringPage';
import SigilsPage from './pages/dev/SigilsPage';
import ForgePage from './pages/dev/ForgePage';
import ThresholdPage from './pages/dev/ThresholdPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/tags" element={<TagsPage />} />
        <Route path="/routines" element={<RoutinesPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
      </Route>
      {import.meta.env.DEV && (
        <>
          <Route path="/dev/vault" element={<VaultIndexPage />} />
          <Route path="/dev/vault/pantheon" element={<PantheonPage />} />
          <Route path="/dev/vault/chorus" element={<ChorusPage />} />
          <Route path="/dev/vault/wellspring" element={<WellspringPage />} />
          <Route path="/dev/vault/sigils" element={<SigilsPage />} />
          <Route path="/dev/vault/forge" element={<ForgePage />} />
          <Route path="/dev/vault/threshold" element={<ThresholdPage />} />
        </>
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
