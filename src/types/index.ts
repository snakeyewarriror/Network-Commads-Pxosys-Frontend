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

// And your filter input values
export interface filter_input_values {
  vendor__name: string;
  platform__name: string;
  tag__name: string;
  version: string;
}

export type FilterName = keyof filter_input_values;