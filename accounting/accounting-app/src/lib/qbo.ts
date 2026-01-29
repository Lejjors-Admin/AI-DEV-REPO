// QuickBooks Online Integration functions
import { apiRequest } from "./queryClient";

// QBO Authentication
export async function authenticateWithQBO() {
  try {
    // Initiate QBO OAuth flow
    // In a real application, this would redirect to QuickBooks authorization page
    // and handle the OAuth callback
    const response = await apiRequest("GET", "/api/qbo/auth");
    return response;
  } catch (error) {
    throw new Error("Failed to authenticate with QuickBooks Online");
  }
}

// Sync QBO data for a client
export async function syncQBOData(clientId: number) {
  try {
    const response = await apiRequest("POST", `/api/qbo/sync/${clientId}`);
    return response;
  } catch (error) {
    throw new Error("Failed to sync QuickBooks Online data");
  }
}

// Get QBO integration status for a client
export async function getQBOIntegrationStatus(clientId: number) {
  try {
    const response = await apiRequest("GET", `/api/qbo/integrations/${clientId}`);
    return response;
  } catch (error) {
    throw new Error("Failed to get QuickBooks Online integration status");
  }
}

// Setup QBO integration for a client
export async function setupQBOIntegration(clientId: number, integrationData: any) {
  try {
    const response = await apiRequest("POST", "/api/qbo/integrations", {
      clientId,
      ...integrationData
    });
    return response;
  } catch (error) {
    throw new Error("Failed to setup QuickBooks Online integration");
  }
}
