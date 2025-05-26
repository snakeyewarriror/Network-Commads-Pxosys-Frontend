// src/pages/UploadCommandsPage.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../base/BaseLayout';
import CommandUploadForm from '../forms/CommandCSVUploadForm'; // Ensure this path is correct
import '../../css/BrowseCommands.css';
import { toast } from 'react-toastify';

const UploadCommandsPage: React.FC = () => {
  const navigate = useNavigate();

  // Change this line: now accepts a message string
  const handleUploadSuccess = (message: string) => {
    toast.success(message + '\n\nRedirecting to commands list.'); // Use the passed message
    navigate('/commands'); // Redirect back to the browse commands page
  };
  return (
    <Layout title="Upload Commands">
      <div className="container browse-commands-container mt-4">
        <h2 className="text-center mb-4">Upload New Commands from CSV</h2>
        <div className="row justify-content-center">
          <div className="col-lg-8 col-md-10">
            {/* Pass the updated handleUploadSuccess */}
            <CommandUploadForm onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UploadCommandsPage;