import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Administrators from "./pages/Administrators";
import Meetings from "./pages/Meetings";
import MeetingDetail from "./pages/MeetingDetail";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Announcements from "./pages/Announcements";
import AuditLogs from "./pages/AuditLogs";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/administrators" element={<Administrators />} />
        <Route path="/meetings" element={<Meetings />} />
        <Route path="/meetings/:meetingId" element={<MeetingDetail />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:eventId" element={<EventDetail />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
      </Route>
    </Routes>
  );
}
