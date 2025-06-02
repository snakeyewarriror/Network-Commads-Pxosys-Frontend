// src/utils/exportUtils.ts
import { toast } from 'react-toastify';
import type { Command, DropdownItem } from '../types';

interface ExportOptions {
  commandsToExport: Command[];
  fileName: string;
  vendorNameForHeader?: string; // Optional: used to determine header logic
  allVendors: DropdownItem[]; // Needed to find vendor by name for header logic
}

export const exportCommandsToFile = async ({
  commandsToExport,
  fileName,
  vendorNameForHeader,
  allVendors,
}: ExportOptions): Promise<boolean> => {
  if (commandsToExport.length === 0) {
    toast.warn('No commands found for export.');
    return false;
  }

  let fileHeader = '';

  if (vendorNameForHeader) {
    const selectedVendor = allVendors.find(v => v.name === vendorNameForHeader);
    if (selectedVendor) {
      switch (selectedVendor.name.toLowerCase()) {

        case 'cisco':
          fileHeader = 'configure terminal\n';
          break;

        case 'juniper':
          fileHeader = 'edit\n';
          break;

        default:
          fileHeader = '';
          break;
      }
    }
  }

  const joinedCommands = commandsToExport.map(cmd => cmd.command).join('\n');
  const fileContent = fileHeader + joinedCommands;

  try {
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href); // Clean up the URL object

    toast.success(`'${fileName}' downloaded successfully!`);
    return true;
  }
  catch (error) {
    console.error('Error during command export:', error);
    toast.error('Failed to export commands. Please try again.');
    return false;
  }
};