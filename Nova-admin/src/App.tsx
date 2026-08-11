import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './features/auth/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './app/ProtectedRoute';
import Layout from './components/Layout';
import Login from './features/auth/Login';
import Overview from './features/overview/Overview';
import Products from './features/products/Products';
import Orders from './features/orders/Orders';
import Customers from './features/customers/Customers';
import Posters from './features/posters/Posters';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            {/* Public login page */}
            <Route path="/login" element={<Login />} />

            {/* Protected dashboard routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRoles={['admin', 'staff']}>
                  <Layout>
                    <Overview />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute allowedRoles={['admin', 'staff']}>
                  <Layout>
                    <Products />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute allowedRoles={['admin', 'staff']}>
                  <Layout>
                    <Orders />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute allowedRoles={['admin', 'staff']}>
                  <Layout>
                    <Customers />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/posters"
              element={
                <ProtectedRoute allowedRoles={['admin', 'staff']}>
                  <Layout>
                    <Posters />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Fallback to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
