import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../base/BaseLayout';
import CommandUploadForm from '../forms/CommandCSVUploadForm';
import '../../css/BrowseCommands.css';

const UploadCsvPage: React.FC = () => {

  const navigate = useNavigate();

  const handleUploadSuccess = (resultData: any) => {
    navigate('/upload-results', { state: { uploadResult: resultData } });
  };

  return (
    <Layout title="Upload Commands">
      <div className="container browse-commands-container mt-4">

        <h2 className="text-center mb-4">Upload New Commands from CSV</h2>

        <div className="row justify-content-center">
          
          <div className="col-lg-8 col-md-10">
            <CommandUploadForm onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UploadCsvPage;