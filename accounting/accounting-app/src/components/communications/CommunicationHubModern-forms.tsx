// Form Components for CommunicationHubModern
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, X, ChevronDown, Users, Phone, Edit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Recipient Selector Component with Multi-Select
function RecipientSelector({
  selectedRecipients,
  onRecipientsChange
}: {
  selectedRecipients: any[];
  onRecipientsChange: (recipients: any[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all team members for selection
  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/communication/users/search', ''],
    queryFn: async () => {
      const response = await fetch('/api/communication/users/search?q=');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  // Filter users based on search term
  const filteredUsers = allUsers.filter((user: any) => {
    const searchLower = searchTerm.toLowerCase();
    const isAlreadySelected = selectedRecipients.some(r => r.id === user.id);
    return !isAlreadySelected && (
      user.name?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addRecipient = (user: any) => {
    onRecipientsChange([...selectedRecipients, user]);
    setSearchTerm("");
  };

  const removeRecipient = (userId: number) => {
    onRecipientsChange(selectedRecipients.filter(r => r.id !== userId));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Users className="h-4 w-4" />
        To *
      </label>
      
      {/* Selected Recipients Chips */}
      {selectedRecipients.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50">
          {selectedRecipients.map(recipient => (
            <Badge 
              key={recipient.id} 
              variant="secondary" 
              className="flex items-center gap-1 px-2 py-1"
            >
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                {recipient.name?.charAt(0) || recipient.username?.charAt(0)}
              </div>
              <span className="text-sm">{recipient.name || recipient.username}</span>
              <button
                type="button"
                onClick={() => removeRecipient(recipient.id)}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown Selector */}
      <div ref={dropdownRef} className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="w-full border rounded-md p-2 cursor-pointer flex items-center justify-between hover:border-gray-400 bg-white"
        >
          <span className="text-sm text-gray-500">
            {selectedRecipients.length === 0 
              ? "Select team members..." 
              : `${selectedRecipients.length} recipient${selectedRecipients.length > 1 ? 's' : ''} selected`}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b">
              <Input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>

            {/* User List */}
            <div className="overflow-y-auto max-h-48">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user: any) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => addRecipient(user)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                      {user.name?.charAt(0) || user.username?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{user.name || user.username}</div>
                      <div className="text-xs text-gray-500">{user.email || `@${user.username}`}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">{user.role}</Badge>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  {searchTerm ? 'No users found' : 'All team members selected'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {selectedRecipients.length === 0 && (
        <p className="text-xs text-gray-500">Select at least one recipient for this message</p>
      )}
    </div>
  );
}

// Contact Selector Component for SMS/WhatsApp
function ContactSelector({
  clients,
  selectedContact,
  phoneNumber,
  onContactChange,
  onPhoneChange,
  placeholder = "+1234567890",
  label = "Phone Number *",
  formatAsWhatsApp = false
}: {
  clients: any[];
  selectedContact: any | null;
  phoneNumber: string;
  onContactChange: (contact: any | null) => void;
  onPhoneChange: (phone: string) => void;
  placeholder?: string;
  label?: string;
  formatAsWhatsApp?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter clients that have phone numbers
  const clientsWithPhones = clients.filter((client: any) => client.phoneNumber);

  // Filter contacts based on search term
  const filteredContacts = clientsWithPhones.filter((client: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.name?.toLowerCase().includes(searchLower) ||
      client.phoneNumber?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower)
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectContact = (client: any) => {
    onContactChange(client);
    let phone = client.phoneNumber;
    // Format for WhatsApp if needed
    if (formatAsWhatsApp && phone && !phone.startsWith('whatsapp:')) {
      phone = `whatsapp:${phone}`;
    }
    onPhoneChange(phone);
    setIsOpen(false);
    setIsCustomMode(false);
  };

  const toggleCustomMode = () => {
    setIsCustomMode(!isCustomMode);
    if (!isCustomMode) {
      onContactChange(null);
      onPhoneChange('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <Phone className="h-4 w-4" />
          {label}
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleCustomMode}
          className="text-xs"
        >
          {isCustomMode ? (
            <>
              <Users className="h-3 w-3 mr-1" />
              Select Contact
            </>
          ) : (
            <>
              <Edit className="h-3 w-3 mr-1" />
              Custom Number
            </>
          )}
        </Button>
      </div>

      {isCustomMode ? (
        // Custom number input mode
        <div>
          <Input
            type="tel"
            value={phoneNumber}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder={placeholder}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {formatAsWhatsApp 
              ? "Format: whatsapp:+1234567890 (include whatsapp: prefix)"
              : "Include country code (e.g., +1 for US/Canada)"}
          </p>
        </div>
      ) : (
        // Contact selector mode
        <>
          {selectedContact && (
            <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                {selectedContact.name?.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{selectedContact.name}</div>
                <div className="text-xs text-gray-500">{phoneNumber}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onContactChange(null);
                  onPhoneChange('');
                }}
                className="hover:bg-gray-200 rounded-full p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div ref={dropdownRef} className="relative">
            <div
              onClick={() => setIsOpen(!isOpen)}
              className="w-full border rounded-md p-2 cursor-pointer flex items-center justify-between hover:border-gray-400 bg-white"
            >
              <span className="text-sm text-gray-500">
                {selectedContact ? "Change contact..." : clientsWithPhones.length > 0 ? "Select a contact..." : "No contacts with phone numbers"}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && clientsWithPhones.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-hidden">
                <div className="p-2 border-b">
                  <Input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                    autoFocus
                  />
                </div>

                <div className="overflow-y-auto max-h-48">
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map((client: any) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => selectContact(client)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                      >
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                          {client.name?.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{client.name}</div>
                          <div className="text-xs text-gray-500">{client.phoneNumber}</div>
                        </div>
                        <Phone className="h-4 w-4 text-gray-400" />
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-gray-500">
                      No contacts found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// New Message Form Component
export function NewMessageForm({ 
  clients, 
  projects, 
  onSubmit, 
  isPending,
  onCancel,
  MentionTextarea
}: { 
  clients: any[];
  projects: any[];
  onSubmit: (data: any) => void;
  isPending: boolean;
  onCancel: () => void;
  MentionTextarea: any;
}) {
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    clientId: '',
    projectId: '',
    priority: 'normal'
  });
  const [selectedRecipients, setSelectedRecipients] = useState<any[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: any = {
      content: formData.content,
      priority: formData.priority,
      recipientIds: selectedRecipients.map(r => r.id)
    };
    
    if (formData.subject) submitData.subject = formData.subject;
    if (formData.clientId) submitData.clientId = Number(formData.clientId);
    if (formData.projectId) submitData.projectId = Number(formData.projectId);
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Subject (Optional)</label>
        <Input
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Enter subject..."
        />
      </div>

      {/* Recipient Selector */}
      <RecipientSelector
        selectedRecipients={selectedRecipients}
        onRecipientsChange={setSelectedRecipients}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Client (Optional)</label>
          <select
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            className="w-full border rounded-md p-2"
          >
            <option value="">No client</option>
            {clients.map((client: any) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Project (Optional)</label>
          <select
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            className="w-full border rounded-md p-2"
          >
            <option value="">No project</option>
            {projects.map((project: any) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Priority</label>
        <select
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
          className="w-full border rounded-md p-2"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Message *</label>
        <MentionTextarea
          value={formData.content}
          onChange={(value: string) => setFormData({ ...formData, content: value })}
          placeholder="Type your message... Use @ to mention team members"
          required={true}
          className="w-full border rounded-md p-2 min-h-[120px]"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || !formData.content.trim() || selectedRecipients.length === 0}
        >
          {isPending ? 'Sending...' : 'Send Message'}
        </Button>
      </div>
    </form>
  );
}

// SMS Form Component
export function SmsForm({ 
  clients, 
  projects, 
  onSubmit, 
  isPending,
  onCancel 
}: { 
  clients: any[];
  projects: any[];
  onSubmit: (data: { to: string; body: string; clientId?: number; projectId?: number; templateId?: number; variables?: any }) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    body: '',
    projectId: ''
  });

  // Fetch SMS templates
  const { data: templatesData } = useQuery({
    queryKey: ['/api/communication/sms/templates'],
  });

  const templates = templatesData?.templates || [];

  const handleContactChange = (contact: any | null) => {
    setSelectedContact(contact);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (!templateId) {
      setFormData({ ...formData, body: '' });
      setTemplateVariables({});
      return;
    }

    const template = templates.find((t: any) => t.id === parseInt(templateId));
    if (template) {
      setFormData({ ...formData, body: template.content });
      
      // Initialize template variables
      const vars: Record<string, string> = {};
      if (template.variables && Array.isArray(template.variables)) {
        template.variables.forEach((v: any) => {
          vars[v.name] = v.defaultValue || '';
        });
      }
      setTemplateVariables(vars);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: any = {
      to: phoneNumber,
      body: formData.body
    };
    
    // Auto-link to selected contact if available
    if (selectedContact) submitData.clientId = Number(selectedContact.id);
    if (formData.projectId) submitData.projectId = Number(formData.projectId);
    
    // Include template data if using a template
    if (selectedTemplateId) {
      submitData.templateId = parseInt(selectedTemplateId);
      submitData.variables = templateVariables;
    }
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ContactSelector
        clients={clients}
        selectedContact={selectedContact}
        phoneNumber={phoneNumber}
        onContactChange={handleContactChange}
        onPhoneChange={setPhoneNumber}
        placeholder="+1234567890"
        label="Phone Number *"
        formatAsWhatsApp={false}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium">Project (Optional)</label>
        <select
          value={formData.projectId}
          onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
          className="w-full border rounded-md p-2"
        >
          <option value="">No project</option>
          {projects.map((project: any) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Template Selector */}
      {templates.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Use Template (Optional)</label>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full border rounded-md p-2"
            data-testid="select-sms-template"
          >
            <option value="">No template (custom message)</option>
            {templates.map((template: any) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.category})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Template Variables */}
      {selectedTemplateId && templates.find((t: any) => t.id === parseInt(selectedTemplateId))?.variables?.length > 0 && (
        <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm font-medium text-blue-900">Template Variables</p>
          {templates.find((t: any) => t.id === parseInt(selectedTemplateId))?.variables.map((variable: any) => (
            <div key={variable.name} className="space-y-1">
              <label className="text-xs font-medium text-blue-800">{variable.name}</label>
              <Input
                value={templateVariables[variable.name] || ''}
                onChange={(e) => setTemplateVariables({ ...templateVariables, [variable.name]: e.target.value })}
                placeholder={variable.description || `Enter ${variable.name}`}
                className="text-sm"
                data-testid={`input-template-variable-${variable.name}`}
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Message *</label>
        <textarea
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          placeholder="Type your SMS message..."
          required
          className="w-full border rounded-md p-2 min-h-[100px]"
          maxLength={160}
          disabled={!!selectedTemplateId}
        />
        <p className="text-xs text-gray-500">
          {formData.body.length}/160 characters
          {selectedTemplateId && ' (Template selected - edit disabled)'}
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || !phoneNumber.trim() || !formData.body.trim()}
        >
          {isPending ? 'Sending...' : 'Send SMS'}
        </Button>
      </div>
    </form>
  );
}

// WhatsApp Form Component
export function WhatsAppForm({ 
  clients, 
  projects, 
  onSubmit, 
  isPending,
  onCancel 
}: { 
  clients: any[];
  projects: any[];
  onSubmit: (data: { to: string; body: string; clientId?: number; projectId?: number; mediaUrl?: string }) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formData, setFormData] = useState({
    body: '',
    projectId: '',
    mediaUrl: ''
  });

  const handleContactChange = (contact: any | null) => {
    setSelectedContact(contact);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: any = {
      to: phoneNumber,
      body: formData.body
    };
    
    // Auto-link to selected contact if available
    if (selectedContact) submitData.clientId = Number(selectedContact.id);
    if (formData.projectId) submitData.projectId = Number(formData.projectId);
    if (formData.mediaUrl) submitData.mediaUrl = formData.mediaUrl;
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ContactSelector
        clients={clients}
        selectedContact={selectedContact}
        phoneNumber={phoneNumber}
        onContactChange={handleContactChange}
        onPhoneChange={setPhoneNumber}
        placeholder="whatsapp:+1234567890"
        label="WhatsApp Number *"
        formatAsWhatsApp={true}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium">Project (Optional)</label>
        <select
          value={formData.projectId}
          onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
          className="w-full border rounded-md p-2"
        >
          <option value="">No project</option>
          {projects.map((project: any) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Message *</label>
        <textarea
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          placeholder="Type your WhatsApp message..."
          required
          className="w-full border rounded-md p-2 min-h-[100px]"
        />
        <p className="text-xs text-gray-500">{formData.body.length} characters</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Media URL (Optional)</label>
        <Input
          type="url"
          value={formData.mediaUrl}
          onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
          placeholder="https://example.com/image.jpg"
        />
        <p className="text-xs text-gray-500">Attach an image or document URL</p>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || !phoneNumber.trim() || !formData.body.trim()}
        >
          {isPending ? 'Sending...' : 'Send WhatsApp'}
        </Button>
      </div>
    </form>
  );
}
