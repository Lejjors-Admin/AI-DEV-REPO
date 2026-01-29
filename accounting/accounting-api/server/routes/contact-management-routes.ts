/**
 * Contact Management Routes
 * 
 * Comprehensive contact person management with client relationships,
 * communication preferences, and group management
 */

import express from 'express';
import { z } from 'zod';
import { secureStorage } from '../secure-storage';
import { requireAuthHybrid } from '../auth';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createContactPersonSchema = z.object({
  // Personal Information
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  title: z.string().optional(),
  
  // Additional Contact Details
  mobilePhone: z.string().optional(),
  alternateEmail: z.string().email().optional().or(z.literal('')),
  preferredContactMethod: z.enum(['email', 'phone', 'mobile']).default('email'),
  
  // Address Information
  address: z.string().optional(),
  city: z.string().optional(),
  stateProvince: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('Canada'),
  
  // Billing & Portal Preferences
  preferredPaymentTerms: z.string().default('Net 30'),
  billingEmail: z.string().email().optional().or(z.literal('')),
  consolidatedBilling: z.boolean().default(false),
  
  // Portal Access
  portalAccessEnabled: z.boolean().default(true),
  portalUsername: z.string().optional(),
  
  // Communication Preferences
  communicationPreferences: z.object({
    receiveProjectUpdates: z.boolean().default(true),
    receiveInvoiceNotifications: z.boolean().default(true),
    receiveDeadlineReminders: z.boolean().default(true),
    preferredFrequency: z.enum(['weekly', 'bi-weekly', 'monthly']).default('weekly'),
    communicationTimezone: z.string().default('America/Toronto')
  }).optional(),
  
  // Assignment
  assignedManagerId: z.number().optional(),
  notes: z.string().optional()
});

const updateContactPersonSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  mobilePhone: z.string().optional(),
  alternateEmail: z.string().email().optional().or(z.literal('')),
  preferredContactMethod: z.enum(['email', 'phone', 'mobile']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  stateProvince: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  preferredPaymentTerms: z.string().optional(),
  billingEmail: z.string().email().optional().or(z.literal('')),
  consolidatedBilling: z.boolean().optional(),
  portalAccessEnabled: z.boolean().optional(),
  portalUsername: z.string().optional(),
  communicationPreferences: z.object({
    receiveProjectUpdates: z.boolean().optional(),
    receiveInvoiceNotifications: z.boolean().optional(),
    receiveDeadlineReminders: z.boolean().optional(),
    preferredFrequency: z.enum(['weekly', 'bi-weekly', 'monthly']).optional(),
    communicationTimezone: z.string().optional()
  }).optional(),
  assignedManagerId: z.number().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional()
});

const createClientContactRelationshipSchema = z.object({
  clientId: z.number().min(1, 'Valid client ID is required'),
  contactPersonId: z.number().min(1, 'Valid contact person ID is required'),
  relationshipType: z.enum(['owner', 'manager', 'authorized_representative', 'employee']).default('owner'),
  isPrimaryContact: z.boolean().default(false),
  canViewFinancials: z.boolean().default(true),
  canApproveWork: z.boolean().default(true),
  canReceiveInvoices: z.boolean().default(true),
  relationshipStart: z.string().optional(),
  relationshipEnd: z.string().optional(),
  notes: z.string().optional()
});

const updateClientContactRelationshipSchema = z.object({
  relationshipType: z.enum(['owner', 'manager', 'authorized_representative', 'employee']).optional(),
  isPrimaryContact: z.boolean().optional(),
  canViewFinancials: z.boolean().optional(),
  canApproveWork: z.boolean().optional(),
  canReceiveInvoices: z.boolean().optional(),
  relationshipEnd: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional()
});

const bulkContactOperationSchema = z.object({
  contactIds: z.array(z.number()).min(1, 'At least one contact ID is required'),
  operation: z.enum(['assign_manager', 'update_preferences', 'archive', 'activate']),
  operationData: z.record(z.any()).optional()
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function createSecurityContext(user: any) {
  return {
    user: {
      id: user.id,
      role: user.role,
      firmId: user.firmId,
      clientId: user.clientId
    },
    tenantScope: {
      firmId: user.firmId,
      clientId: user.clientId,
      allowedClientIds: []
    }
  };
}

function requireFirmMember(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const allowedRoles = ['firm_admin', 'firm_user', 'super_admin', 'saas_owner'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Firm access required' });
  }
  
  next();
}

// ============================================================================
// CONTACT PERSON MANAGEMENT
// ============================================================================

/**
 * POST /api/contact-management/contacts - Create a new contact person
 */
router.post('/contacts', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const user = req.user as any;
    
    const validation = createContactPersonSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid contact data', 
        details: validation.error.errors 
      });
    }
    
    const contactData = validation.data;
    const context = createSecurityContext(user);
    
    // Add firm ID to contact data
    const contactDataWithFirm = {
      ...contactData,
      firmId: user.firmId,
      assignedManagerId: contactData.assignedManagerId || user.id
    };
    
    const newContact = await secureStorage.createContactPerson(contactDataWithFirm, context);
    
    console.log(`✅ Created contact person: ${newContact.name} (ID: ${newContact.id})`);
    
    res.status(201).json({
      success: true,
      data: newContact,
      message: 'Contact person created successfully'
    });
    
  } catch (error) {
    console.error('Error creating contact person:', error);
    res.status(500).json({ 
      error: 'Failed to create contact person',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/contact-management/contacts - Get all contact persons for the firm
 */
router.get('/contacts', requireAuthHybrid, requireFirmMember, async (req, res) => {
  const startTime = Date.now();
  console.log(`📋 GET /api/contact-management/contacts - Request received at ${new Date().toISOString()}`);
  
  // Set a timeout to prevent hanging requests
  const timeout = setTimeout(() => {
    console.error('⏱️ GET /api/contact-management/contacts - Request timeout after 25 seconds');
    if (!res.headersSent) {
      res.status(504).json({ 
        error: 'Request timeout',
        message: 'The request took too long to process. Please try again.'
      });
    }
  }, 25000);
  
  try {
    const user = req.user as any;
    console.log(`📋 GET /api/contact-management/contacts - Request received, user:`, {
      id: user?.id,
      role: user?.role,
      firmId: user?.firmId,
      username: user?.username
    });
    
    const firmId = user?.firmId;
    
    if (!firmId) {
      console.error('❌ GET /api/contact-management/contacts - No firmId found');
      clearTimeout(timeout);
      return res.status(400).json({ error: 'User is not associated with a firm' });
    }
    
    console.log(`📋 Step 1: Creating security context...`);
    const context = createSecurityContext(user);
    console.log(`📋 Step 1: Created context:`, context);
    
    console.log(`📋 Step 2: Fetching contacts from secureStorage...`);
    const contacts = await secureStorage.getContactPersons(firmId, context);
    console.log(`📋 Step 2: Retrieved ${contacts.length} contacts from secureStorage`);
    
    if (contacts.length === 0) {
      console.log(`📋 Step 3: No contacts found, returning empty array`);
      clearTimeout(timeout);
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }
    
    console.log(`📋 Step 3: Fetching relationships for ${contacts.length} contacts...`);
    // Get client relationships for each contact with timeout protection
    const contactsWithRelationships = await Promise.all(
      contacts.map(async (contact) => {
        try {
          const relationships = await secureStorage.getContactPersonRelationships(contact.id, context);
          return {
            ...contact,
            clientRelationships: relationships
          };
        } catch (error) {
          console.error(`❌ Error fetching relationships for contact ${contact.id}:`, error);
          return {
            ...contact,
            clientRelationships: []
          };
        }
      })
    );
    
    const elapsed = Date.now() - startTime;
    console.log(`📋 Step 4: Returning ${contactsWithRelationships.length} contacts with relationships (took ${elapsed}ms)`);
    
    clearTimeout(timeout);
    res.json({
      success: true,
      data: contactsWithRelationships,
      count: contactsWithRelationships.length
    });
    
  } catch (error: any) {
    clearTimeout(timeout);
    console.error('❌ GET /api/contact-management/contacts - Error:', error);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code
    });
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to fetch contact persons',
        details: error?.message || String(error)
      });
    }
  }
});

/**
 * GET /api/contact-management/contacts/:id - Get specific contact person
 */
router.get('/contacts/:id', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const user = req.user as any;
    
    if (isNaN(contactId)) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }
    
    const context = createSecurityContext(user);
    const contact = await secureStorage.getContactPerson(contactId, context);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact person not found' });
    }
    
    // Get client relationships
    const relationships = await secureStorage.getContactPersonRelationships(contactId, context);
    
    res.json({
      success: true,
      data: {
        ...contact,
        clientRelationships: relationships
      }
    });
    
  } catch (error) {
    console.error('Error fetching contact person:', error);
    res.status(500).json({ 
      error: 'Failed to fetch contact person',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * PUT /api/contact-management/contacts/:id - Update contact person
 */
router.put('/contacts/:id', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const user = req.user as any;
    
    if (isNaN(contactId)) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }
    
    const validation = updateContactPersonSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid update data', 
        details: validation.error.errors 
      });
    }
    
    const updateData = validation.data;
    const context = createSecurityContext(user);
    
    const updatedContact = await secureStorage.updateContactPerson(contactId, updateData, context);
    
    if (!updatedContact) {
      return res.status(404).json({ error: 'Contact person not found' });
    }
    
    console.log(`✅ Updated contact person: ${contactId}`);
    
    res.json({
      success: true,
      data: updatedContact,
      message: 'Contact person updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating contact person:', error);
    res.status(500).json({ 
      error: 'Failed to update contact person',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * DELETE /api/contact-management/contacts/:id - Archive contact person
 */
router.delete('/contacts/:id', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const user = req.user as any;
    
    if (isNaN(contactId)) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }
    
    const context = createSecurityContext(user);
    const success = await secureStorage.deleteContactPerson(contactId, context);
    
    if (!success) {
      return res.status(404).json({ error: 'Contact person not found' });
    }
    
    console.log(`✅ Archived contact person: ${contactId}`);
    
    res.json({
      success: true,
      message: 'Contact person archived successfully'
    });
    
  } catch (error) {
    console.error('Error archiving contact person:', error);
    res.status(500).json({ 
      error: 'Failed to archive contact person',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// ============================================================================
// CLIENT-CONTACT RELATIONSHIPS
// ============================================================================

/**
 * POST /api/contact-management/relationships - Create client-contact relationship
 */
router.post('/relationships', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const user = req.user as any;
    
    const validation = createClientContactRelationshipSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid relationship data', 
        details: validation.error.errors 
      });
    }
    
    const relationshipData = validation.data;
    const context = createSecurityContext(user);
    
    // Validate that both client and contact exist and are accessible
    const client = await secureStorage.getClient(relationshipData.clientId, context);
    if (!client) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }
    
    const contact = await secureStorage.getContactPerson(relationshipData.contactPersonId, context);
    if (!contact) {
      return res.status(404).json({ error: 'Contact person not found or access denied' });
    }
    
    // Prepare relationship data - only include fields that are provided
    // Don't set relationshipStart if not provided (let DB default handle it)
    const relationshipDataWithDefaults: any = {
      clientId: relationshipData.clientId,
      contactPersonId: relationshipData.contactPersonId,
      relationshipType: relationshipData.relationshipType,
      isPrimaryContact: relationshipData.isPrimaryContact ?? false,
      canViewFinancials: relationshipData.canViewFinancials ?? true,
      canApproveWork: relationshipData.canApproveWork ?? true,
      canReceiveInvoices: relationshipData.canReceiveInvoices ?? true,
      isActive: relationshipData.isActive ?? true
    };
    
    // Only add relationshipStart if explicitly provided
    if (relationshipData.relationshipStart) {
      relationshipDataWithDefaults.relationshipStart = typeof relationshipData.relationshipStart === 'string' 
        ? new Date(relationshipData.relationshipStart) 
        : relationshipData.relationshipStart;
    }
    
    // Only add relationshipEnd if explicitly provided
    if (relationshipData.relationshipEnd) {
      relationshipDataWithDefaults.relationshipEnd = typeof relationshipData.relationshipEnd === 'string' 
        ? new Date(relationshipData.relationshipEnd) 
        : relationshipData.relationshipEnd;
    }
    
    // Add notes if provided
    if (relationshipData.notes) {
      relationshipDataWithDefaults.notes = relationshipData.notes;
    }
    
    const newRelationship = await secureStorage.createClientContactRelationship(relationshipDataWithDefaults, context);
    
    console.log(`✅ Created client-contact relationship: Client ${relationshipData.clientId} → Contact ${relationshipData.contactPersonId}`);
    
    res.status(201).json({
      success: true,
      data: newRelationship,
      message: 'Client-contact relationship created successfully'
    });
    
  } catch (error) {
    console.error('Error creating client-contact relationship:', error);
    res.status(500).json({ 
      error: 'Failed to create relationship',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/contact-management/client/:clientId/contacts - Get contacts for a client
 */
router.get('/client/:clientId/contacts', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const user = req.user as any;
    
    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }
    
    const context = createSecurityContext(user);
    
    // Validate client access
    const client = await secureStorage.getClient(clientId, context);
    if (!client) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }
    
    const contacts = await secureStorage.getClientContacts(clientId, context);
    
    res.json({
      success: true,
      data: contacts,
      count: contacts.length
    });
    
  } catch (error) {
    console.error('Error fetching client contacts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch client contacts',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/contact-management/contact/:contactId/clients - Get clients for a contact
 */
router.get('/contact/:contactId/clients', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const contactId = parseInt(req.params.contactId);
    const user = req.user as any;
    
    if (isNaN(contactId)) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }
    
    const context = createSecurityContext(user);
    
    // Validate contact access
    const contact = await secureStorage.getContactPerson(contactId, context);
    if (!contact) {
      return res.status(404).json({ error: 'Contact person not found or access denied' });
    }
    
    const clients = await secureStorage.getContactClients(contactId, context);
    
    res.json({
      success: true,
      data: clients,
      count: clients.length
    });
    
  } catch (error) {
    console.error('Error fetching contact clients:', error);
    res.status(500).json({ 
      error: 'Failed to fetch contact clients',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * PUT /api/contact-management/relationships/:id - Update client-contact relationship
 */
router.put('/relationships/:id', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const relationshipId = parseInt(req.params.id);
    const user = req.user as any;
    
    if (isNaN(relationshipId)) {
      return res.status(400).json({ error: 'Invalid relationship ID' });
    }
    
    const validation = updateClientContactRelationshipSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid update data', 
        details: validation.error.errors 
      });
    }
    
    const updateData = validation.data;
    const context = createSecurityContext(user);
    
    const updatedRelationship = await secureStorage.updateClientContactRelationship(relationshipId, updateData, context);
    
    if (!updatedRelationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }
    
    console.log(`✅ Updated client-contact relationship: ${relationshipId}`);
    
    res.json({
      success: true,
      data: updatedRelationship,
      message: 'Relationship updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating relationship:', error);
    res.status(500).json({ 
      error: 'Failed to update relationship',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/contact-management/bulk-operation - Perform bulk operations on contacts
 */
router.post('/bulk-operation', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const user = req.user as any;
    
    const validation = bulkContactOperationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid bulk operation data', 
        details: validation.error.errors 
      });
    }
    
    const { contactIds, operation, operationData } = validation.data;
    const context = createSecurityContext(user);
    
    const results = [];
    const errors = [];
    
    for (const contactId of contactIds) {
      try {
        // Validate contact access
        const contact = await secureStorage.getContactPerson(contactId, context);
        if (!contact) {
          errors.push({ contactId, error: 'Contact not found or access denied' });
          continue;
        }
        
        let result;
        
        switch (operation) {
          case 'assign_manager':
            if (!operationData?.managerId) {
              errors.push({ contactId, error: 'Manager ID required for assignment' });
              continue;
            }
            result = await secureStorage.updateContactPerson(contactId, {
              assignedManagerId: operationData.managerId
            }, context);
            break;
            
          case 'update_preferences':
            if (!operationData?.preferences) {
              errors.push({ contactId, error: 'Preferences data required' });
              continue;
            }
            result = await secureStorage.updateContactPerson(contactId, {
              communicationPreferences: operationData.preferences
            }, context);
            break;
            
          case 'archive':
            result = await secureStorage.updateContactPerson(contactId, {
              isActive: false
            }, context);
            break;
            
          case 'activate':
            result = await secureStorage.updateContactPerson(contactId, {
              isActive: true
            }, context);
            break;
            
          default:
            errors.push({ contactId, error: 'Unknown operation' });
            continue;
        }
        
        if (result) {
          results.push({ contactId, result });
        } else {
          errors.push({ contactId, error: 'Operation failed' });
        }
        
      } catch (error) {
        errors.push({ 
          contactId, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    console.log(`✅ Bulk operation ${operation} completed: ${results.length} success, ${errors.length} errors`);
    
    res.json({
      success: true,
      data: {
        results,
        errors,
        successCount: results.length,
        errorCount: errors.length
      },
      message: `Bulk operation completed: ${results.length} successful, ${errors.length} failed`
    });
    
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    res.status(500).json({ 
      error: 'Failed to perform bulk operation',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;