import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Layouts
import { CustomerLayout } from './layouts/CustomerLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Customer Pages
import { WorkoutDashboard } from './pages/customer/WorkoutDashboard';
import { ActiveWorkoutPage } from './pages/customer/ActiveWorkoutPage';
import { ProgressPage } from './pages/customer/ProgressPage';
import { JourneyPage } from './pages/customer/JourneyPage';
import { ProfilePage } from './pages/customer/ProfilePage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CustomersPage } from './pages/admin/CustomersPage';
import { ProgramsPage } from './pages/admin/ProgramsPage';
import { ExercisesPage } from './pages/admin/ExercisesPage';
import { LevelsPage } from './pages/admin/LevelsPage';

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Customer Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRole="CUSTOMER">
                <CustomerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<WorkoutDashboard />} />
            <Route path="workout/active" element={<ActiveWorkoutPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="journey" element={<JourneyPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="ADMIN">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="programs" element={<ProgramsPage />} />
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="levels" element={<LevelsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
