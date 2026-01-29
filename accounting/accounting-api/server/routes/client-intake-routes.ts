import { Router, Request, Response } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  insertClientSchema, 
  insertClientIntakeWorkflowSchema,
  insertQuestionnaireSchema,
  insertQuestionnaireQuestionSchema,
  insertEmailTemplateSchema
} from "@shared/schema";
import { storage } from "../minimal-storage";
import { AutoProjectCreatorService } from "../services/auto-project-creator";
import { requireAuth, requireAuthHybrid } from "../auth";
import { db } from "../db";
import { taskStatuses } from "../../shared/database/crm-entities";
import { eq, asc } from "drizzle-orm";

const router = Router();

// Enhanced client creation schema
const enhancedClientCreationSchema = insertClientSchema.omit({
  workType: true
}).extend({
  intakeMethod: z.enum(["ai_email", "manual_entry"]),
  
  // AI Email specific fields
  clientEmail: z.string().email().optional(),
  emailSubject: z.string().optional(),
  selectedQuestionnaires: z.array(z.number()).default([]),
  aiPersonalization: z.object({
    industry: z.string().optional(),
    clientName: z.string().optional(),
    customInstructions: z.string().optional(),
  }).optional(),
  
  // Project creation fields
  projectYears: z.array(z.string()).default([]),
  fiscalYearEnd: z.string().default("December 31"),
  workType: z.array(z.string()).default([]),
});

/**
 * Create client with enhanced intake options
 * Supports both AI email intake and manual staff entry
 */
/**
 * Get pending client approvals for staff review
 */
// Client update schema for validation
const clientUpdateSchema = insertClientSchema.partial().omit({
  id: true,
  firmId: true,
  createdAt: true,
  updatedAt: true
});

/**
 * Get a single client by ID
 */
router.get('/:clientId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    
    console.log(`📖 Fetching client ${clientId}`);
    
    const client = await storage.getClient(parseInt(clientId));
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    console.log(`✅ Client fetched successfully: ${client.name} (ID: ${client.id})`);
    
    res.json(client);
    
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ 
      error: 'Failed to fetch client',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Update an existing client (PUT method)
 */
router.put('/:clientId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    
    // Validate the request body using Zod
    const validationResult = clientUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid update data',
        details: validationResult.error.errors,
        message: 'Please check the provided data and try again'
      });
    }
    
    const updateData = validationResult.data;
    console.log(`🔄 Updating client ${clientId} (PUT):`, updateData);
    
    // Get the existing client first
    const existingClient = await storage.getClient(parseInt(clientId));
    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Update the client with validated data only
    const updatedClient = await storage.updateClient(parseInt(clientId), updateData);
    
    console.log(`✅ Client updated successfully: ${updatedClient.name} (ID: ${updatedClient.id})`);
    
    res.json(updatedClient);
    
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ 
      error: 'Failed to update client',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Update an existing client (PATCH method)
 */
router.patch('/:clientId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    
    // Validate the request body using Zod
    const validationResult = clientUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid update data',
        details: validationResult.error.errors,
        message: 'Please check the provided data and try again'
      });
    }
    
    const updateData = validationResult.data;
    console.log(`🔄 Updating client ${clientId}:`, updateData);
    
    // Get the existing client first
    const existingClient = await storage.getClient(parseInt(clientId));
    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Update the client with validated data only
    const updatedClient = await storage.updateClient(parseInt(clientId), updateData);
    
    console.log(`✅ Client updated successfully: ${updatedClient.name} (ID: ${updatedClient.id})`);
    
    res.json({
      success: true,
      client: updatedClient,
      message: 'Client updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ 
      error: 'Failed to update client',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/pending-approvals', async (req: Request, res: Response) => {
  try {
    const pendingApprovals = await storage.getPendingClientApprovals();
    // Return in the format expected by frontend: { clientApprovals: [], timeEntryApprovals: [] }
    res.json({
      clientApprovals: pendingApprovals || [],
      timeEntryApprovals: [] // TODO: Add time entry approvals when implemented
    });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

/**
 * Approve pending client projects and tasks
 */
router.post('/approve-client/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Get the pending approval record
    const approval = await storage.getPendingClientApproval(parseInt(id));
    if (!approval) {
      return res.status(404).json({ error: 'Pending approval not found' });
    }
    
    // Approve the record
    const approvedRecord = await storage.approvePendingClient(parseInt(id), user.id, reviewNotes);
    
    // Parse the proposed projects and tasks
    const proposedProjects = typeof approval.proposedProjects === 'string' 
      ? JSON.parse(approval.proposedProjects) 
      : approval.proposedProjects;
    const proposedTasks = typeof approval.proposedTasks === 'string' 
      ? JSON.parse(approval.proposedTasks) 
      : approval.proposedTasks;
    
    // Get the firmId from the client first
    const client = approval.clientId ? await storage.getClient(approval.clientId) : null;
    const firmId = client?.firmId || 1;
    
    if (!firmId) {
      return res.status(400).json({ error: 'Client must have a firmId to create projects' });
    }
    
    // Convert to database records
    const { projects, tasks } = AutoProjectCreatorService.convertToDbRecords(proposedProjects, proposedTasks);
    
    // Create actual projects with firmId
    const createdProjects = [];
    for (const project of projects) {
      const createdProject = await storage.createProject({
        ...project,
        firmId: firmId
      });
      createdProjects.push(createdProject);
    }
    
    // Get the default status (first active status in firmId)
    
    // Get the default or first task status for this firm
    let defaultStatus = null;
    try {
      const defaultStatusQuery = await db
        .select()
        .from(taskStatuses)
        .where(eq(taskStatuses.firmId, firmId || 1))
        .orderBy(asc(taskStatuses.displayOrder))
        .limit(1);
      defaultStatus = defaultStatusQuery[0] || null;
    } catch (statusError: any) {
      if (statusError?.code !== "42P01") {
        throw statusError;
      }
      defaultStatus = null;
    }
    
    // Create actual tasks (link to created projects)
    const createdTasks = [];
    console.log(`📋 Creating ${tasks.length} tasks for ${createdProjects.length} projects`);
    console.log('📋 Created projects:', createdProjects.map(p => ({ id: p.id, name: p.name })));
    console.log('📋 Proposed tasks:', proposedTasks.map((t, i) => ({ index: i, projectName: t.projectName, title: t.title })));
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const proposedTask = proposedTasks[i];
      
      // Try to find the related project by matching projectName
      let relatedProject = null;
      if (proposedTask?.projectName) {
        // Extract the base name from projectName (e.g., "Client Name - 2025" -> "Client Name")
        const baseProjectName = proposedTask.projectName.split(' - ')[0];
        relatedProject = createdProjects.find(p => p.name.includes(baseProjectName));
        
        // If not found, try exact match
        if (!relatedProject) {
          relatedProject = createdProjects.find(p => p.name === proposedTask.projectName);
        }
      }
      
      if (relatedProject) {
        console.log(`📋 Linking task "${task.title}" to project "${relatedProject.name}" (ID: ${relatedProject.id})`);
        task.projectId = relatedProject.id;
        task.firmId = firmId || 1;
        task.createdBy = user.id || 1;
        // Assign default statusId if available
        if (defaultStatus) {
          task.statusId = defaultStatus.id;
        }
        const createdTask = await storage.createTask(task);
        createdTasks.push(createdTask);
        console.log(`✅ Created task: ${createdTask.title} (ID: ${createdTask.id})`);
      } else {
        console.warn(`⚠️ Could not find project for task "${task.title}" with projectName "${proposedTask?.projectName}"`);
        console.warn(`   Available projects: ${createdProjects.map(p => p.name).join(', ')}`);
      }
    }
    
    console.log(`✅ Approved client: Created ${createdProjects.length} projects and ${createdTasks.length} tasks`);
    
    res.json({
      approved: approvedRecord,
      created: {
        projects: createdProjects,
        tasks: createdTasks
      },
      message: `Successfully approved and created ${createdProjects.length} projects and ${createdTasks.length} tasks`
    });
  } catch (error) {
    console.error('Error approving client:', error);
    res.status(500).json({ error: 'Failed to approve client' });
  }
});

/**
 * Reject pending client projects and tasks
 */
router.post('/reject-client/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;
    const user = (req as any).user || { id: 1 }; // Get reviewer from session
    
    if (!reviewNotes) {
      return res.status(400).json({ error: 'Review notes are required for rejection' });
    }
    
    const rejectedRecord = await storage.rejectPendingClient(parseInt(id), user.id, reviewNotes);
    
    console.log(`❌ Rejected client approval: ${id}`);
    
    res.json({
      rejected: rejectedRecord,
      message: 'Client approval rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting client:', error);
    res.status(500).json({ error: 'Failed to reject client' });
  }
});

/**
 * Create client with enhanced intake options
 * Supports both AI email intake and manual staff entry
 */
router.post('/enhanced', requireAuthHybrid, async (req: Request, res: Response) => {
  try {
    console.log('🚀 Enhanced client creation request received');
    console.log('📦 Request body keys:', Object.keys(req.body || {}));
    console.log('👤 Request user:', req.user ? { id: req.user.id, username: req.user.username, firmId: req.user.firmId } : 'none');

    // Validate the request data
    const validatedData = enhancedClientCreationSchema.parse(req.body);
    const { intakeMethod, clientEmail, emailSubject, selectedQuestionnaires, aiPersonalization, projectYears, fiscalYearEnd, workType, ...clientData } = validatedData;

    // DEBUG: Log validated data
    console.log('🔍 POST-VALIDATION DEBUG:');
    console.log('  intakeMethod:', intakeMethod);
    console.log('  projectYears:', projectYears, 'Length:', projectYears?.length);
    console.log('  workType:', workType, 'Length:', workType?.length);
    console.log('  fiscalYearEnd:', fiscalYearEnd);

    // Get user info from token/session
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Use user from JWT token (already validated by requireAuthHybrid)
    // Only fetch from DB if firmId is missing (fallback)
    let user = {
      id: req.user.id,
      username: req.user.username || 'admin',
      firmId: req.user.firmId || 1,
      role: req.user.role || 'firm_admin',
      email: req.user.email,
      name: req.user.name || 'Admin User'
    };

    // Only query database if firmId is missing (shouldn't happen with proper JWT)
    if (!user.firmId) {
      console.log('⚠️ firmId missing from JWT, fetching from database...');
      try {
        const fullUser = await storage.getUser(req.user.id);
        if (fullUser) {
          user.firmId = fullUser.firmId || 1;
          user.email = fullUser.email || user.email;
          user.name = fullUser.name || user.name;
        }
      } catch (dbError) {
        console.error('❌ Error fetching user from database:', dbError);
        // Continue with default firmId
        user.firmId = user.firmId || 1;
      }
    }
    
    console.log('🔐 User context:', user);

    // Clean up the data - convert empty strings to null for optional fields
    const cleanedClientData = Object.entries(clientData).reduce((acc, [key, value]) => {
      // Convert empty strings to null for optional date and text fields
      if (value === '' || value === null || value === undefined) {
        acc[key] = null;
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

     // Create the client record first
     const newClient = await storage.createClient({
      ...cleanedClientData,
      onboardingStatus: intakeMethod === "ai_email" ? "pending" : "completed",
      firmId: user.firmId || null,
    });

    console.log(`✅ Client created: ${newClient.name} (ID: ${newClient.id})`);

    // 👤 AUTO-CREATE CONTACT from client data using contact-management system
    // Use contactPersonName if provided, otherwise fall back to client name
    let createdContact = null;
    try {
      // Determine contact name: prefer contactPersonName, fallback to client name
      const contactName = clientData.contactPersonName || newClient.name;
      const contactEmail = clientData.contactPersonEmail || newClient.email;
      const contactPhone = clientData.contactPersonPhone || newClient.phone;
      const contactTitle = clientData.contactPersonTitle || undefined;
      
      if (contactName) {
        console.log('👤 Attempting to auto-create contact for client:', newClient.name, '(ID:', newClient.id, ')');
        console.log('👤 Contact person name:', contactName);
        
        try {
          // Use secureStorage (same as contact-management routes) to create contact
          const { secureStorage } = await import("../secure-storage");
          
          if (!secureStorage) {
            throw new Error('secureStorage instance not found after import');
          }
          
          // Create contact person using the same system as contact-management
          // Generate a valid email if not provided (required by schema)
          let contactEmailFinal = contactEmail;
          if (!contactEmailFinal || !contactEmailFinal.includes('@')) {
            // Generate a placeholder email if none provided
            const sanitizedName = newClient.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            contactEmailFinal = `contact-${sanitizedName}@client.local`;
            console.log('⚠️ No valid email provided, using generated email:', contactEmailFinal);
          }
          
          const contactData = {
            name: contactName, // Use contact person name, not client name
            email: contactEmailFinal, // Required by schema
            phone: contactPhone || undefined,
            title: contactTitle || undefined,
            address: newClient.address || undefined,
            city: newClient.addressCity || undefined,
            stateProvince: newClient.addressStateProvince || undefined,
            postalCode: newClient.addressPostalCode || undefined,
            country: newClient.addressCountry || 'Canada',
            firmId: user.firmId || 1,
            notes: 'Auto-created from client intake',
            isActive: true
          };
          
          console.log('👤 Contact data to create:', JSON.stringify(contactData, null, 2));
          
          // Create security context (same as contact-management routes)
          const context = {
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
          
          // Create contact person
          createdContact = await secureStorage.createContactPerson(contactData, context);
          console.log(`✅ Auto-created contact person: ${createdContact.name} (ID: ${createdContact.id})`);
          
          // Create relationship between contact and client
          if (createdContact && newClient.id) {
            const relationshipData = {
              clientId: newClient.id,
              contactPersonId: createdContact.id,
              relationshipType: 'owner' as const,
              isPrimaryContact: true, // Mark as primary contact
              canViewFinancials: true,
              canApproveWork: true,
              canReceiveInvoices: true,
              isActive: true,
              relationshipStart: new Date(), // Use Date object, not string
              notes: 'Auto-created relationship from client intake'
            };
            
            await secureStorage.createClientContactRelationship(relationshipData, context);
            console.log(`✅ Created relationship between contact ${createdContact.id} and client ${newClient.id}`);
          }
        } catch (importError) {
          console.error('❌ Error importing secureStorage:', importError);
          throw importError; // Re-throw to be caught by outer catch
        }
      } else {
        console.warn('⚠️ Skipping contact creation: No contact name available');
      }
    } catch (contactError) {
      console.error('❌ Error auto-creating contact:', contactError);
      if (contactError instanceof Error) {
        console.error('Error message:', contactError.message);
        console.error('Error stack:', contactError.stack);
      } else {
        console.error('Error details:', JSON.stringify(contactError, null, 2));
      }
      // Continue even if contact creation fails - don't block client creation
    }

    // Initialize variables (no auto project creation - projects go to pending approvals)
    let createdProjects: any[] = [];
    let createdTasks: any[] = [];
    let pendingApprovalRecord: any = null;

    // 🚀 GENERATE PROJECTS AND TASKS FOR PENDING APPROVAL (not auto-created)
    console.log('🏗️ Generating projects and tasks for pending approval...');
    
    // DEBUG: Log condition check
    console.log('🔍 CONDITION CHECK:');
    console.log('  projectYears exists:', !!projectYears);
    console.log('  projectYears.length > 0:', projectYears && projectYears.length > 0);
    console.log('  workType exists:', !!workType);
    console.log('  workType.length > 0:', workType && workType.length > 0);
    console.log('  FULL CONDITION:', projectYears && projectYears.length > 0 && workType && workType.length > 0);
    
    try {
      // Generate projects and tasks for pending approval if projectYears and workType are provided
      if (projectYears && projectYears.length > 0 && workType && workType.length > 0) {
        // Parse project years properly - fix the string array issue
        console.log('Raw projectYears:', projectYears);
        
        // Ensure projectYears is properly formatted as array of year strings
        const validYears = Array.isArray(projectYears) 
          ? projectYears.filter(year => year && year.length === 4 && !isNaN(parseInt(year)))
          : [];
        
        console.log('Valid years for projects:', validYears);
        
        if (validYears.length > 0) {
          // Generate projects and tasks using the new service
          const submissionData = {
            clientId: newClient.id,
            name: newClient.name,
            projectYears: validYears,
            workType: workType,
            clientType: clientData.clientType || "business",
            industry: clientData.industry,
            fiscalYearEnd: fiscalYearEnd
          };
          
          // 🏷️ SMART TAGS: Generate auto-tags for new client
          const { SmartTagRules } = await import("../../shared/smart-tags");
          const autoTags = SmartTagRules.generateClientTags(clientData);
          console.log('🏷️ Generated Smart Tags for client:', autoTags);
          
          // 📄 AUTO-CREATE TXT FILE: Create client notes file
          const clientNotesContent = `
=================================================================
CLIENT NOTES - ${newClient.name}
=================================================================
Created: ${new Date().toLocaleDateString('en-CA')}
Client ID: ${newClient.id}
Client Type: ${clientData.clientType || 'business'}

=== SMART TAGS ===
${autoTags.join(', ')}

=== CONTACT INFORMATION ===
Email: ${newClient.email || 'Not provided'}
Phone: ${newClient.phone || 'Not provided'}
Address: ${newClient.address || 'Not provided'}

=== SERVICE INFORMATION ===
Work Types: ${workType ? workType.join(', ') : 'Not specified'}
Project Years: ${validYears.join(', ')}
Industry: ${clientData.industry || 'Not specified'}

=== NOTES ===
This client was created through the automated intake system.
Projects and tasks are pending staff approval in the Notifications tab.

Auto-generated notes file for ${newClient.name}.
Staff can edit this file to add client-specific notes and observations.
          `.trim();
          
          console.log('📄 Created auto txt file content for client notes');
          
          // Store the txt file content in client notes (simulating file creation)
          newClient.notes = (newClient.notes || '') + '\n\n' + clientNotesContent;
          
          // Generate projects and tasks for approval (but don't create them yet)
          const { projects: generatedProjects, tasks: generatedTasks } = AutoProjectCreatorService.generateProjectsAndTasks(submissionData);
          console.log(`Generated ${generatedProjects.length} projects and ${generatedTasks.length} tasks for approval`);
          
          // Create pending approval entry for staff review
          const pendingApproval = AutoProjectCreatorService.createPendingApproval(submissionData, generatedProjects, generatedTasks);
          
          // Save to database for staff approval
          pendingApprovalRecord = await storage.createPendingClientApproval(pendingApproval);
          console.log(`✅ Created pending approval record: ${pendingApprovalRecord.id} with ${generatedProjects.length} projects and ${generatedTasks.length} tasks pending approval`);
        }
      } else {
        console.log('⚠️ PENDING APPROVAL SKIPPED - Missing projectYears or workType');
        console.log('  Received projectYears:', JSON.stringify(projectYears));
        console.log('  Received workType:', JSON.stringify(workType));
      }
    } catch (projectError) {
      console.error('❌ Error generating projects/tasks for pending approval:', projectError);
      // Continue with client creation even if approval generation fails
    }

    // Handle based on intake method
    if (intakeMethod === "ai_email") {
      // Create intake workflow for AI email
      const workflowData = {
        clientId: newClient.id,
        firmId: user.firmId || 1,
        intakeMethod: "ai_email" as const,
        status: "pending" as const,
        clientEmail: clientEmail || newClient.email,
        emailSubject: emailSubject || "Welcome! Please complete your client information",
        questionnairesAssigned: selectedQuestionnaires || [],
        aiPersonalization: aiPersonalization || {},
        createdBy: user.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      console.log('📧 Creating AI email intake workflow...');
      
      // Create the intake workflow (will be implemented in storage)
      try {
        const workflow = await createIntakeWorkflow(workflowData);
        console.log(`📋 Intake workflow created: ${workflow.id}`);
        
        // Trigger CONNIE AI email generation and sending
        await triggerConnieAIEmail(workflow, newClient);
        
        res.status(201).json({
          client: newClient,
          contact: createdContact,
          workflow: workflow,
          createdProjects,
          pendingApproval: pendingApprovalRecord,
          message: pendingApprovalRecord 
            ? `Client created. Projects and tasks are pending approval in the Notifications tab. AI intake email will be sent shortly.`
            : "Client created and AI intake email will be sent shortly"
        });
      } catch (workflowError) {
        console.error('Error creating intake workflow:', workflowError);
        // Client was created, but workflow failed - still return success but with warning
        res.status(201).json({
          client: newClient,
          contact: createdContact,
          createdProjects,
          pendingApproval: pendingApprovalRecord,
          warning: "Client created but email intake workflow failed to initialize",
          message: pendingApprovalRecord
            ? "Client created successfully. Projects and tasks are pending approval in the Notifications tab."
            : "Client created successfully"
        });
      }
    } else {
      // Manual entry - client is ready to use immediately
      console.log('✅ Manual entry client creation completed');
      res.status(201).json({
        client: newClient,
        contact: createdContact,
        createdProjects,
        pendingApproval: pendingApprovalRecord,
        message: pendingApprovalRecord
          ? "Client created successfully. Projects and tasks are pending approval in the Notifications tab."
          : "Client created successfully and ready to use"
      });
    }

  } catch (error) {
    console.error("Enhanced client creation error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid client data", 
        errors: error.errors,
        details: "Please check all required fields and data formats"
      });
    }
    res.status(500).json({ 
      message: "Failed to create client", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * Get available questionnaires for intake
 */
router.get('/questionnaires', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // For now, return default questionnaires - later this will be from database
    const defaultQuestionnaires = [
      {
        id: 1,
        name: "Basic Business Information",
        description: "Company details, address, contact information",
        category: "basic_info",
        isRequired: true,
        estimatedTime: "5 minutes"
      },
      {
        id: 2,
        name: "Financial & Banking Details",
        description: "Bank accounts, financial year, accounting preferences",
        category: "banking",
        isRequired: true,
        estimatedTime: "7 minutes"
      },
      {
        id: 3,
        name: "Tax Information",
        description: "GST/HST registration, tax ID numbers, filing preferences",
        category: "tax_info",
        isRequired: false,
        estimatedTime: "5 minutes"
      },
      {
        id: 4,
        name: "Business Operations",
        description: "Industry-specific questions, operational details",
        category: "business_details",
        isRequired: false,
        estimatedTime: "10 minutes"
      }
    ];

    res.json(defaultQuestionnaires);

  } catch (error) {
    console.error("Error fetching questionnaires:", error);
    res.status(500).json({ message: "Failed to fetch questionnaires" });
  }
});

/**
 * Get intake workflow status
 */
router.get('/workflow/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // For now, return mock workflow status - later from database
    const mockWorkflow = {
      id: 1,
      clientId: parseInt(clientId),
      status: "email_sent",
      completionPercentage: 25,
      emailSent: true,
      emailSentAt: new Date().toISOString(),
      questionnairesAssigned: [1, 2, 3],
      questionnairesCompleted: [1],
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    };

    res.json(mockWorkflow);

  } catch (error) {
    console.error("Error fetching workflow:", error);
    res.status(500).json({ message: "Failed to fetch workflow status" });
  }
});

/**
 * Process client intake response (when client fills out questionnaire)
 */
router.post('/response', async (req: Request, res: Response) => {
  try {
    const { workflowId, questionId, responseValue, responseData, isComplete, clientId, allResponses } = req.body;

    // Validate required fields
    if (!workflowId || !questionId || !responseValue) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Store the response (mock implementation for now)
    console.log(`📝 Storing intake response: Workflow ${workflowId}, Question ${questionId}`);
    
    // If questionnaire is complete, auto-create projects based on response data
    if (isComplete && clientId && allResponses) {
      console.log('🎉 Questionnaire completed! Auto-creating projects...');
      
      try {
        // Get client information
        const client = await storage.getClient(clientId);
        if (client) {
          // Create projects based on questionnaire responses
          const createdProjects = await autoProjectCreator.createProjectsFromIntakeResponse(
            clientId,
            client.name,
            allResponses
          );
          
          // Update client onboarding status to completed
          await storage.updateClient(clientId, { onboardingStatus: "completed" });
          
          console.log(`🚀 Auto-created ${createdProjects.length} projects for completed intake: ${client.name}`);
          
          return res.json({
            success: true,
            message: "Questionnaire completed successfully",
            createdProjects,
            workflowComplete: true
          });
        }
      } catch (projectError) {
        console.error('❌ Error creating projects from completed intake:', projectError);
        // Continue even if project creation fails
      }
    }
    
    // Regular response storage for incomplete questionnaires
    res.json({
      success: true,
      message: "Response saved successfully"
    });

  } catch (error) {
    console.error("Error processing intake response:", error);
    res.status(500).json({ message: "Failed to process response" });
  }
});

/**
 * Send reminder email for incomplete intake
 */
router.post('/reminder/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    console.log(`📨 Sending reminder for workflow ${workflowId}`);
    
    // In real implementation, this would:
    // 1. Get workflow details from database
    // 2. Generate reminder email with CONNIE AI
    // 3. Send email and update reminder count
    
    res.json({
      success: true,
      message: "Reminder email sent successfully"
    });

  } catch (error) {
    console.error("Error sending reminder:", error);
    res.status(500).json({ message: "Failed to send reminder" });
  }
});

// Helper functions (to be implemented)

async function createIntakeWorkflow(workflowData: any) {
  // For now, return mock workflow
  // In real implementation, this would use storage.createClientIntakeWorkflow()
  console.log('📋 Mock workflow creation:', workflowData);
  
  return {
    id: Math.floor(Math.random() * 1000),
    ...workflowData,
    status: "pending",
    createdAt: new Date().toISOString()
  };
}

async function triggerConnieAIEmail(workflow: any, client: any) {
  console.log('🤖 CONNIE AI: Generating personalized intake email...');
  
  // Mock AI email generation
  const emailContent = `
    Dear ${workflow.aiPersonalization?.clientName || 'Valued Client'},
    
    Welcome to our client portal! We're excited to work with ${client.name}.
    
    To get started, please complete the following questionnaires:
    ${workflow.questionnairesAssigned?.map((id: number) => `- Questionnaire ${id}`).join('\n    ') || '- Basic Business Information'}
    
    This should take approximately 15-20 minutes to complete.
    
    Please click the link below to get started:
    [Complete Your Information](${process.env.FRONTEND_URL || 'http://localhost:5000'}/intake/${workflow.id})
    
    If you have any questions, please don't hesitate to reach out.
    
    Best regards,
    Your Accounting Team
  `;
  
  console.log('📧 Email content generated:', emailContent.substring(0, 200) + '...');
  
  // In real implementation, this would:
  // 1. Use CONNIE AI to generate personalized email
  // 2. Use SendGrid or similar to actually send the email
  // 3. Update workflow status to "email_sent"
  
  return {
    success: true,
    emailSent: true,
    emailContent: emailContent
  };
}

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'client-logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const clientId = req.params.clientId;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `client-${clientId}-${uniqueSuffix}${extension}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed'));
    }
  }
});

/**
 * Get client logo
 * GET /api/clients/:clientId/logo
 */
router.get('/:clientId/logo', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const client = await storage.getClient(parseInt(clientId));
    
    if (!client || !client.logo) {
      return res.status(404).json({ error: 'Logo not found' });
    }

    // Resolve the logo file path
    const logoPath = path.join(process.cwd(), client.logo.startsWith('/') ? client.logo.substring(1) : client.logo);
    
    // Check if file exists
    if (!fs.existsSync(logoPath)) {
      console.log(`❌ Logo file not found: ${logoPath}`);
      return res.status(404).json({ error: 'Logo file not found' });
    }

    // Set appropriate content type based on file extension
    const ext = logoPath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'jpg' || ext === 'jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === 'png') {
      contentType = 'image/png';
    } else if (ext === 'gif') {
      contentType = 'image/gif';
    } else if (ext === 'webp') {
      contentType = 'image/webp';
    } else if (ext === 'svg') {
      contentType = 'image/svg+xml';
    }

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Send the file
    res.sendFile(logoPath, (err) => {
      if (err) {
        console.error(`❌ Error sending logo file: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error serving logo file' });
        }
      } else {
        console.log(`✅ Logo served via API for client ${clientId}`);
      }
    });
  } catch (error) {
    console.error('Error serving logo:', error);
    res.status(500).json({ 
      error: 'Failed to serve logo',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Upload client logo
 * POST /api/clients/:clientId/logo
 */
router.post('/:clientId/logo', requireAuthHybrid, logoUpload.single('logo'), async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const file = (req as any).file;

    if (!file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        message: 'Please select an image file to upload'
      });
    }

    // Get the existing client to check if it exists
    const existingClient = await storage.getClient(parseInt(clientId));
    if (!existingClient) {
      // Delete the uploaded file if client doesn't exist
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(404).json({ error: 'Client not found' });
    }

    // Delete old logo if it exists
    if (existingClient.logo) {
      const oldLogoPath = path.join(process.cwd(), existingClient.logo);
      if (fs.existsSync(oldLogoPath)) {
        try {
          fs.unlinkSync(oldLogoPath);
        } catch (error) {
          console.warn('Could not delete old logo file:', error);
        }
      }
    }

    // Store relative path from project root
    const logoPath = `/uploads/client-logos/${file.filename}`;

    // Update client with logo path
    const updatedClient = await storage.updateClient(parseInt(clientId), {
      logo: logoPath
    });

    console.log(`✅ Logo uploaded for client ${clientId}: ${logoPath}`);

    res.json({
      success: true,
      client: updatedClient,
      logo: logoPath,
      message: 'Logo uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading logo:', error);
    // Delete uploaded file on error
    if ((req as any).file && fs.existsSync((req as any).file.path)) {
      fs.unlinkSync((req as any).file.path);
    }
    res.status(500).json({ 
      error: 'Failed to upload logo',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Delete client logo
 * DELETE /api/clients/:clientId/logo
 */
router.delete('/:clientId/logo', requireAuthHybrid, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const existingClient = await storage.getClient(parseInt(clientId));
    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Delete logo file if it exists
    if (existingClient.logo) {
      const logoPath = path.join(process.cwd(), existingClient.logo);
      if (fs.existsSync(logoPath)) {
        try {
          fs.unlinkSync(logoPath);
        } catch (error) {
          console.warn('Could not delete logo file:', error);
        }
      }
    }

    // Update client to remove logo path
    const updatedClient = await storage.updateClient(parseInt(clientId), {
      logo: null
    });

    res.json({
      success: true,
      client: updatedClient,
      message: 'Logo deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ 
      error: 'Failed to delete logo',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;