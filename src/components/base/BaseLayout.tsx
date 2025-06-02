import React from 'react';
import { Helmet } from 'react-helmet-async';
import NavbarOption from '../base/Navbar';
import { useAuth } from '../AuthContext';
import { clearTokens } from '../../utils/authUtils';
import { useNavigate } from 'react-router-dom';


type LayoutProps = {
  title: string
  children: React.ReactNode
}

const Layout = ({ title, children }: LayoutProps) => {
  const { isAuthenticated, setIsAuthenticated } = useAuth(); // Get auth state from context
  const navigate = useNavigate();

  const handleLogout = () => {
    clearTokens(); // Clear tokens from localStorage
    setIsAuthenticated(false); // Update auth state in context
    navigate('/'); // Redirect to main page
  };

  const navbarOptions = (
    <>
      <NavbarOption label="Commands" url="/commands" /> {/* Always visible */}

      {isAuthenticated && ( // Only show if authenticated
        <>
          <NavbarOption label="Add command" url="/add-command" />
          <NavbarOption label="Upload CSV commands" url="/upload-commands-csv" />
        </>
      )}

      {isAuthenticated && ( // Show Logout if authenticated
        <NavbarOption label="Logout" onClick={handleLogout} url="" /> // Use onClick for logout
      )}
    </>
  );

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="stylesheet"
          href="https://bootswatch.com/5/lux/bootstrap.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
        />
        <script
          src="https://code.jquery.com/jquery-3.7.1.min.js"
          defer
        ></script>
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
          defer
        ></script>
      </Helmet>

      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className='container-fluid'>
          <a className="navbar-brand main-heading ps-4" href="/">
            Pxosys
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNavDropdown"
            aria-controls="navbarNavDropdown"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse text-center" id="navbarNavDropdown">
            <ul className="navbar-nav ms-auto">
              {navbarOptions}
            </ul>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  )
}

export default Layout
