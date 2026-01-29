/**
 * Cheque Template API Client
 * Frontend API client for managing cheque templates
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
}

export interface ChequeFieldPositions {
  date: FieldPosition;
  payeeName: FieldPosition;
  amountNumeric: FieldPosition;
  amountWords: FieldPosition;
  memo: FieldPosition;
  signature: FieldPosition;
  companyName?: FieldPosition;
  companyAddress?: FieldPosition;
  bankName?: FieldPosition;
  transitNumber?: FieldPosition;
  accountNumber?: FieldPosition;
  chequeNumber?: FieldPosition;
  voidText?: FieldPosition;
}

export interface ChequeTemplate {
  id: number;
  clientId: number;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  fieldPositions: ChequeFieldPositions;
  pageWidth: number;
  pageHeight: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChequeTemplateRequest {
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  fieldPositions: ChequeFieldPositions;
  pageWidth?: number;
  pageHeight?: number;
}

export interface UpdateChequeTemplateRequest {
  name?: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  fieldPositions?: ChequeFieldPositions;
  pageWidth?: number;
  pageHeight?: number;
}

/**
 * Get all templates for current client
 */
export async function getChequeTemplates(): Promise<ChequeTemplate[]> {
  const response = await fetch(apiConfig.buildUrl('/api/cheque-templates'));
  if (!response.ok) throw new Error('Failed to fetch templates');
  const result = await response.json();
  return result.data;
}

/**
 * Get template by ID
 */
export async function getChequeTemplate(id: number): Promise<ChequeTemplate> {
  const response = await fetch(apiConfig.buildUrl(`/api/cheque-templates/${id}`));
  if (!response.ok) throw new Error('Failed to fetch template');
  const result = await response.json();
  return result.data;
}

/**
 * Get default template (creates Cloud 9 default if none exists)
 */
export async function getDefaultChequeTemplate(): Promise<ChequeTemplate> {
  const response = await fetch(apiConfig.buildUrl('/api/cheque-templates/default/current'));
  if (!response.ok) throw new Error('Failed to fetch default template');
  const result = await response.json();
  return result.data;
}

/**
 * Create template
 */
export async function createChequeTemplate(
  data: CreateChequeTemplateRequest
): Promise<ChequeTemplate> {
  const response = await fetch(apiConfig.buildUrl('/api/cheque-templates'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create template');
  const result = await response.json();
  return result.data;
}

/**
 * Update template
 */
export async function updateChequeTemplate(
  id: number,
  data: UpdateChequeTemplateRequest
): Promise<ChequeTemplate> {
  const response = await fetch(apiConfig.buildUrl(`/api/cheque-templates/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update template');
  const result = await response.json();
  return result.data;
}

/**
 * Delete template
 */
export async function deleteChequeTemplate(id: number): Promise<void> {
  const response = await fetch(apiConfig.buildUrl(`/api/cheque-templates/${id}`), {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete template');
}
