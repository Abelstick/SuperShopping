import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '@/shared/components/Layout/AppLayout'
import ProtectedRoute from '@/shared/components/ProtectedRoute'

import LoginPage from '@/features/auth/pages/LoginPage'
import RegisterPage from '@/features/auth/pages/RegisterPage'
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage'
import ProfilePage from '@/features/auth/pages/ProfilePage'

import DashboardPage from '@/features/dashboard/pages/DashboardPage'

import WorkspacesPage from '@/features/workspace/pages/WorkspacesPage'
import WorkspaceSettingsPage from '@/features/workspace/pages/WorkspaceSettingsPage'

import InventoryPage from '@/features/inventory/pages/InventoryPage'

import BudgetsPage from '@/features/budgets/pages/BudgetsPage'
import BudgetDetailPage from '@/features/budgets/pages/BudgetDetailPage'

import ShoppingModePage from '@/features/shopping/pages/ShoppingModePage'

import PurchasesPage from '@/features/purchases/pages/PurchasesPage'
import PurchaseDetailPage from '@/features/purchases/pages/PurchaseDetailPage'

export const router = createBrowserRouter([
  {
    path: '/auth/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/register',
    element: <RegisterPage />,
  },
  {
    path: '/auth/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'profile', element: <ProfilePage /> },

      { path: 'workspaces', element: <WorkspacesPage /> },
      { path: 'workspace/settings', element: <WorkspaceSettingsPage /> },

      { path: 'inventory', element: <InventoryPage /> },

      { path: 'budgets', element: <BudgetsPage /> },
      { path: 'budgets/:budgetId', element: <BudgetDetailPage /> },

      { path: 'shopping/new', element: <ShoppingModePage /> },
      { path: 'shopping/:sessionId', element: <ShoppingModePage /> },

      { path: 'purchases', element: <PurchasesPage /> },
      { path: 'purchases/:purchaseId', element: <PurchaseDetailPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
