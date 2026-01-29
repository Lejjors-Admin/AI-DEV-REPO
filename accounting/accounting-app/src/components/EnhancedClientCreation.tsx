import React, { useState, useMemo, useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Building, 
  Calendar,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Move,
  ChevronDown,
  Users,
  User,
  Heart,
  Sparkles,
  Plus,
  X
} from "lucide-react";
import {insertClientSchema} from "@/schemas/client";

// Standalone ProjectYears field component to avoid hooks order issues
const ProjectYearsField = ({ clientType, onChange, value, availableYears }: { 
  clientType: string | undefined; 
  onChange: (value: string[]) => void;
  value: string[];
  availableYears: string[];
}) => {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium leading-none">Years for Projects</label>
      <div className="grid grid-cols-3 gap-3">
        {availableYears.map((year) => (
          <div key={year} className="flex items-center space-x-2 p-2 border rounded-md">
            <Checkbox
              id={`project-year-${year}`}
              checked={value?.includes(year) || false}
              onCheckedChange={(checked) => {
                const currentYears = value || [];
                if (checked) {
                  onChange([...currentYears, year]);
                } else {
                  onChange(currentYears.filter((y: string) => y !== year));
                }
              }}
            />
            <label
              htmlFor={`project-year-${year}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {year}
            </label>
          </div>
        ))}
      </div>
      {clientType === "individual" && (
        <p className="text-sm text-gray-500 mt-2">
          Years automatically selected from your Tax Filing Years selection
        </p>
      )}
    </div>
  );
};

// Standalone WorkType field component to avoid hooks order issues
const WorkTypeField = ({ clientType, onChange, value }: { 
  clientType: string | undefined; 
  onChange: (value: string[]) => void;
  value: string[];
}) => {
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [newCustomType, setNewCustomType] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);

  const baseOptions = clientType === "individual" 
    ? ["Personal Tax", "Sole Prop"]
    : ["Bookkeeping", "Year End", "Review", "Audit", "Consulting"];

  const allOptions = [...baseOptions, ...customTypes];

  const addCustomType = () => {
    if (newCustomType.trim() && !allOptions.includes(newCustomType.trim())) {
      setCustomTypes([...customTypes, newCustomType.trim()]);
      setNewCustomType("");
      setShowAddCustom(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium leading-none">Type of Work (Multiple Selection)</label>
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-2">
          {allOptions.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`work-type-${type}`}
                checked={value?.includes(type) || false}
                onCheckedChange={(checked) => {
                  const currentTypes = value || [];
                  if (checked) {
                    onChange([...currentTypes, type]);
                  } else {
                    onChange(currentTypes.filter((t: string) => t !== type));
                  }
                }}
              />
              <label
                htmlFor={`work-type-${type}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {type}
              </label>
            </div>
          ))}
        </div>

        {showAddCustom ? (
          <div className="flex gap-2">
            <Input
              value={newCustomType}
              onChange={(e) => setNewCustomType(e.target.value)}
              placeholder="Enter custom work type"
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && addCustomType()}
            />
            <Button type="button" onClick={addCustomType} size="sm">
              Add
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setShowAddCustom(false);
                setNewCustomType("");
              }} 
              size="sm"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddCustom(true)}
            className="text-blue-600 hover:text-blue-700"
          >
            + Add Custom Type
          </Button>
        )}
      </div>
    </div>
  );
};

// Multi-select dropdown component for work types
const WorkTypeMultiSelect = ({ value, onChange }: { value: string[], onChange: (value: string[]) => void }) => {
  const [customType, setCustomType] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const defaultTypes = ["Bookkeeping", "Year End", "Review", "Audit", "Consulting"];
  
  const handleTypeToggle = (type: string) => {
    if (value.includes(type)) {
      onChange(value.filter(t => t !== type));
    } else {
      onChange([...value, type]);
    }
  };
  
  const handleAddCustom = () => {
    if (customType.trim() && !value.includes(customType.trim())) {
      onChange([...value, customType.trim()]);
      setCustomType("");
      setShowCustomInput(false);
    }
  };
  
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Type of Work (Multiple Selection)</label>
      <div className="border rounded-md">
        <div className="p-3 space-y-2">
          {defaultTypes.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`work-${type}`}
                checked={value.includes(type)}
                onCheckedChange={() => handleTypeToggle(type)}
              />
              <label htmlFor={`work-${type}`} className="text-sm flex-1 cursor-pointer">
                {type}
              </label>
            </div>
          ))}
          {value.filter(v => !defaultTypes.includes(v)).map((customType) => (
            <div key={customType} className="flex items-center space-x-2">
              <Checkbox
                checked={true}
                onCheckedChange={() => handleTypeToggle(customType)}
              />
              <label className="text-sm flex-1 cursor-pointer">{customType}</label>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full text-left py-1 text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Custom Type
              </button>
            ) : (
              <div className="space-y-2">
                <Input
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="Enter custom work type"
                  className="h-8"
                />
                <div className="flex space-x-2">
                  <Button type="button" size="sm" onClick={handleAddCustom}>Add</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setShowCustomInput(false); setCustomType(""); }}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((type) => (
            <span key={type} className="bg-primary/10 text-primary px-2 py-1 rounded text-xs flex items-center gap-1">
              {type}
              <button type="button" onClick={() => handleTypeToggle(type)} className="hover:bg-primary/20 rounded-full w-4 h-4 flex items-center justify-center">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// Extended schema for client creation with manual entry
const clientCreationSchema = insertClientSchema.extend({
  // Ensure name is required and not empty
  name: z.string().min(1, "Client name is required"),
  
  // Client type selection
  clientType: z.enum(["individual", "business"]).default("business"),
  
  // Project creation fields
  projectYears: z.array(z.string()).default([]), // Array of years like ["2023", "2024", "2025"]
  fiscalYearEnd: z.string().optional(),
  workType: z.array(z.string()).default([]), // Multiple work types allowed
  
  // Tax Filing Years (separate from project years)
  taxFilingYears: z.array(z.string()).default([]), // Tax filing years for Individual clients
  
  // Detailed Address Components (all optional for flexibility)
  addressCountry: z.string().optional(),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressStateProvince: z.string().optional(),
  addressPostalCode: z.string().optional(),
  
  // Personal Tax Fields for Individual Clients
  socialInsuranceNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  maritalStatus: z.string().optional(),
  spouseName: z.string().optional(),
  spouseSin: z.string().optional(),
  spouseDateOfBirth: z.string().optional(),
  isCitizen: z.string().optional(),
  maritalStatusChanged: z.string().optional(),
  maritalStatusChangeDate: z.string().optional(),
  electionsCanadaAuthorization: z.string().optional(),
  
  // Dependants Information
  hasDependants: z.string().optional(),
  dependants: z.array(z.object({
    name: z.string(),
    relationship: z.string(),
    dateOfBirth: z.string(),
    socialInsuranceNumber: z.string().optional(),
    income: z.string().optional(),
    disabilityAmount: z.string().optional(),
    childCareBenefits: z.string().optional(),
    tuitionFees: z.string().optional(),
  })).default([]),
  
  // Manual entry - all standard client fields are required
  notes: z.string().optional(),
});

type ClientCreationFormData = z.infer<typeof clientCreationSchema>;

interface EnhancedClientCreationProps {
  isOpen: boolean;
  onComplete: (client: any) => void;
  onCancel: () => void;
}

// NAICS Canada 2017 Version 3.0 Industry Database - Complete list with consulting services
const NAICS_INDUSTRIES = [
  // Agriculture, Forestry, Fishing and Hunting (11)
  { code: "111110", name: "Soybean farming" },
  { code: "111120", name: "Oilseed (except soybean) farming" },
  { code: "111130", name: "Dry pea and bean farming" },
  { code: "111140", name: "Wheat farming" },
  { code: "111150", name: "Corn farming" },
  { code: "111160", name: "Rice farming" },
  { code: "111190", name: "Other grain farming" },
  { code: "111211", name: "Potato farming" },
  { code: "111219", name: "Other vegetable (except potato) and melon farming" },
  { code: "111310", name: "Orange groves" },
  { code: "111320", name: "Citrus (except orange) groves" },
  { code: "111330", name: "Non-citrus fruit and tree nut farming" },
  { code: "111411", name: "Mushroom production" },
  { code: "111412", name: "Cannabis grown under cover" },
  { code: "111419", name: "Other food crops grown under cover" },
  { code: "111421", name: "Nursery and tree production" },
  { code: "111422", name: "Floriculture production" },
  { code: "111910", name: "Tobacco farming" },
  { code: "111920", name: "Cotton farming" },
  { code: "111930", name: "Sugar cane farming" },
  { code: "111940", name: "Hay farming" },
  { code: "111993", name: "Fruit and vegetable combination farming" },
  { code: "111994", name: "Maple syrup and products production" },
  { code: "111995", name: "Cannabis grown in open fields" },
  { code: "111999", name: "All other miscellaneous crop farming" },
  { code: "112110", name: "Beef cattle ranching and farming, including feedlots" },
  { code: "112120", name: "Dairy cattle and milk production" },
  { code: "112210", name: "Hog and pig farming" },
  { code: "112310", name: "Chicken egg production" },
  { code: "112320", name: "Broiler and other meat-type chicken production" },
  { code: "112330", name: "Turkey production" },
  { code: "112340", name: "Poultry hatcheries" },
  { code: "112390", name: "Other poultry production" },
  { code: "112410", name: "Sheep farming" },
  { code: "112420", name: "Goat farming" },
  { code: "112511", name: "Finfish farming and fish hatcheries" },
  { code: "112512", name: "Shellfish farming" },
  { code: "112519", name: "Other aquaculture" },
  { code: "112910", name: "Apiculture" },
  { code: "112920", name: "Horse and other equine production" },
  { code: "112930", name: "Fur-bearing animal and rabbit production" },
  { code: "112991", name: "Combination livestock farming" },
  { code: "112999", name: "All other miscellaneous animal production" },
  { code: "113110", name: "Timber tract operations" },
  { code: "113210", name: "Forest nurseries and gathering of forest products" },
  { code: "113310", name: "Logging" },
  { code: "114110", name: "Fishing" },
  { code: "114210", name: "Hunting and trapping" },
  { code: "115110", name: "Support activities for crop production" },
  { code: "115210", name: "Support activities for animal production" },
  { code: "115310", name: "Support activities for forestry" },

  // Mining, Quarrying, and Oil and Gas Extraction (21)
  { code: "211110", name: "Oil and gas extraction" },
  { code: "212114", name: "Bituminous coal mining" },
  { code: "212115", name: "Sub-bituminous coal mining" },
  { code: "212116", name: "Lignite coal mining" },
  { code: "212220", name: "Iron ore mining" },
  { code: "212231", name: "Lead-zinc ore mining" },
  { code: "212232", name: "Nickel-copper ore mining" },
  { code: "212233", name: "Copper-zinc ore mining" },
  { code: "212299", name: "All other metal ore mining" },
  { code: "212314", name: "Granite quarrying and crushing" },
  { code: "212315", name: "Limestone quarrying and crushing" },
  { code: "212316", name: "Marble quarrying and crushing" },
  { code: "212317", name: "Sandstone quarrying and crushing" },
  { code: "212318", name: "Other stone quarrying and crushing" },
  { code: "212323", name: "Sand and gravel mining" },
  { code: "212326", name: "Shale, clay and refractory mineral mining" },
  { code: "212392", name: "Diamond mining" },
  { code: "212393", name: "Salt mining" },
  { code: "212394", name: "Asbestos mining" },
  { code: "212395", name: "Gypsum mining" },
  { code: "212396", name: "Potash mining" },
  { code: "212397", name: "Peat extraction" },
  { code: "212398", name: "All other non-metallic mineral mining" },
  { code: "213111", name: "Drilling oil and gas wells" },
  { code: "213112", name: "Support activities for oil and gas extraction" },
  { code: "213117", name: "Contract drilling (except oil and gas)" },
  { code: "213118", name: "Other support activities for mining" },

  // Utilities (22)
  { code: "221111", name: "Hydroelectric power generation" },
  { code: "221112", name: "Fossil fuel electric power generation" },
  { code: "221113", name: "Nuclear electric power generation" },
  { code: "221119", name: "Other electric power generation" },
  { code: "221121", name: "Electric bulk power transmission and control" },
  { code: "221122", name: "Electric power distribution" },
  { code: "221210", name: "Natural gas distribution" },
  { code: "221310", name: "Water supply and irrigation systems" },
  { code: "221320", name: "Sewage treatment facilities" },
  { code: "221330", name: "Steam and air-conditioning supply" },

  // Construction (23)
  { code: "236110", name: "Residential building construction" },
  { code: "236210", name: "Industrial building construction" },
  { code: "236220", name: "Commercial and institutional building construction" },
  { code: "237110", name: "Water and sewer line and related structures construction" },
  { code: "237120", name: "Oil and gas pipeline and related structures construction" },
  { code: "237130", name: "Power and communication line and related structures construction" },
  { code: "237210", name: "Land subdivision" },
  { code: "237310", name: "Highway, street and bridge construction" },
  { code: "237990", name: "Other heavy and civil engineering construction" },
  { code: "238110", name: "Poured concrete foundation and structure contractors" },
  { code: "238120", name: "Structural steel and precast concrete contractors" },
  { code: "238130", name: "Framing contractors" },
  { code: "238140", name: "Masonry contractors" },
  { code: "238150", name: "Glass and glazing contractors" },
  { code: "238160", name: "Roofing contractors" },
  { code: "238170", name: "Siding contractors" },
  { code: "238190", name: "Other foundation, structure and building exterior contractors" },
  { code: "238210", name: "Electrical contractors and other wiring installation contractors" },
  { code: "238220", name: "Plumbing, heating and air-conditioning contractors" },
  { code: "238290", name: "Other building equipment contractors" },
  { code: "238310", name: "Drywall and insulation contractors" },
  { code: "238320", name: "Painting and wall covering contractors" },
  { code: "238330", name: "Flooring contractors" },
  { code: "238340", name: "Tile and terrazzo contractors" },
  { code: "238350", name: "Finish carpentry contractors" },
  { code: "238390", name: "Other building finishing contractors" },
  { code: "238910", name: "Site preparation contractors" },
  { code: "238990", name: "All other specialty trade contractors" },

  // Manufacturing (31-33) - Key industries
  { code: "311111", name: "Dog and cat food manufacturing" },
  { code: "311119", name: "Other animal food manufacturing" },
  { code: "311211", name: "Flour milling" },
  { code: "311214", name: "Rice milling" },
  { code: "311215", name: "Malt manufacturing" },
  { code: "311221", name: "Wet corn milling" },
  { code: "311224", name: "Soybean and other oilseed processing" },
  { code: "311225", name: "Fats and oils refining and blending" },
  { code: "311230", name: "Breakfast cereal manufacturing" },
  { code: "311310", name: "Sugar manufacturing" },
  { code: "311320", name: "Chocolate and confectionery manufacturing from cacao beans" },
  { code: "311330", name: "Confectionery manufacturing from purchased chocolate" },
  { code: "311340", name: "Non-chocolate confectionery manufacturing" },
  { code: "311410", name: "Frozen food manufacturing" },
  { code: "311420", name: "Fruit and vegetable canning, pickling and drying" },
  { code: "311511", name: "Fluid milk manufacturing" },
  { code: "311515", name: "Butter, cheese and dry and condensed dairy product manufacturing" },
  { code: "311520", name: "Ice cream and frozen dessert manufacturing" },
  { code: "311611", name: "Animal slaughtering" },
  { code: "311614", name: "Rendering and meat processing from carcasses" },
  { code: "311615", name: "Poultry processing" },
  { code: "311710", name: "Seafood product preparation and packaging" },
  { code: "311811", name: "Retail bakeries" },
  { code: "311814", name: "Commercial bakeries and frozen cakes and other pastries manufacturing" },
  { code: "311821", name: "Cookie and cracker manufacturing" },
  { code: "311824", name: "Dry pasta, dough and flour mixes manufacturing from purchased flour" },
  { code: "311830", name: "Tortilla manufacturing" },
  { code: "311910", name: "Snack food manufacturing" },
  { code: "311920", name: "Coffee and tea manufacturing" },
  { code: "311930", name: "Flavouring syrup and concentrate manufacturing" },
  { code: "311940", name: "Seasoning and dressing manufacturing" },
  { code: "311990", name: "All other food manufacturing" },

  // Wholesale Trade (41)
  { code: "411110", name: "Live animal merchant wholesalers" },
  { code: "411120", name: "Oilseed and grain merchant wholesalers" },
  { code: "411130", name: "Nursery stock and plant merchant wholesalers" },
  { code: "411190", name: "Other farm product merchant wholesalers" },
  { code: "412110", name: "Petroleum and petroleum products merchant wholesalers" },
  { code: "413110", name: "Food merchant wholesalers" },
  { code: "413120", name: "Beverage merchant wholesalers" },
  { code: "413130", name: "Cigarette and tobacco product merchant wholesalers" },
  { code: "414110", name: "Clothing and clothing accessories merchant wholesalers" },
  { code: "414120", name: "Footwear merchant wholesalers" },
  { code: "414130", name: "Personal goods merchant wholesalers" },
  { code: "414210", name: "Drugs, drug proprietaries, and druggists' sundries merchant wholesalers" },
  { code: "414220", name: "Toiletries, cosmetics and sundries merchant wholesalers" },
  { code: "414310", name: "Piece goods, notions, and other dry goods merchant wholesalers" },
  { code: "414320", name: "Men's and boys' clothing and furnishings merchant wholesalers" },
  { code: "414330", name: "Women's, children's, and infants' clothing and accessories merchant wholesalers" },
  { code: "414340", name: "Footwear merchant wholesalers" },
  { code: "414390", name: "Other clothing and clothing accessories merchant wholesalers" },
  { code: "414410", name: "Home entertainment equipment and household appliance merchant wholesalers" },
  { code: "414420", name: "Household goods merchant wholesalers" },
  { code: "414430", name: "Linen, drapery and other textile furnishings merchant wholesalers" },
  { code: "414440", name: "China, glassware, crockery and pottery merchant wholesalers" },
  { code: "414450", name: "Floor covering merchant wholesalers" },
  { code: "414460", name: "Jewellery and watch merchant wholesalers" },
  { code: "414470", name: "Artwork, collectible and curio merchant wholesalers" },
  { code: "414510", name: "Pharmaceuticals and pharmacy supplies merchant wholesalers" },
  { code: "414520", name: "Toiletries, cosmetics and sundries merchant wholesalers" },

  // Retail Trade (44-45)
  { code: "441110", name: "New car dealers" },
  { code: "441120", name: "Used car dealers" },
  { code: "441210", name: "Recreational vehicle dealers" },
  { code: "441220", name: "Motorcycle, boat and other motor vehicle dealers" },
  { code: "441310", name: "Automotive parts and accessories stores" },
  { code: "441320", name: "Tire dealers" },
  { code: "442110", name: "Furniture stores" },
  { code: "442210", name: "Floor covering stores" },
  { code: "442291", name: "Window treatment stores" },
  { code: "442292", name: "Print and picture frame stores" },
  { code: "442298", name: "All other home furnishings stores" },
  { code: "443111", name: "Household appliance stores" },
  { code: "443112", name: "Radio, television and other electronics stores" },
  { code: "443210", name: "Computer and software stores" },
  { code: "443220", name: "Camera and photographic supplies stores" },
  { code: "444110", name: "Home centres" },
  { code: "444120", name: "Paint and wallpaper stores" },
  { code: "444130", name: "Hardware stores" },
  { code: "444190", name: "Other building material dealers" },
  { code: "444210", name: "Outdoor power equipment stores" },
  { code: "444220", name: "Nursery stores and garden centres" },
  { code: "445110", name: "Supermarkets and other grocery (except convenience) stores" },
  { code: "445120", name: "Convenience stores" },
  { code: "445210", name: "Meat markets" },
  { code: "445220", name: "Fish and seafood markets" },
  { code: "445230", name: "Fruit and vegetable markets" },
  { code: "445291", name: "Baked goods stores" },
  { code: "445292", name: "Confectionery and nut stores" },
  { code: "445299", name: "All other specialty food stores" },
  { code: "445310", name: "Beer, wine and liquor stores" },
  { code: "446110", name: "Pharmacies and drug stores" },
  { code: "446120", name: "Cosmetics, beauty supplies and perfume stores" },
  { code: "446130", name: "Optical goods stores" },
  { code: "446191", name: "Food (health) supplement stores" },
  { code: "446199", name: "All other health and personal care stores" },
  { code: "447110", name: "Gasoline stations with convenience stores" },
  { code: "447190", name: "Other gasoline stations" },
  { code: "448110", name: "Men's clothing stores" },
  { code: "448120", name: "Women's clothing stores" },
  { code: "448130", name: "Children's and infants' clothing stores" },
  { code: "448140", name: "Family clothing stores" },
  { code: "448150", name: "Clothing accessories stores" },
  { code: "448191", name: "Fur stores" },
  { code: "448199", name: "All other clothing stores" },
  { code: "448210", name: "Shoe stores" },
  { code: "448310", name: "Jewellery stores" },
  { code: "448320", name: "Luggage and leather goods stores" },

  // Professional, Scientific and Technical Services (541) - COMPREHENSIVE CONSULTING SERVICES
  { code: "541110", name: "Offices of lawyers" },
  { code: "541120", name: "Offices of notaries" },
  { code: "541191", name: "Title abstract and settlement offices" },
  { code: "541199", name: "All other legal services" },
  { code: "541211", name: "Offices of certified public accountants" },
  { code: "541212", name: "Offices of other holding companies" },
  { code: "541213", name: "Tax preparation services" },
  { code: "541214", name: "Payroll services" },
  { code: "541215", name: "Bookkeeping services" },
  { code: "541219", name: "Other accounting services" },
  { code: "541310", name: "Architectural services" },
  { code: "541320", name: "Landscape architectural services" },
  { code: "541330", name: "Engineering services" },
  { code: "541340", name: "Drafting services" },
  { code: "541350", name: "Building inspection services" },
  { code: "541360", name: "Geophysical surveying and mapping services" },
  { code: "541370", name: "Surveying and mapping (except geophysical) services" },
  { code: "541380", name: "Testing laboratories" },
  { code: "541410", name: "Interior design services" },
  { code: "541420", name: "Industrial design services" },
  { code: "541430", name: "Graphic design services" },
  { code: "541490", name: "Other specialized design services" },
  { code: "541511", name: "Custom computer programming services" },
  { code: "541512", name: "Computer systems design services" },
  { code: "541513", name: "Computer facilities management services" },
  { code: "541519", name: "Other computer related services" },
  
  // MANAGEMENT CONSULTING SERVICES - Core consulting industries
  { code: "541611", name: "Administrative management and general management consulting services" },
  { code: "541612", name: "Human resources consulting services" },
  { code: "541619", name: "Other management consulting services" },
  { code: "541620", name: "Environmental consulting services" },
  { code: "541690", name: "Other scientific and technical consulting services" },
  
  { code: "541710", name: "Research and development in the physical, engineering and life sciences" },
  { code: "541720", name: "Research and development in the social sciences and humanities" },
  { code: "541810", name: "Advertising agencies" },
  { code: "541820", name: "Public relations agencies" },
  { code: "541830", name: "Media buying agencies" },
  { code: "541840", name: "Media representatives" },
  { code: "541850", name: "Display advertising" },
  { code: "541860", name: "Direct mail advertising" },
  { code: "541870", name: "Advertising material distribution services" },
  { code: "541890", name: "Other services related to advertising" },
  { code: "541910", name: "Marketing research and public opinion polling" },
  { code: "541920", name: "Photographic services" },
  { code: "541930", name: "Translation and interpretation services" },
  { code: "541940", name: "Veterinary services" },
  { code: "541990", name: "All other professional, scientific and technical services" },

  // Information and Cultural Industries (51)
  { code: "511110", name: "Newspaper publishers" },
  { code: "511120", name: "Periodical publishers" },
  { code: "511130", name: "Book publishers" },
  { code: "511140", name: "Directory and mailing list publishers" },
  { code: "511190", name: "Other publishers" },
  { code: "511210", name: "Software publishers" },
  { code: "512110", name: "Motion picture and video production" },
  { code: "512120", name: "Motion picture and video distribution" },
  { code: "512130", name: "Motion picture and video exhibition" },
  { code: "512190", name: "Post-production and other motion picture and video industries" },
  { code: "512210", name: "Record production" },
  { code: "512220", name: "Integrated record production/distribution" },
  { code: "512230", name: "Music publishers" },
  { code: "512240", name: "Sound recording studios" },
  { code: "512290", name: "Other sound recording industries" },
  { code: "515110", name: "Radio broadcasting" },
  { code: "515120", name: "Television broadcasting" },
  { code: "515210", name: "Pay and specialty television" },
  { code: "517111", name: "Wired telecommunications carriers" },
  { code: "517112", name: "Wireless telecommunications carriers (except satellite)" },
  { code: "517410", name: "Satellite telecommunications" },
  { code: "517910", name: "Other telecommunications" },
  { code: "518111", name: "Internet service providers and web search portals" },
  { code: "518112", name: "Web hosting and data processing services" },
  { code: "519110", name: "News syndicates" },
  { code: "519121", name: "Libraries and archives" },
  { code: "519122", name: "Internet publishing and broadcasting and web search portals" },
  { code: "519130", name: "Data processing, hosting and related services" },
  { code: "519190", name: "All other information services" },

  // Finance and Insurance (52)
  { code: "521110", name: "Monetary authorities - central bank" },
  { code: "522111", name: "Personal and commercial banking industry" },
  { code: "522112", name: "Corporate and institutional banking industry" },
  { code: "522130", name: "Local credit unions" },
  { code: "522210", name: "Credit card issuing" },
  { code: "522220", name: "Sales financing" },
  { code: "522291", name: "Consumer lending" },
  { code: "522299", name: "All other non-depository credit intermediation" },
  { code: "522310", name: "Mortgage and nonmortgage loan brokers" },
  { code: "522320", name: "Financial transactions processing, reserve, and clearinghouse activities" },
  { code: "522390", name: "Other activities related to credit intermediation" },
  { code: "523110", name: "Investment banking and securities dealing" },
  { code: "523120", name: "Securities brokerage" },
  { code: "523130", name: "Commodity contracts dealing" },
  { code: "523140", name: "Commodity contracts brokerage" },
  { code: "523210", name: "Securities and commodity exchanges" },
  { code: "523920", name: "Portfolio management" },
  { code: "523930", name: "Investment advice" },
  { code: "523990", name: "All other financial investment activities" },
  { code: "524111", name: "Direct life insurance carriers" },
  { code: "524112", name: "Direct health and medical insurance carriers" },
  { code: "524121", name: "Direct general property and casualty insurance carriers" },
  { code: "524122", name: "Direct, private, automobile insurance carriers" },
  { code: "524123", name: "Direct, government, automobile insurance carriers" },
  { code: "524124", name: "Direct property insurance carriers" },
  { code: "524125", name: "Direct liability insurance carriers" },
  { code: "524126", name: "Direct title insurance carriers" },
  { code: "524129", name: "Other direct insurance carriers" },
  { code: "524131", name: "Reinsurance carriers" },
  { code: "524132", name: "Third-party administration of insurance funds" },
  { code: "524133", name: "Insurance agencies and brokerages" },
  { code: "524134", name: "Claims adjusters" },
  { code: "524135", name: "All other insurance related activities" },
  { code: "526111", name: "Pension funds" },
  { code: "526112", name: "Open-end investment funds" },
  { code: "526113", name: "Closed-end investment funds" },
  { code: "526114", name: "Trusts" },
  { code: "526989", name: "All other funds and financial vehicles" },

  // Real Estate and Rental and Leasing (53)
  { code: "531111", name: "Lessors of residential buildings and dwellings" },
  { code: "531112", name: "Lessors of non-residential buildings (except mini-warehouses)" },
  { code: "531113", name: "Mini-warehouses and self-storage units" },
  { code: "531114", name: "Lessors of real estate (except buildings)" },
  { code: "531210", name: "Offices of real estate agents and brokers" },
  { code: "531311", name: "Residential property managers" },
  { code: "531312", name: "Non-residential property managers" },
  { code: "531320", name: "Offices of real estate appraisers" },
  { code: "531390", name: "Other activities related to real estate" },
  { code: "532111", name: "Passenger car rental" },
  { code: "532112", name: "Passenger car leasing" },
  { code: "532120", name: "Truck, utility trailer and RV (recreational vehicle) rental and leasing" },
  { code: "532210", name: "Consumer electronics and appliances rental" },
  { code: "532220", name: "Formal wear and costume rental" },
  { code: "532230", name: "Video tape and disc rental" },
  { code: "532240", name: "Other consumer goods rental" },
  { code: "532310", name: "General rental centres" },
  { code: "532320", name: "Construction, transportation, mining, and forestry machinery and equipment rental and leasing" },
  { code: "532330", name: "Office machinery and equipment rental and leasing" },
  { code: "532340", name: "Other commercial and industrial machinery and equipment rental and leasing" },
  { code: "533110", name: "Lessors of non-financial intangible assets (except copyrighted works)" },

  // Management of Companies and Enterprises (55)
  { code: "551111", name: "Offices of bank holding companies" },
  { code: "551112", name: "Offices of other holding companies" },
  { code: "551114", name: "Head offices" },

  // Educational Services (61)
  { code: "611110", name: "Elementary and secondary schools" },
  { code: "611210", name: "Community colleges and C.E.G.E.P.s" },
  { code: "611310", name: "Universities" },
  { code: "611410", name: "Business and secretarial schools" },
  { code: "611420", name: "Computer training" },
  { code: "611430", name: "Professional and management development training" },
  { code: "611511", name: "Cosmetology and barber schools" },
  { code: "611512", name: "Flight training" },
  { code: "611513", name: "Apprenticeship training" },
  { code: "611519", name: "Other technical and trade schools" },
  { code: "611610", name: "Fine arts schools" },
  { code: "611620", name: "Athletics instruction" },
  { code: "611630", name: "Language schools" },
  { code: "611690", name: "All other schools and instruction" },
  { code: "611710", name: "Educational support services" },

  // Health Care and Social Assistance (62)
  { code: "621111", name: "Offices of general medical practitioners" },
  { code: "621112", name: "Offices of family medical practitioners" },
  { code: "621210", name: "Offices of dentists" },
  { code: "621310", name: "Offices of chiropractors" },
  { code: "621320", name: "Offices of optometrists" },
  { code: "621330", name: "Offices of mental health practitioners (except physicians)" },
  { code: "621340", name: "Offices of physical, occupational and speech therapists, and audiologists" },
  { code: "621391", name: "Offices of podiatrists" },
  { code: "621399", name: "Offices of all other miscellaneous health practitioners" },
  { code: "621410", name: "Family planning centres" },
  { code: "621420", name: "Out-patient mental health and substance abuse centres" },
  { code: "621491", name: "Ambulance services" },
  { code: "621492", name: "Blood and organ banks" },
  { code: "621499", name: "All other out-patient care centres" },
  { code: "621510", name: "Medical and diagnostic laboratories" },
  { code: "621610", name: "Home health care services" },
  { code: "621910", name: "Ambulance services" },
  { code: "621990", name: "All other ambulatory health care services" },
  { code: "622111", name: "General medical and surgical hospitals" },
  { code: "622112", name: "General medical and surgical hospitals (except pediatric)" },
  { code: "622210", name: "Psychiatric and substance abuse hospitals" },
  { code: "622310", name: "Specialty (except psychiatric and substance abuse) hospitals" },
  { code: "623110", name: "Nursing care facilities" },
  { code: "623210", name: "Residential developmental handicap facilities" },
  { code: "623220", name: "Residential mental health and substance abuse facilities" },
  { code: "623310", name: "Community care facilities for the elderly" },
  { code: "623990", name: "Other residential care facilities" },
  { code: "624110", name: "Child and youth services" },
  { code: "624120", name: "Services for the elderly and persons with disabilities" },
  { code: "624190", name: "Other individual and family services" },
  { code: "624210", name: "Community food services" },
  { code: "624220", name: "Community housing services" },
  { code: "624230", name: "Emergency and other relief services" },
  { code: "624310", name: "Vocational rehabilitation services" },
  { code: "624410", name: "Child day-care services" },

  // Arts, Entertainment and Recreation (71)
  { code: "711111", name: "Theatre companies and dinner theatres" },
  { code: "711112", name: "Dance companies" },
  { code: "711130", name: "Musical groups and artists" },
  { code: "711190", name: "Other performing arts companies" },
  { code: "711211", name: "Sports teams and clubs" },
  { code: "711213", name: "Horse race tracks" },
  { code: "711218", name: "Other spectator sports" },
  { code: "711311", name: "Live theatres and other performing arts presenters with facilities" },
  { code: "711319", name: "Sports stadiums and other presenters without facilities" },
  { code: "711322", name: "Festivals without facilities" },
  { code: "711411", name: "Agents and managers for artists, athletes, entertainers and other public figures" },
  { code: "711511", name: "Independent artists, writers and performers" },
  { code: "712111", name: "Museums" },
  { code: "712115", name: "Historical sites" },
  { code: "712119", name: "Other heritage institutions" },
  { code: "712120", name: "Zoos and botanical gardens" },
  { code: "712130", name: "Nature parks and other similar institutions" },
  { code: "713110", name: "Amusement and theme parks" },
  { code: "713120", name: "Amusement arcades" },
  { code: "713210", name: "Casinos (except casino hotels)" },
  { code: "713291", name: "Lotteries" },
  { code: "713299", name: "All other gambling industries" },
  { code: "713910", name: "Golf courses and country clubs" },
  { code: "713920", name: "Skiing facilities" },
  { code: "713930", name: "Marinas" },
  { code: "713940", name: "Fitness and recreational sports centres" },
  { code: "713950", name: "Bowling centres" },
  { code: "713990", name: "All other amusement and recreation industries" },

  // Accommodation and Food Services (72)
  { code: "721111", name: "Hotels" },
  { code: "721112", name: "Motor hotels" },
  { code: "721113", name: "Resorts" },
  { code: "721114", name: "Casino hotels" },
  { code: "721191", name: "Bed and breakfast" },
  { code: "721192", name: "Housekeeping cottages and cabins" },
  { code: "721198", name: "All other traveller accommodation" },
  { code: "721211", name: "Recreational vehicle (RV) parks and campgrounds" },
  { code: "721212", name: "Hunting and fishing camps" },
  { code: "721213", name: "Rooming and boarding houses" },
  { code: "722210", name: "Limited-service eating places" },
  { code: "722310", name: "Food service contractors" },
  { code: "722320", name: "Caterers" },
  { code: "722330", name: "Mobile food services" },
  { code: "722410", name: "Drinking places (alcoholic beverages)" },
  { code: "722511", name: "Full-service restaurants" },
  { code: "722512", name: "Limited-service eating places" },

  // Other Services (except Public Administration) (81)
  { code: "811111", name: "General automotive repair" },
  { code: "811112", name: "Automotive exhaust system repair" },
  { code: "811113", name: "Automotive transmission repair" },
  { code: "811119", name: "Other automotive mechanical and electrical repair and maintenance" },
  { code: "811121", name: "Automotive body, paint and interior repair and maintenance" },
  { code: "811122", name: "Automotive glass replacement shops" },
  { code: "811191", name: "Automotive oil change and lubrication shops" },
  { code: "811192", name: "Car washes" },
  { code: "811199", name: "All other automotive repair and maintenance" },
  { code: "811210", name: "Electronic and precision equipment repair and maintenance" },
  { code: "811310", name: "Commercial and industrial machinery and equipment (except automotive and electronic) repair and maintenance" },
  { code: "811411", name: "Home and garden equipment repair and maintenance" },
  { code: "811412", name: "Appliance repair and maintenance" },
  { code: "811420", name: "Reupholstery and furniture repair" },
  { code: "811490", name: "Other personal and household goods repair and maintenance" },
  { code: "812111", name: "Barber shops" },
  { code: "812112", name: "Beauty salons" },
  { code: "812113", name: "Nail salons" },
  { code: "812119", name: "Other personal care services" },
  { code: "812210", name: "Funeral homes" },
  { code: "812220", name: "Cemeteries and crematoria" },
  { code: "812310", name: "Coin-operated laundries and dry cleaners" },
  { code: "812320", name: "Dry cleaning and laundry services (except coin-operated)" },
  { code: "812330", name: "Linen and uniform supply" },
  { code: "812910", name: "Pet care (except veterinary) services" },
  { code: "812920", name: "Photo finishing" },
  { code: "812930", name: "Parking lots and garages" },
  { code: "812990", name: "All other personal services" },
  { code: "813110", name: "Religious organizations" },
  { code: "813211", name: "Grantmaking foundations" },
  { code: "813212", name: "Voluntary health organizations" },
  { code: "813219", name: "Other grantmaking and giving services" },
  { code: "813310", name: "Social advocacy organizations" },
  { code: "813410", name: "Civic and social organizations" },
  { code: "813910", name: "Business associations" },
  { code: "813920", name: "Professional organizations" },
  { code: "813930", name: "Labour organizations" },
  { code: "813990", name: "Other similar organizations (except business, professional, labour and political organizations)" },
  { code: "814110", name: "Private households" },

  // Public Administration (91)
  { code: "911110", name: "Defence services" },
  { code: "911120", name: "Federal protective services" },
  { code: "911130", name: "Federal courts of law" },
  { code: "911140", name: "Federal correctional services" },
  { code: "911190", name: "Other federal government public administration" },
  { code: "912110", name: "Provincial protective services" },
  { code: "912120", name: "Provincial courts of law" },
  { code: "912130", name: "Provincial correctional services" },
  { code: "912140", name: "Provincial labour and employment services" },
  { code: "912150", name: "Provincial health and social services" },
  { code: "912160", name: "Provincial education services" },
  { code: "912170", name: "Provincial resource and industrial development" },
  { code: "912180", name: "Provincial transportation" },
  { code: "912190", name: "Other provincial and territorial public administration" },
  { code: "913110", name: "Municipal protective services" },
  { code: "913120", name: "Municipal courts of law" },
  { code: "913140", name: "Municipal health and social services" },
  { code: "913150", name: "Municipal education services" },
  { code: "913160", name: "Municipal resource and industrial development" },
  { code: "913170", name: "Municipal transportation" },
  { code: "913190", name: "Other local, municipal and regional public administration" },
  { code: "914110", name: "Aboriginal public administration" },
  { code: "919110", name: "International affairs" },
  { code: "919120", name: "Foreign diplomatic and consular services" },
  { code: "919130", name: "International and other extra-territorial public administration" }
];

// Define the steps for the wizard
const FORM_STEPS = [
  {
    title: "Welcome",
    description: "Welcome to client intake",
    fields: []
  },
  {
    title: "Client Type",
    description: "Select client type",
    fields: ["clientType"]
  },
  {
    title: "Business Information",
    description: "Basic business details",
    fields: ["name", "operatingName", "industry"]
  },
  {
    title: "Business Details",
    description: "Additional business information",
    fields: ["businessNumber", "email", "phone"]
  },
  {
    title: "Business Address", 
    description: "Business location details",
    fields: ["address", "contactPersonName", "contactPersonTitle"]
  },
  {
    title: "Contact Information",
    description: "Contact person details",
    fields: ["contactPersonEmail", "contactPersonPhone", "notes"]
  },
  {
    title: "Project Setup",
    description: "Project configuration",
    fields: ["projectYears", "fiscalYearEnd", "workType"]
  },
  {
    title: "Personal Tax Information",
    description: "Tax-related personal details",
    fields: ["socialInsuranceNumber", "dateOfBirth", "maritalStatus", "taxFilingYears"]
  },
  {
    title: "Dependants & Family",
    description: "Family members and dependants",
    fields: ["hasDependants", "dependants"]
  }
];

// Searchable Industry Dropdown Component
function SearchableIndustryDropdown({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Update search term when value changes from outside (form reset, etc.)
  useEffect(() => {
    if (value) {
      const industry = NAICS_INDUSTRIES.find(ind => ind.name === value);
      if (industry) {
        setSearchTerm(`${industry.code} - ${industry.name}`);
      } else {
        setSearchTerm(value);
      }
    } else {
      setSearchTerm("");
    }
  }, [value]);

  // Filter industries based on search term
  const filteredIndustries = useMemo(() => {
    if (!searchTerm.trim()) return NAICS_INDUSTRIES;
    
    const term = searchTerm.toLowerCase();
    return NAICS_INDUSTRIES.filter(industry => 
      industry.name.toLowerCase().includes(term) || 
      industry.code.includes(term)
    ).sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aCode = a.code.toLowerCase();
      const bCode = b.code.toLowerCase();
      
      // Prioritize exact starts-with matches for words
      const aWordStart = aName.startsWith(term);
      const bWordStart = bName.startsWith(term);
      if (aWordStart && !bWordStart) return -1;
      if (bWordStart && !aWordStart) return 1;
      
      // Then prioritize code matches
      const aCodeMatch = aCode.includes(term);
      const bCodeMatch = bCode.includes(term);
      if (aCodeMatch && !bCodeMatch) return -1;
      if (bCodeMatch && !aCodeMatch) return 1;
      
      // Then sort by position of match (earlier = better)
      const aIndex = aName.indexOf(term);
      const bIndex = bName.indexOf(term);
      if (aIndex !== bIndex) return aIndex - bIndex;
      
      return a.name.localeCompare(b.name);
    });
  }, [searchTerm]);

  // Auto-complete to closest match when typing (only after 3+ characters)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);

    // Auto-fill closest match only after 6+ characters
    if (newValue.trim().length >= 6) {
      // Look for exact word matches first (prioritize "construction" over "crop")
      const wordMatch = NAICS_INDUSTRIES.find(industry => 
        industry.name.toLowerCase().includes(newValue.toLowerCase()) &&
        industry.name.toLowerCase().indexOf(newValue.toLowerCase()) === 0
      );
      
      if (wordMatch) {
        onChange(wordMatch.name);
        return;
      }

      // Then look for starts-with matches
      const startsWithMatch = NAICS_INDUSTRIES.find(industry => 
        industry.name.toLowerCase().startsWith(newValue.toLowerCase()) ||
        industry.code.startsWith(newValue)
      );
      
      if (startsWithMatch) {
        onChange(startsWithMatch.name);
      }
    }
  };

  const handleSelectIndustry = (industry: typeof NAICS_INDUSTRIES[0]) => {
    const fullValue = `${industry.code} - ${industry.name}`;
    setSearchTerm(fullValue);
    onChange(industry.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredIndustries.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredIndustries.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredIndustries[highlightedIndex]) {
          handleSelectIndustry(filteredIndustries[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onBlur={(e) => {
            // Delay closing to allow for clicks on dropdown items
            setTimeout(() => setIsOpen(false), 150);
          }}
          placeholder="Type to search industries or select from dropdown..."
          className="pr-8"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredIndustries.length > 0 ? (
            filteredIndustries.map((industry, index) => (
              <div
                key={industry.code}
                className={`px-3 py-2 cursor-pointer text-sm ${
                  index === highlightedIndex 
                    ? 'bg-blue-100 text-blue-900' 
                    : 'hover:bg-gray-100'
                }`}
                onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                onClick={() => handleSelectIndustry(industry)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span className="font-medium text-blue-600">{industry.code}</span>
                <span className="ml-2">{industry.name}</span>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              No industries found matching "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EnhancedClientCreation({ isOpen, onComplete, onCancel }: EnhancedClientCreationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Generate years from 2015 to 2026
  const availableYears = Array.from({ length: 12 }, (_, i) => (2015 + i).toString());

  const form = useForm<ClientCreationFormData>({
    resolver: zodResolver(clientCreationSchema),
    mode: "onChange",
    shouldUnregister: false, // Keep all form values even when fields are unmounted
    defaultValues: {
      name: "",
      operatingName: "",
      email: "",
      phone: "",
      address: "",
      addressCountry: undefined,
      addressStreet: "",
      addressCity: "",
      addressStateProvince: "",
      addressPostalCode: "",
      industry: "",
      projectYears: [],
      fiscalYearEnd: "",
      workType: [],
      businessNumber: "",
      contactPersonName: "",
      contactPersonEmail: "",
      contactPersonPhone: "",
      contactPersonTitle: "",
      socialInsuranceNumber: "",
      dateOfBirth: "",
      maritalStatus: undefined,
      spouseName: "",
      spouseSin: "",
      spouseDateOfBirth: "",
      isCitizen: undefined,
      maritalStatusChanged: undefined,
      maritalStatusChangeDate: "",
      onboardingStatus: "pending",
      notes: "",
    },
  });

  // Reset form when dialog opens or closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      // Force reset with timeout to ensure it takes effect
      setTimeout(() => {
        form.reset({
          clientType: "business",
          name: "",
          operatingName: "",
          email: "",
          phone: "",
          address: "",
          industry: "",
          projectYears: [], // Ensure this is always an array
          fiscalYearEnd: "",
          workType: [], // Ensure this is always an array
          businessNumber: "",
          contactPersonName: "",
          contactPersonEmail: "",
          contactPersonPhone: "",
          contactPersonTitle: "",
          onboardingStatus: "pending",
          notes: "",
          // Add missing fields for Individual clients
          addressCountry: "",
          addressStreet: "",
          addressCity: "",
          addressStateProvince: "",
          addressPostalCode: "",
          socialInsuranceNumber: "",
          dateOfBirth: "",
          maritalStatus: "",
          isCitizen: "",
          maritalStatusChanged: "",
          electionsCanadaAuthorization: "",
          hasDependants: "no",
          taxFilingYears: [], // Ensure this is always an array
          dependants: []
        });
      }, 0);
    } else {
      // Also reset when closing to prevent persistence
      form.reset();
      setCurrentStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Preserve form values when navigating between steps using a ref
  const formValuesRef = useRef<Partial<ClientCreationFormData>>({});
  
  // Continuously watch and store form values as they change
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name && value[name as keyof typeof value] !== undefined) {
        const fieldValue = value[name as keyof typeof value];
        // Only store non-empty values
        if (fieldValue !== "" && fieldValue !== null && fieldValue !== undefined &&
            !(Array.isArray(fieldValue) && fieldValue.length === 0)) {
          (formValuesRef.current as any)[name] = fieldValue;
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);
  
  // Restore stored values when step changes
  useEffect(() => {
    // Restore all stored values to ensure they persist across steps
    Object.keys(formValuesRef.current).forEach((key) => {
      const value = formValuesRef.current[key as keyof ClientCreationFormData];
      if (value !== undefined && value !== null && value !== "" && 
          !(Array.isArray(value) && value.length === 0)) {
        const currentValue = form.getValues(key as any);
        // Only set if current value is empty or different
        if (currentValue === "" || currentValue === null || currentValue === undefined ||
            (Array.isArray(currentValue) && currentValue.length === 0) ||
            currentValue !== value) {
          form.setValue(key as any, value, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
        }
      }
    });
  }, [currentStep, form]);
  
  // Reset ref when dialog opens
  useEffect(() => {
    if (isOpen) {
      formValuesRef.current = {};
    }
  }, [isOpen]);

  // Drag handlers for making modal draggable
  const handleMouseDown = (e: React.MouseEvent) => {
    if (dialogRef.current) {
      setIsDragging(true);
      const rect = dialogRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && dialogRef.current) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: ClientCreationFormData) => {
      console.log('🚀 Starting client creation mutation with data:', data);
      try {
        const response = await apiRequest('POST', '/api/clients/enhanced', data);
        console.log('✅ API response received:', response.status, response.statusText);
        if (!response.ok) {
          const error = await response.json();
          console.error('❌ API error response:', error);
          throw new Error(error.message || 'Failed to create client');
        }
        const result = await response.json();
        console.log('✅ Client creation successful:', result);
        return result;
      } catch (error) {
        console.error('❌ Client creation mutation error:', error);
        throw error;
      }
    },
    onSuccess: (response) => {
      const projectCount = response?.createdProjects?.length || 0;
      const description =
        response?.message ||
        (response?.pendingApproval
          ? "Client created. Projects and tasks are pending approval in the Notifications tab."
          : `Client created successfully with ${projectCount} auto-generated project${projectCount !== 1 ? 's' : ''}!`);

      toast({
        title: "Success",
        description,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] }); // Refresh projects list
      queryClient.invalidateQueries({ queryKey: ['/api/crm/contacts'] }); // Refresh contacts list
      onComplete(response);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ClientCreationFormData) => {
    console.log('🚀 Form submission data:', data);
    
    // Fix ALL array corruption issues - clean both projectYears and taxFilingYears
    let validProjectYears: string[] = [];
    let validTaxFilingYears: string[] = [];
    
    // Clean projectYears
    if (data.projectYears && Array.isArray(data.projectYears)) {
      validProjectYears = data.projectYears.filter(year => 
        typeof year === 'string' && year.length === 4 && !isNaN(parseInt(year))
      );
    }
    
    // Clean taxFilingYears 
    if (data.taxFilingYears && Array.isArray(data.taxFilingYears)) {
      validTaxFilingYears = data.taxFilingYears.filter(year => 
        typeof year === 'string' && year.length === 4 && !isNaN(parseInt(year))
      );
    }
    
    console.log('✅ Cleaned projectYears:', validProjectYears);
    console.log('✅ Cleaned taxFilingYears:', validTaxFilingYears);
    
    // Combine address components into a single address field
    const combinedAddress = [
      data.addressStreet,
      data.addressCity,
      data.addressStateProvince,
      data.addressPostalCode,
      data.addressCountry
    ].filter(Boolean).join(', ');

    // Generate comprehensive client intake summary
    const clientIntakeSummary = generateClientIntakeSummary(data);
    
    // For Individual clients, use tax filing years as project years
    if (data.clientType === "individual") {
      validProjectYears = validTaxFilingYears;
    }
    
    // Ensure name field is present and not empty
    if (!data.name || data.name.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Client name is required. Please enter a name for the client.",
        variant: "destructive",
      });
      return;
    }

    if (!Array.isArray(data.workType) || data.workType.length === 0) {
      toast({
        title: "Validation Error",
        description: "Select at least one work type to create tasks for this client.",
        variant: "destructive",
      });
      return;
    }

    if (validProjectYears.length === 0) {
      toast({
        title: "Validation Error",
        description: "Select at least one project year to create projects for this client.",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare final data with combined address and fixed arrays
    const finalData = {
      ...data,
      name: data.name.trim(), // Ensure name is trimmed and not empty
      projectYears: validProjectYears, // Use cleaned project years
      taxFilingYears: validTaxFilingYears, // Use cleaned tax filing years
      address: combinedAddress || null, // Use combined address for backend, convert empty to null
      notes: clientIntakeSummary,
      intakeMethod: "manual_entry"
    };
    
    console.log('🎯 Final submission data:', finalData);
    
    // Prevent submission if arrays are corrupted
    if (finalData.projectYears.some(year => year.length !== 4) || 
        finalData.taxFilingYears?.some(year => year.length !== 4)) {
      toast({
        title: "Data Error",
        description: "Invalid year data detected. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }
    
    createClientMutation.mutate(finalData);
  };

  const generateClientIntakeSummary = (data: ClientCreationFormData): string => {
    const currentDate = new Date().toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const summary = `
=================================================================
CLIENT INTAKE SUMMARY
=================================================================
Date: ${currentDate}
Intake Method: Manual Entry (Staff Input)

=== BUSINESS INFORMATION ===
Business Name: ${data.name || 'Not provided'}
Operating Name: ${data.operatingName || 'Same as business name'}
Industry (NAICS): ${data.industry || 'Not specified'}

=== BUSINESS DETAILS ===
Business Number: ${data.businessNumber || 'Not provided'}
Business Email: ${data.email || 'Not provided'}
Phone Number: ${data.phone || 'Not provided'}
Business Address: ${data.address || 'Not provided'}

=== CONTACT PERSON ===
Contact Name: ${data.contactPersonName || 'Not provided'}
Contact Email: ${data.contactPersonEmail || 'Not provided'}
Contact Phone: ${data.contactPersonPhone || 'Not provided'}
Contact Title: ${data.contactPersonTitle || 'Not provided'}

=== SERVICES & PROJECT SETUP ===
Work Type: ${Array.isArray(data.workType) ? data.workType.join(', ') : (data.workType || 'Not specified')}
Project Years: ${Array.isArray(data.projectYears) ? data.projectYears.join(', ') : (data.projectYears || 'Not specified')}
Fiscal Year End: ${data.fiscalYearEnd || 'Not specified'}

=== STATUS & ONBOARDING ===
Onboarding Status: ${data.onboardingStatus || 'Pending'}
Client Status: Active (Default)
Portal Access: Enabled (Default)

=== ADDITIONAL NOTES ===
${data.notes || 'No additional notes provided during intake'}

=================================================================
This intake summary was automatically generated by the system.
All project setup and task creation will be based on this information.
=================================================================
    `.trim();

    return summary;
  };

  const nextStep = () => {
    // Store current form values before navigating
    const currentValues = form.getValues();
    Object.keys(currentValues).forEach((key) => {
      const value = currentValues[key as keyof typeof currentValues];
      if (value !== undefined && value !== null && value !== "" &&
          !(Array.isArray(value) && value.length === 0)) {
        (formValuesRef.current as any)[key] = value;
      }
    });
    
    const clientType = form.watch("clientType");
    
    // For individual clients, follow specific step sequence
    if (clientType === "individual") {
      const individualSteps = [0, 1, 2, 7, 8, 6]; // Welcome, Client Type, Personal Info, Tax Info, Dependants, Project Setup
      const currentIndex = individualSteps.indexOf(currentStep);
      if (currentIndex !== -1 && currentIndex < individualSteps.length - 1) {
        setCurrentStep(individualSteps[currentIndex + 1]);
      }
    } else {
      // Business clients follow business-specific sequence (excluding personal tax and dependants)
      const businessSteps = [0, 1, 2, 3, 4, 5, 6]; // Welcome, Client Type, Business Info, Business Details, Address, Contact, Project Setup
      const currentIndex = businessSteps.indexOf(currentStep);
      if (currentIndex !== -1 && currentIndex < businessSteps.length - 1) {
        setCurrentStep(businessSteps[currentIndex + 1]);
      }
    }
  };

  const prevStep = () => {
    // Store current form values before navigating
    const currentValues = form.getValues();
    Object.keys(currentValues).forEach((key) => {
      const value = currentValues[key as keyof typeof currentValues];
      if (value !== undefined && value !== null && value !== "" &&
          !(Array.isArray(value) && value.length === 0)) {
        (formValuesRef.current as any)[key] = value;
      }
    });
    
    const clientType = form.watch("clientType");
    
    // For individual clients, follow reverse step sequence
    if (clientType === "individual") {
      const individualSteps = [0, 1, 2, 7, 8, 6]; // Welcome, Client Type, Personal Info, Tax Info, Dependants, Project Setup
      const currentIndex = individualSteps.indexOf(currentStep);
      if (currentIndex !== -1 && currentIndex > 0) {
        setCurrentStep(individualSteps[currentIndex - 1]);
      }
    } else {
      // Business clients follow reverse business-specific sequence
      const businessSteps = [0, 1, 2, 3, 4, 5, 6]; // Welcome, Client Type, Business Info, Business Details, Address, Contact, Project Setup
      const currentIndex = businessSteps.indexOf(currentStep);
      if (currentIndex !== -1 && currentIndex > 0) {
        setCurrentStep(businessSteps[currentIndex - 1]);
      }
    }
  };

  const currentStepData = FORM_STEPS[currentStep];
  
  // Calculate progress percentage based on client type
  const getProgressPercentage = () => {
    const clientType = form.watch("clientType");
    
    if (clientType === "individual") {
      // Individual workflow: Welcome (0) -> Client Type (1) -> Personal Info (2) -> Tax Info (7) -> Dependants (8) -> Project Setup (6)
      const individualSteps = [0, 1, 2, 7, 8, 6];
      const currentIndex = individualSteps.indexOf(currentStep);
      if (currentIndex === -1) return 0;
      return ((currentIndex + 1) / individualSteps.length) * 100;
    } else {
      // Business workflow: Welcome (0) -> Client Type (1) -> Business Info (2) -> Business Details (3) -> Address (4) -> Contact (5) -> Project Setup (6)
      const businessSteps = [0, 1, 2, 3, 4, 5, 6];
      const currentIndex = businessSteps.indexOf(currentStep);
      if (currentIndex === -1) return 0;
      return ((currentIndex + 1) / businessSteps.length) * 100;
    }
  };
  
  const progressPercentage = getProgressPercentage();

  // Watch form values for reactive updates using useWatch hook
  const watchedClientType = useWatch({ control: form.control, name: "clientType" });
  const watchedProjectYears = useWatch({ control: form.control, name: "projectYears" });
  const watchedWorkType = useWatch({ control: form.control, name: "workType" });
  const watchedHasDependants = useWatch({ control: form.control, name: "hasDependants" });
  const watchedDependants = useWatch({ control: form.control, name: "dependants" });
  const watchedAddressCountry = useWatch({ control: form.control, name: "addressCountry" });
  const watchedMaritalStatus = useWatch({ control: form.control, name: "maritalStatus" });
  const watchedIsCitizen = useWatch({ control: form.control, name: "isCitizen" });
  const watchedMaritalStatusChanged = useWatch({ control: form.control, name: "maritalStatusChanged" });

  const renderStepContent = () => {
    // Use watched values with fallbacks
    const clientType = (watchedClientType || "business") as "business" | "individual";
    const projectYears = (watchedProjectYears || []) as string[];
    const workType = (watchedWorkType || []) as string[];
    const hasDependants = watchedHasDependants;
    const dependants = (watchedDependants || []) as any[];
    const addressCountry = watchedAddressCountry;
    const maritalStatus = watchedMaritalStatus;
    const isCitizen = watchedIsCitizen;
    const maritalStatusChanged = watchedMaritalStatusChanged;
    
    // Debug: log current form values
    console.log('Current step:', currentStep);
    console.log('Form values:', form.getValues());
    
    switch (currentStep) {
      case 0: // Welcome Page
        return (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Welcome to Client Onboarding</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                We're excited to work with you! This quick setup will help us understand your needs and get your accounting organized efficiently.
              </p>
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mt-6">
                <div className="text-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-600">Choose Type</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Building className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-600">Add Details</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-xs text-gray-600">Get Started</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 1: // Client Type Selection
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">What type of client are you?</h2>
              <p className="text-gray-600">Choose the option that best describes you</p>
            </div>
            
            <FormField
              control={form.control}
              name="clientType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          field.value === 'individual' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => field.onChange('individual')}
                      >
                        <CardContent className="p-6 text-center space-y-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                            <User className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Individual Client</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Personal tax returns, personal finances, or sole proprietorship
                            </p>
                          </div>
                          <div className="flex items-center justify-center">
                            <input
                              type="radio"
                              checked={field.value === 'individual'}
                              onChange={() => field.onChange('individual')}
                              className="text-blue-600"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <Card 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          field.value === 'business' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => field.onChange('business')}
                      >
                        <CardContent className="p-6 text-center space-y-4">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <Building className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Business Client</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Corporation, partnership, or any business entity
                            </p>
                          </div>
                          <div className="flex items-center justify-center">
                            <input
                              type="radio"
                              checked={field.value === 'business'}
                              onChange={() => field.onChange('business')}
                              className="text-blue-600"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 2: // Client Information (different for Individual vs Business)
        if (clientType === "individual") {
          return (
            <div className="space-y-6">
              <div className="text-center space-y-2 mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                <p className="text-gray-600">Tell us about yourself</p>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="your.email@example.com" 
                        value={field.value || ""} 
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(555) 123-4567" 
                        value={field.value || ""} 
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Country Selection */}
              <FormField
                control={form.control}
                name="addressCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <select 
                        {...field}
                        value={field.value || ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select country</option>
                        <option value="Canada">Canada</option>
                        <option value="USA">United States</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Street Address */}
              <FormField
                control={form.control}
                name="addressStreet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Number and Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="123 Main Street" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* City and State/Province Row */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="addressCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Toronto" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressStateProvince"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch("addressCountry") === "USA" ? "State" : "Province"}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={form.watch("addressCountry") === "USA" ? "California" : "Ontario"} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Postal/Zip Code */}
              <FormField
                control={form.control}
                name="addressPostalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {form.watch("addressCountry") === "USA" ? "Zip Code" : "Postal Code"}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={form.watch("addressCountry") === "USA" ? "90210" : "K1A 0A6"} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          );
        } else {
          // Business client form
          return (
            <div className="space-y-6">
              <div className="text-center space-y-2 mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>
                <p className="text-gray-600">Basic business details</p>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter business name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="operatingName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operating Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter operating name if different from business name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry (NAICS)</FormLabel>
                    <FormControl>
                      <SearchableIndustryDropdown
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          );
        }

      case 9: // Personal Information (Individual) OR Business Information (Business)
        {
          if (clientType === "individual") {
            // Individual client personal information
            return (
              <div className="space-y-6">
                <div className="text-center space-y-2 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                  <p className="text-gray-600">Tell us about yourself</p>
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your.email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St, City, Province, Postal Code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <select 
                          {...field}
                          value={field.value || ""}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select country</option>
                          <option value="Canada">Canada</option>
                          <option value="USA">United States</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            );
          } else {
            // Business client information (existing business form)
            return (
              <div className="space-y-6">
                <div className="text-center space-y-2 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>
                  <p className="text-gray-600">Basic business details</p>
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter business name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="operatingName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operating Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter operating name if different from business name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry (NAICS)</FormLabel>
                      <FormControl>
                        <SearchableIndustryDropdown
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            );
          }
        }

      case 3: // Business Details
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="businessNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="123456789RC0001" 
                      value={field.value || ""} 
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="business@example.com" 
                      value={field.value || ""} 
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="(555) 123-4567" 
                      value={field.value || ""} 
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 4: // Business Address
        return (
          <div className="space-y-6">
            {/* Country Selection */}
            <FormField
              control={form.control}
              name="addressCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="USA">United States</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Street Address */}
            <FormField
              control={form.control}
              name="addressStreet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Number and Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="123 Main Street" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* City and State/Province Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="addressCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Toronto" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressStateProvince"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {form.watch("addressCountry") === "USA" ? "State" : "Province"}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={form.watch("addressCountry") === "USA" ? "California" : "Ontario"} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Postal/Zip Code */}
            <FormField
              control={form.control}
              name="addressPostalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch("addressCountry") === "USA" ? "Zip Code" : "Postal Code"}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={form.watch("addressCountry") === "USA" ? "90210" : "K1A 0A6"} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPersonName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPersonTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title/Position</FormLabel>
                  <FormControl>
                    <Input placeholder="CEO, Owner, Manager" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 5: // Contact Information
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="contactPersonEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPersonPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about this client..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4">
              <p className="text-sm text-gray-600">
                Next step: Project configuration and years setup
              </p>
            </div>
          </div>
        );

      case 7: // Personal Tax Information (Individual Clients Only)
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Personal Tax Information</h2>
              <p className="text-gray-600">Tax filing details for personal returns</p>
            </div>

            {/* Tax Filing Years */}
            <FormField
              control={form.control}
              name="taxFilingYears"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Filing Years (Select Multiple) *</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-3">
                      {["2022", "2023", "2024", "2025", "2026"].map((year) => (
                        <div key={year} className="flex items-center space-x-2 p-2 border rounded-md">
                          <Checkbox
                            id={`tax-year-${year}`}
                            checked={field.value?.includes(year) || false}
                            onCheckedChange={(checked) => {
                              const currentYears = Array.isArray(field.value) ? field.value : [];
                              if (checked) {
                                const newYears = [...currentYears, year];
                                field.onChange(newYears);
                                console.log('📅 Updated taxFilingYears:', newYears);
                                // Auto-populate project years for Individual clients
                                if (form.watch("clientType") === "individual") {
                                  form.setValue("projectYears", newYears);
                                  console.log('📅 Auto-populated projectYears:', newYears);
                                }
                              } else {
                                const filteredYears = currentYears.filter((y: string) => y !== year);
                                field.onChange(filteredYears);
                                console.log('📅 Updated taxFilingYears:', filteredYears);
                                // Auto-populate project years for Individual clients
                                if (form.watch("clientType") === "individual") {
                                  form.setValue("projectYears", filteredYears);
                                  console.log('📅 Auto-populated projectYears:', filteredYears);
                                }
                              }
                            }}
                          />
                          <label
                            htmlFor={`tax-year-${year}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {year}
                          </label>
                        </div>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Social Insurance Number */}
            <FormField
              control={form.control}
              name="socialInsuranceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Social Insurance Number *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="123-456-789" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date of Birth */}
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth *</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Marital Status */}
            <FormField
              control={form.control}
              name="maritalStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marital Status *</FormLabel>
                  <FormControl>
                    <select 
                      {...field}
                      value={field.value || ""}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select marital status</option>
                      <option value="married">Married</option>
                      <option value="common-law">Living Common-law</option>
                      <option value="widowed">Widowed</option>
                      <option value="divorced">Divorced</option>
                      <option value="separated">Separated</option>
                      <option value="single">Single</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Spouse Information - Show if married or common-law */}
            {(form.watch("maritalStatus") === "married" || form.watch("maritalStatus") === "common-law") && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <h3 className="font-medium text-gray-900">Spouse Information</h3>
                
                <FormField
                  control={form.control}
                  name="spouseName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spouse Full Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter spouse's full name" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="spouseSin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spouse Social Insurance Number *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123-456-789" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="spouseDateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spouse Date of Birth *</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Citizenship Status */}
            <FormField
              control={form.control}
              name="isCitizen"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Are you a citizen of {form.watch("addressCountry") || "the selected country"}? *</FormLabel>
                  <FormControl>
                    <select 
                      {...field}
                      value={field.value || ""}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select citizenship status</option>
                      <option value="yes">Yes, I am a citizen</option>
                      <option value="no">No, I am not a citizen</option>
                      <option value="permanent-resident">Permanent Resident</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Marital Status Change */}
            <FormField
              control={form.control}
              name="maritalStatusChanged"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Did your marital status change since the last tax filing?</FormLabel>
                  <FormControl>
                    <select 
                      {...field}
                      value={field.value || ""}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select option</option>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Elections Canada Authorization - Only show if citizen */}
            {form.watch("isCitizen") === "yes" && (
              <FormField
                control={form.control}
                name="electionsCanadaAuthorization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Elections Canada Authorization</FormLabel>
                    <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                      <p className="text-sm text-gray-700 mb-3">
                        Do you authorize the Canada Revenue Agency to give your name, address, date of birth, and citizenship to Elections Canada to update the National Register of Electors?
                      </p>
                      <FormControl>
                        <select 
                          {...field}
                          value={field.value || ""}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select option</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Marital Status Change Date - Show if status changed */}
            {form.watch("maritalStatusChanged") === "yes" && (
              <FormField
                control={form.control}
                name="maritalStatusChangeDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Marital Status Change *</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        );

      case 6: // Project Setup
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Project Setup</h2>
              <p className="text-gray-600">Project configuration</p>
            </div>

            <ProjectYearsField 
              clientType={clientType} 
              value={projectYears || []}
              onChange={(value) => form.setValue("projectYears", value)}
              availableYears={availableYears}
            />

            {/* Only show Fiscal Year End for Business clients */}
            {clientType === "business" && (
              <FormField
                control={form.control}
                name="fiscalYearEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiscal Year End *</FormLabel>
                    <FormControl>
                      <select 
                        {...field}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select fiscal year end</option>
                        <option value="Jan 31">Jan 31</option>
                        <option value="Feb 28">Feb 28</option>
                        <option value="Mar 31">Mar 31</option>
                        <option value="Apr 30">Apr 30</option>
                        <option value="May 31">May 31</option>
                        <option value="Jun 30">Jun 30</option>
                        <option value="Jul 31">Jul 31</option>
                        <option value="Aug 31">Aug 31</option>
                        <option value="Sep 30">Sep 30</option>
                        <option value="Oct 31">Oct 31</option>
                        <option value="Nov 30">Nov 30</option>
                        <option value="Dec 31">Dec 31</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <WorkTypeField 
              clientType={clientType} 
              value={workType || []}
              onChange={(value) => form.setValue("workType", value)}
            />
          </div>
        );

      case 8: // Dependants & Family Information
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Family & Dependants Information</h2>
              <p className="text-gray-600">Add information about your dependants for tax purposes</p>
            </div>

            {/* Has Dependants Question */}
            <FormField
              control={form.control}
              name="hasDependants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Do you have any dependants?</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select an option</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dependants List - Only show if has dependants */}
            {form.watch("hasDependants") === "yes" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Dependants</h3>
                  <Button
                    type="button"
                    onClick={() => {
                      const currentDependants = form.getValues("dependants") || [];
                      form.setValue("dependants", [
                        ...currentDependants,
                        {
                          name: "",
                          relationship: "",
                          dateOfBirth: "",
                          socialInsuranceNumber: "",
                          income: "",
                          disabilityAmount: "",
                          childCareBenefits: "",
                          tuitionFees: ""
                        }
                      ]);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Dependant
                  </Button>
                </div>

                {(form.watch("dependants") || []).map((_, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Dependant {index + 1}</h4>
                      <Button
                        type="button"
                        onClick={() => {
                          const currentDependants = form.getValues("dependants") || [];
                          const newDependants = currentDependants.filter((_, i) => i !== index);
                          form.setValue("dependants", newDependants);
                        }}
                        variant="ghost"
                        size="sm"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Name */}
                      <FormField
                        control={form.control}
                        name={`dependants.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <input
                                {...field}
                                type="text"
                                placeholder="Enter full name"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Relationship */}
                      <FormField
                        control={form.control}
                        name={`dependants.${index}.relationship`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relationship *</FormLabel>
                            <FormControl>
                              <select
                                {...field}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select relationship</option>
                                <option value="child">Child</option>
                                <option value="spouse">Spouse</option>
                                <option value="parent">Parent</option>
                                <option value="grandparent">Grandparent</option>
                                <option value="other">Other</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Date of Birth */}
                      <FormField
                        control={form.control}
                        name={`dependants.${index}.dateOfBirth`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth *</FormLabel>
                            <FormControl>
                              <input
                                {...field}
                                type="date"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* SIN */}
                      <FormField
                        control={form.control}
                        name={`dependants.${index}.socialInsuranceNumber`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Social Insurance Number</FormLabel>
                            <FormControl>
                              <input
                                {...field}
                                type="text"
                                placeholder="000-000-000"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Annual Income */}
                      <FormField
                        control={form.control}
                        name={`dependants.${index}.income`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Annual Income</FormLabel>
                            <FormControl>
                              <input
                                {...field}
                                type="number"
                                placeholder="0.00"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Disability Amount */}
                      <FormField
                        control={form.control}
                        name={`dependants.${index}.disabilityAmount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Disability Amount</FormLabel>
                            <FormControl>
                              <input
                                {...field}
                                type="number"
                                placeholder="0.00"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Additional fields for children */}
                    {form.watch(`dependants.${index}.relationship`) === "child" && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        <FormField
                          control={form.control}
                          name={`dependants.${index}.childCareBenefits`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Child Care Benefits</FormLabel>
                              <FormControl>
                                <input
                                  {...field}
                                  type="number"
                                  placeholder="0.00"
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`dependants.${index}.tuitionFees`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tuition Fees</FormLabel>
                              <FormControl>
                                <input
                                  {...field}
                                  type="number"
                                  placeholder="0.00"
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {(!form.watch("dependants") || form.watch("dependants").length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No dependants added yet. Click "Add Dependant" to get started.
                  </div>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent 
        ref={dialogRef}
        className="max-w-lg w-[60%] max-h-[75vh] overflow-y-auto z-50"
        style={{ 
          transform: isDragging ? 'none' : 'translate(-50%, -50%)', 
          position: 'fixed',
          left: isDragging ? `${position.x}px` : '50%',
          top: isDragging ? `${position.y}px` : '50%',
          cursor: isDragging ? 'grabbing' : 'default',
          zIndex: 9999
        }}
      >
        <DialogHeader 
          className="cursor-move flex items-center gap-2 select-none"
          onMouseDown={handleMouseDown}
        >
          <DialogTitle className="flex items-center gap-2">
            <Move className="w-4 h-4" />
            {(() => {
              const clientType = form.watch("clientType");
              if (clientType === "individual") {
                const individualSteps = [0, 1, 2, 7, 8, 6];
                const currentIndex = individualSteps.indexOf(currentStep);
                return `Add New Client - Step ${currentIndex + 1} of ${individualSteps.length}`;
              } else {
                const businessSteps = [0, 1, 2, 3, 4, 5, 6];
                const currentIndex = businessSteps.indexOf(currentStep);
                return `Add New Client - Step ${currentIndex + 1} of ${businessSteps.length}`;
              }
            })()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{currentStepData.title}</span>
              <span>{Math.round(progressPercentage)}% Complete</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center">
            <div className="flex space-x-2">
              {(() => {
                const clientType = form.watch("clientType");
                const relevantSteps = clientType === "individual" 
                  ? [0, 1, 2, 7, 8, 6] // Welcome, Client Type, Personal Info, Tax Info, Dependants, Project Setup
                  : [0, 1, 2, 3, 4, 5, 6]; // Business steps (excluding personal tax and dependants)
                
                return relevantSteps.map((stepIndex, displayIndex) => (
                  <div
                    key={stepIndex}
                    className={`w-3 h-3 rounded-full ${
                      stepIndex <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                ));
              })()}
            </div>
          </div>

          {/* Form Content */}
          <Form {...form}>
            {/* Hidden FormFields to preserve form values when fields are not rendered */}
            <FormField control={form.control} name="name" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="email" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="phone" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="businessNumber" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="operatingName" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="industry" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="address" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="addressCountry" render={({ field }) => <input type="hidden" {...field} value={field.value || ""} />} />
            <FormField control={form.control} name="addressStreet" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="addressCity" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="addressStateProvince" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="addressPostalCode" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="contactPersonName" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="contactPersonEmail" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="contactPersonPhone" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="contactPersonTitle" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="notes" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="socialInsuranceNumber" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="dateOfBirth" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="maritalStatus" render={({ field }) => <input type="hidden" {...field} value={field.value || ""} />} />
            <FormField control={form.control} name="isCitizen" render={({ field }) => <input type="hidden" {...field} value={field.value || ""} />} />
            <FormField control={form.control} name="maritalStatusChanged" render={({ field }) => <input type="hidden" {...field} value={field.value || ""} />} />
            <FormField control={form.control} name="electionsCanadaAuthorization" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="hasDependants" render={({ field }) => <input type="hidden" {...field} value={field.value || "no"} />} />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {currentStep === 0 && <Building className="w-5 h-5" />}
                  {currentStep === 1 && <Building className="w-5 h-5" />}
                  {currentStep === 2 && <UserPlus className="w-5 h-5" />}
                  {currentStep === 3 && <UserPlus className="w-5 h-5" />}
                  {currentStep === 4 && <Calendar className="w-5 h-5" />}
                  {currentStepData.title}
                </CardTitle>
                <CardDescription>{currentStepData.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {renderStepContent()}
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <div className="flex gap-2">
                <Button type="button" onClick={onCancel} variant="outline">
                  Cancel
                </Button>
                {currentStep > 0 && (
                  <Button type="button" onClick={prevStep} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                )}
              </div>

              <div>
                {(() => {
                  const clientType = form.watch("clientType");
                  const isLastStep = clientType === "individual" 
                    ? currentStep === 6  // Individual workflow ends at Project Setup
                    : currentStep === 6; // Business workflow ends at Project Setup (step 6)
                  
                  return isLastStep ? (
                    <Button 
                      type="button" 
                      onClick={form.handleSubmit(onSubmit)}
                      disabled={createClientMutation.isPending}
                      className="min-w-32"
                    >
                      {createClientMutation.isPending ? (
                        "Creating..."
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Create Client
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button type="button" onClick={nextStep}>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  );
                })()}
              </div>
            </div>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}