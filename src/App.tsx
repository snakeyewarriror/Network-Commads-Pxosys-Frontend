import './App.css';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


import Login from './components/pages/Login'
import Register from './components/pages/Register'
import HomePage from './components/pages/HomePage'
import NotFound from './components/pages/NotFound'
import ProtectedRoute from './components/ProtectRoute'
import BrowseCommands from './components/pages/BrowseCommands.tsx'
import UploadCommandsPage from './components/pages/UploadCommandsPage.tsx';
import AddCommandPage from './components/pages/AddCommand.tsx';

const router = createBrowserRouter([
    {
      path: '/',
      element:(
        <HomePage />
      ),
      errorElement: <NotFound />,
    },

    {
      path: '/commands',
      element: <BrowseCommands />,
      errorElement: <NotFound />,
    },

    {
      path: '/login',
      element: <Login />,
    },

    {
      path: '/register',
      element: <RegisterAndLogout />,
    },

    {
      path: '/logout',
      element: <Logout />,
    },

    {
      path: '/upload-commands-csv',
      element: 
      <ProtectedRoute>
        <UploadCommandsPage />
      </ProtectedRoute>,
      errorElement: <NotFound />,
    },

    {
      path: '/add-command',
      element: 
      <ProtectedRoute>
        <AddCommandPage />
      </ProtectedRoute>,
      errorElement: <NotFound />,
    },

    {
      path: '*', // Catch-all for undefined routes
      element: <NotFound />,
    },
]);
  


function Logout() {
  localStorage.clear()
  return <Navigate to="/login" />
}

function RegisterAndLogout() {
  localStorage.clear()
  return <Register />
}


function App() {

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer position="top-right" autoClose={2000} />
    </>
  )
}

export default App
