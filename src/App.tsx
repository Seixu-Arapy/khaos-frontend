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
import ComponentsGalleryPage from './pages/dev/ComponentsGalleryPage';

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
        {import.meta.env.DEV && (
          <Route path="/dev/components" element={<ComponentsGalleryPage />} />
        )}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
