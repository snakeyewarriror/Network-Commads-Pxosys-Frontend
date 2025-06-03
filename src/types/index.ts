// src/types/index.d.ts

export interface Command {
  id: number;
  command: string;
  description: string | null;
  example: string | null;
  version: string | null;
  vendor: string;
  platform: string | null;
  tag: string | null;
}

// You can add other shared interfaces here too, e.g.:
export interface DropdownItem {
  id: number;
  name: string;
}

export interface TagTreeItem {
  id: number;
  name: string;
  children: TagTreeItem[];
}

export interface PagedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}


export interface filter_input_values {
  vendor__name: string;
  platform__name: string;
  tag__name: string;
  version: string;
}

export type FilterName = keyof filter_input_values;



export interface UploadSuccessData {
  message: string;
  data: {
    vendor_name: string;
    main_tag_name: string;
    summary: {
      total_commands_in_csv: number;
      commands_created?: number;
      commands_updated?: number;
      commands_skipped?: number;
      total_tags_in_csv: number;
      tags_created: number;
    };
    details: {
      created_commands?: { command: string; description: string; tag: string; status: string }[];
      updated_commands?: { command: string; description: string; tag: string; status: string }[];
      skipped_commands?: { command: string; reason: string; status: string }[];
      created_tags?: { name: string; parent: string | null; status: string }[];
    };
  };
}
