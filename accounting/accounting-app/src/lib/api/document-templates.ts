/**
 * Document Template API Client
 * Universal template system for cheques, invoices, binders, etc.
 */

import { apiConfig } from '@/lib/api-config';

export interface FieldPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  alignment?: 'left' | 'center' | 'right';
  format?: string;
  fieldType?: 'text' | 'line' | 'box' | 'micr' | 'static';
  lineWidth?: number;
  lineColor?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  underline?: boolean;
  border?: boolean;
  borderWidth?: number;
  textContent?: string;
}

export interface TemplateSection {
  id: string;
  name: string;
  heightInches: number;
  fieldPositions: Record<string, FieldPosition>;
}

export interface DocumentTemplate {
  id: number;
  clientId: number;
  documentType: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  sections: TemplateSection[];
  pageWidth: number;
  pageHeight: number;
  createdAt: string;
  updatedAt: string;
  uiPreferences?: {
    zoom?: number;
    showGrid?: boolean;
    snapToGrid?: boolean;
    activeSectionId?: string | null;
  };
}

export interface CreateDocumentTemplateRequest {
  documentType: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  sections: TemplateSection[];
  pageWidth: number;
  pageHeight: number;
  clientId?: number; // Optional - will be retrieved from session if not provided
}

export interface UpdateDocumentTemplateRequest {
  name?: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  sections?: TemplateSection[];
  uiPreferences?: {
    zoom?: number;
    showGrid?: boolean;
    snapToGrid?: boolean;
    activeSectionId?: string | null;
  };
  clientId?: number; // Optional - will be retrieved from session if not provided
}

export interface DocumentTypeInfo {
  description: string;
  requiredFields: string[];
  dataSource: string;
  defaultSections: TemplateSection[];
}

export interface DocumentTypeRegistry {
  [key: string]: DocumentTypeInfo;
}

/**
 * Initialize default templates for the current client
 */
export async function initializeDefaultTemplates(): Promise<{ count: number }> {
  const token = localStorage.getItem('authToken');  
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["Content-Type"] = 'application/json';
  }
  const response = await fetch(apiConfig.buildUrl('/api/document-templates/initialize'), {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error('Failed to initialize templates');
  return response.json();
}

/**
 * Get all templates for the current client
 */
export async function getDocumentTemplates(documentType?: string, clientId?: number): Promise<DocumentTemplate[]> {
  const queryParams = new URLSearchParams();
  if (documentType) queryParams.append('documentType', documentType);
  if (clientId) queryParams.append('clientId', clientId.toString());
  const queryString = queryParams.toString();
  const url = apiConfig.buildUrl(`/api/document-templates${queryString ? `?${queryString}` : ''}`);
  
  const token = localStorage.getItem('authToken');  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(url, {
    headers: {
      ...headers,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
    credentials: 'include',
    cache: 'no-store', // Prevent browser caching
  });
  if (!response.ok) throw new Error('Failed to fetch templates');
  const json = await response.json();
  return json.data;
}

/**
 * Get a specific template by ID
 */
export async function getDocumentTemplate(templateId: number, clientId?: number): Promise<DocumentTemplate> {
  const token = localStorage.getItem('authToken');    
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["Content-Type"] = 'application/json';
  }
  
  // Include clientId in query parameters if provided
  const url = new URL(apiConfig.buildUrl(`/api/document-templates/${templateId}`));
  if (clientId) {
    url.searchParams.set('clientId', clientId.toString());
  }
  
  const response = await fetch(url.toString(), {
    headers,
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch template');
  const json = await response.json();
  return json.data;
}

/**
 * Get the default template for a document type
 */
export async function getDefaultDocumentTemplate(documentType: string, clientId?: number): Promise<DocumentTemplate | null> {
  const token = localStorage.getItem('authToken');  
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["Content-Type"] = 'application/json';
  }
  
  // Include clientId in query parameters if provided
  const url = new URL(apiConfig.buildUrl(`/api/document-templates/default/${documentType}`));
  if (clientId) {
    url.searchParams.set('clientId', clientId.toString());
  }
  
  const response = await fetch(url.toString(), {
    headers,
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch default template');
  const json = await response.json();
  return json.data;
}

/**
 * Create a new document template
 */
export async function createDocumentTemplate(data: CreateDocumentTemplateRequest, clientId?: number): Promise<DocumentTemplate> {
  const token = localStorage.getItem('authToken');  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // Include clientId in request body if provided
  const requestData = {
    ...data,
    clientId: clientId || data.clientId,
  };
  
  const response = await fetch(apiConfig.buildUrl('/api/document-templates'), {
    method: 'POST',
    headers,
    body: JSON.stringify(requestData),
    credentials: 'include',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create template');
  }
  const json = await response.json();
  return json.data;
}

/**
 * Update an existing document template
 */
export async function updateDocumentTemplate(
  templateId: number,
  data: UpdateDocumentTemplateRequest,
  clientId?: number
): Promise<DocumentTemplate> {
  const token = localStorage.getItem('authToken');  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // Include clientId in request body if provided
  const requestData = {
    ...data,
    clientId: clientId || data.clientId,
  };
  
  const response = await fetch(apiConfig.buildUrl(`/api/document-templates/${templateId}`), {
    method: 'PUT',
    headers,
    body: JSON.stringify(requestData),
    credentials: 'include',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update template');
  }
  const json = await response.json();
  return json.data;
}

/**
 * Delete a document template
 */
export async function deleteDocumentTemplate(templateId: number, clientId?: number): Promise<void> {
  const token = localStorage.getItem('authToken');  
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["Content-Type"] = 'application/json';
  }
  
  // Add clientId to query parameters if provided
  const queryParams = new URLSearchParams();
  if (clientId) {
    queryParams.append('clientId', clientId.toString());
  }
  const queryString = queryParams.toString();
  const url = apiConfig.buildUrl(`/api/document-templates/${templateId}${queryString ? `?${queryString}` : ''}`);
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to delete template');
  }
}

/**
 * Get document type registry (available document types and their metadata)
 */
export async function getDocumentTypeRegistry(): Promise<DocumentTypeRegistry> {
  const token = localStorage.getItem('authToken');  
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(apiConfig.buildUrl('/api/document-templates/registry'), {
    headers,
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch document type registry');
  const json = await response.json();
  return json.data || json;
}
