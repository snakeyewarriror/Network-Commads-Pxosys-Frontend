import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../base/BaseLayout';
import '../../css/BrowseCommands.css';
import { toast } from 'react-toastify';

// Imports for interfaces and types
import type {
  UploadSuccessData
} from '../../types/index';


// Function to format the data that is sent to the csv and txt
const getFormattedContent = (
  uploadSuccessData: UploadSuccessData,
  format: 'csv' | 'txt'
): string => {
  const { data } = uploadSuccessData;
  const { vendor_name, main_tag_name, summary, details } = data;

  console.log(data);

  let content = '';

  const EOL = '\n'; // End of line character, common for both
  
  // Helper for CSV escaping
  const csvEscape = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const strValue = String(value);

    // If the value contains a comma, double quote, or newline, wrap it in double quotes
    if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
      return `"${strValue.replace(/"/g, '""')}"`;
    }

    return strValue;
  };

  // Helper for TXT formatting with labels and indentation
  const txtFormatLabelValue = (label: string, value: string | number | null | undefined, indent: number = 0): string => {
    const prefix = ' '.repeat(indent);
    return `${prefix}${label}: ${value === null || value === undefined || value === '' ? 'N/A' : value}`;
  };

  // General Info Section
  if (format === 'csv') {
    content += `Upload Results for Vendor,${csvEscape(vendor_name)}${EOL}`;
    content += `Main Tag (CSV Parent),${csvEscape(main_tag_name)}${EOL}${EOL}`;
  }
  else { // txt
    content += `Upload Results for Vendor: ${vendor_name}${EOL}`;
    content += `Main Tag (CSV Parent): ${main_tag_name}${EOL}${EOL}`;
  }

  // Summary Section
  if (format === 'csv') {
    content += `Summary:${EOL}`;
    content += `Total Commands in CSV,${summary.total_commands_in_csv}${EOL}`;
    content += `Commands Created,${summary.commands_created || 0}${EOL}`; // Use || 0 for optional fields
    content += `Commands Updated,${summary.commands_updated || 0}${EOL}`; 
    content += `Commands Skipped,${summary.commands_skipped || 0}${EOL}`;
    content += `Total Tags in CSV,${summary.total_tags_in_csv}${EOL}`
    content += `Tags Created,${summary.tags_created || 0}${EOL}${EOL}`;
  }

  else { // txt
    content += `--- Summary ---${EOL}`;
    content += txtFormatLabelValue("Total Commands in CSV", summary.total_commands_in_csv) + EOL;
    content += txtFormatLabelValue("Commands Created", summary.commands_created) + EOL;
    content += txtFormatLabelValue("Commands Updated", summary.commands_updated) + EOL;
    content += txtFormatLabelValue("Commands Skipped", summary.commands_skipped) + EOL;
    content += txtFormatLabelValue("Total Tags in CSV", summary.total_tags_in_csv) + EOL;
    content += txtFormatLabelValue("Tags Created", summary.tags_created) + EOL + EOL;
  }

  // Created Commands Section
  if (details.created_commands && details.created_commands.length > 0) {
    if (format === 'csv') {
      content += `Successfully Created Commands:${EOL}`;
      content += `Command,Description,Tag,Status${EOL}`;
      details.created_commands.forEach(cmd => {
        content += `${csvEscape(cmd.command)},${csvEscape(cmd.description)},${csvEscape(cmd.tag)},${csvEscape(cmd.status)}${EOL}`;
      });
      content += EOL;
    }

    else { // txt
      content += `--- Successfully Created Commands ---${EOL}`;
      details.created_commands.forEach((cmd, index) => {
        content += `  ${index + 1}. ${txtFormatLabelValue("Command", cmd.command)}${EOL}`;
        content += `     ${txtFormatLabelValue("Description", cmd.description, 5)}${EOL}`;
        content += `     ${txtFormatLabelValue("Tag", cmd.tag, 5)}${EOL}`;
        content += `     ${txtFormatLabelValue("Status", cmd.status, 5)}${EOL}`;
        content += `     ---${EOL}`;
      });
      content += EOL;
    }
  }

  // Skipped Commands Section
  if (details.skipped_commands && details.skipped_commands.length > 0) {
    if (format === 'csv') {
      content += `Skipped Commands:${EOL}`;
      content += `Command,Reason,Status${EOL}`;
      details.skipped_commands.forEach(cmd => {
        content += `${csvEscape(cmd.command)},${csvEscape(cmd.reason)},${csvEscape(cmd.status)}${EOL}`;
      });
      content += EOL;
    }
    else { // txt
      content += `--- Skipped Commands ---${EOL}`;
      details.skipped_commands.forEach((cmd, index) => {
        content += `  ${index + 1}. ${txtFormatLabelValue("Command", cmd.command)}${EOL}`;
        content += `     ${txtFormatLabelValue("Reason", cmd.reason, 5)}${EOL}`;
        content += `     ${txtFormatLabelValue("Status", cmd.status, 5)}${EOL}`;
        content += `     ---${EOL}`;
      });
      content += EOL;
    }
  }

  if (details.updated_commands && details.updated_commands.length > 0) {
    if (format === 'csv') {
      content += `Successfully Updated Commands:${EOL}`;
      content += `Command,Description,Tag,Status${EOL}`;
      details.updated_commands.forEach(cmd => {
        content += `${csvEscape(cmd.command)},${csvEscape(cmd.description)},${csvEscape(cmd.tag)},${csvEscape(cmd.status)}${EOL}`;
      });
      content += EOL;
    }
    
    else { // txt
      content += `--- Successfully Updated Commands ---${EOL}`;
      details.updated_commands.forEach((cmd, index) => {
        content += `  ${index + 1}. ${txtFormatLabelValue("Command", cmd.command)}${EOL}`;
        content += `     ${txtFormatLabelValue("Description", cmd.description, 5)}${EOL}`;
        content += `     ${txtFormatLabelValue("Tag", cmd.tag, 5)}${EOL}`;
        content += `     ${txtFormatLabelValue("Status", cmd.status, 5)}${EOL}`;
        content += `     ---${EOL}`;
      });
      content += EOL;
    }
  }

  // Created Tags Section
  if (details.created_tags && details.created_tags.length > 0) {
    if (format === 'csv') {
      content += `Created Tags:${EOL}`;
      content += `Tag Name,Parent,Status${EOL}`;
      details.created_tags.forEach(tag => {
        content += `${csvEscape(tag.name)},${csvEscape(tag.parent)},${csvEscape(tag.status)}${EOL}`;
      });
      content += EOL;
    }
    else { // txt
      content += `--- Created Tags ---${EOL}`;
      details.created_tags.forEach((tag, index) => {
        content += `  ${index + 1}. ${txtFormatLabelValue("Tag Name", tag.name)}${EOL}`;
        content += `     ${txtFormatLabelValue("Parent", tag.parent, 5)}${EOL}`;
        content += `     ${txtFormatLabelValue("Status", tag.status, 5)}${EOL}`;
        content += `     ---${EOL}`;
      });
      content += EOL;
    }
  }

  return content;
};

const UploadSuccessDatasPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { uploadResult } = location.state as { uploadResult: UploadSuccessData } || {};

    if (!uploadResult) {
        React.useEffect(() => {
        navigate('/upload-commands-csv', { replace: true });
        }, [navigate]);
        return null;
    }

    const { message, data } = uploadResult;
    const { vendor_name, main_tag_name, summary, details } = data;

    const renderStatusIcon = (status: string) => {
        switch (status) {
          case 'Created Successfully':
          case 'Updated Successfully':
            return <i className="bi bi-arrow-clockwise text-info me-2"></i>; // Bootstrap Info Icon
          case 'Created':
          case 'Created (Main Tag)':
          case 'Created (from Command Tag)':
            return <i className="bi bi-check-circle-fill text-success me-2"></i>; // Bootstrap Success Icon
          case 'Skipped':
            return <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>; // Bootstrap Warning Icon
          case 'Failed':
            return <i className="bi bi-x-circle-fill text-danger me-2"></i>; // Bootstrap Error Icon
          default:
            return null;
        }
    };
    

    const handleExportResults = (format: 'csv' | 'txt') => {
        if (!uploadResult) {
        toast.error('No upload results to export.');
        return;
        }

        const content = getFormattedContent(uploadResult, format);
        const mimeType = format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;';
        const filenameExtension = format === 'csv' ? '.csv' : '.txt';

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Upload_Results_${vendor_name}_${new Date().toISOString().slice(0,10)}${filenameExtension}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Layout title="Upload Results">
        <div className="container browse-commands-container mt-4">
            <h2 className="text-center mb-4">CSV Upload Results</h2>
            <div className="row justify-content-center">
            <div className="col-lg-10 col-md-12">
                <div className="card shadow-sm mb-4">
                <div className="card-header bg-primary text-white">
                    <h4>{message}</h4>
                </div>
                <div className="card-body">
                    <p><strong>Vendor:</strong> {vendor_name}</p>
                    <p><strong>Main Tag (CSV Parent):</strong> {main_tag_name}</p>

                    <h5 className="mt-4">Summary:</h5>
                    <ul>
                    <li>Total Commands in CSV: {summary.total_commands_in_csv}</li>
                    <li>Commands Created: {summary.commands_created || 0}</li>
                    <li>Commands Updated: {summary.commands_updated || 0}</li>
                    <li>Commands Skipped: {summary.commands_skipped || 0}</li>
                    <li>Total Tags in CSV: {summary.total_tags_in_csv}</li>
                    <li>Tags Created: {summary.tags_created || 0}</li>
                    </ul>

                    {/* Created commands */}
                    {details.created_commands && details.created_commands.length > 0 && (
                    <h5 className="mt-4">Successfully Created Commands:</h5>
                    )}

                    <ul className="list-group mb-3">
                    {details.created_commands && details.created_commands.map((cmd, index) => (
                        <li key={index} className="list-group-item d-flex align-items-center">
                        {renderStatusIcon(cmd.status)}
                        <div>
                            <strong>{cmd.command}</strong> (Tag: {cmd.tag})
                            <br />
                            <small>{cmd.description ? cmd.description.substring(0, 100) + '...' : 'No description'}</small>
                        </div>
                        </li>
                    ))}
                    </ul>

                    {/* Updated commands */}
                    {details.updated_commands && details.updated_commands.length > 0 && (
                    <h5 className="mt-4 text-info">Successfully Updated Commands:</h5>
                    )}
                    <ul className="list-group mb-3">
                    {details.updated_commands && details.updated_commands.map((cmd, index) => (
                        <li key={index} className="list-group-item list-group-item-info d-flex align-items-center">
                        {renderStatusIcon(cmd.status)}
                        <div>
                            <strong>{cmd.command}</strong> (Tag: {cmd.tag})
                            <br />
                            <small>{cmd.description ? cmd.description.substring(0, 100) + '...' : 'No description'}</small>
                        </div>
                        </li>
                    ))}
                    </ul>


                    {/* Skipped commands */}
                    {details.skipped_commands && details.skipped_commands.length > 0 && (
                    <h5 className="mt-4 text-warning">Skipped Commands:</h5>
                    )}
                    <ul className="list-group mb-3">
                    {details.skipped_commands && details.skipped_commands.map((cmd, index) => (
                        <li key={index} className="list-group-item list-group-item-warning d-flex align-items-center">
                        {renderStatusIcon(cmd.status)}
                        <div>
                            <strong>{cmd.command}</strong> - {cmd.reason}
                        </div>
                        </li>
                    ))}
                    </ul>

                    {/* Created tags */}
                    {details.created_tags && details.created_tags.length > 0 && (
                    <h5 className="mt-4">Created Tags:</h5>
                    )}
                    <ul className="list-group mb-3">
                    {details.created_tags && details.created_tags.map((tag, index) => (
                        <li key={index} className="list-group-item d-flex align-items-center">
                        {renderStatusIcon(tag.status)}
                        <div>
                            <strong>{tag.name}</strong> ({tag.status})
                            {tag.parent && <small className="ms-2 text-muted">Parent: {tag.parent}</small>}
                        </div>
                        </li>
                    ))}
                    </ul>

                    <div className="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
                    <button className="btn btn-success me-md-2" onClick={ () => handleExportResults('csv')}>
                    Export Results to CSV
                    </button>
                    <button className="btn btn-success me-md-2" onClick={() => handleExportResults('txt')}>
                    Export Results to TXT
                    </button>
                    <button className="btn btn-secondary me-md-2" onClick={() => navigate('/upload-commands-csv')}>
                        Upload Another CSV
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate('/commands')}>
                        Go to Commands List
                    </button>
                    </div>
                </div>
                </div>
            </div>
            </div>
        </div>
        </Layout>
    );
};

export default UploadSuccessDatasPage;