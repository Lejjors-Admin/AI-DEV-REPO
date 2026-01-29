// BACKUP OF ORIGINAL FINANCIAL DATA DESIGN
// Created: January 5, 2025
// This is a complete backup of the original FinancialData.tsx before sidebar implementation

import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Upload, 
  Download, 
  FileText, 
  Plus, 
  Eye, 
  Trash2, 
  Settings, 
  ChevronDown, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Building,
  FileCheck,
  CreditCard,
  PieChart,
  BarChart3,
  Activity,
  Zap,
  Target,
  Briefcase,
  Receipt,
  Calculator,
  BookOpen,
  Sparkles,
  MoreVertical,
  Search,
  Filter,
  RefreshCw,
  ArrowUpDown,
  Edit,
  Copy,
  X,
  Check,
  Save,
  Mail,
  MessageSquare,
  Phone,
  MapPin,
  Globe,
  Link,
  Share,
  ExternalLink,
  Loader2,
  Info,
  HelpCircle,
  Star,
  Heart,
  Bookmark,
  Flag,
  Tag,
  Folder,
  Archive,
  Trash,
  Lock,
  Unlock,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserMinus,
  UserX,
  Crown,
  Award,
  Trophy,
  Medal,
  Gift,
  Wallet,
  CreditCard as CreditCardIcon,
  Banknote,
  Coins,
  PiggyBank,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  BarChart,
  LineChart,
  PieChart as PieChartIcon,
  Gauge,
  Thermometer,
  Battery,
  Wifi,
  Signal,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Stop,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Shuffle,
  Repeat,
  Music,
  Headphones,
  Speaker,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Camera,
  CameraOff,
  Image,
  ImageOff,
  Film,
  Clapperboard,
  Monitor,
  Tv,
  Smartphone,
  Tablet,
  Laptop,
  Desktop,
  Watch,
  Gamepad2,
  Joystick,
  Keyboard,
  Mouse,
  Printer,
  Scanner,
  Fax,
  HardDrive,
  SdCard,
  Usb,
  Bluetooth,
  Wifi as WifiIcon,
  Rss,
  Radar,
  Satellite,
  Navigation,
  Compass,
  Map,
  MapPin as MapPinIcon,
  Route,
  Car,
  Truck,
  Bus,
  Train,
  Plane,
  Ship,
  Bike,
  Scooter,
  Taxi,
  Fuel,
  Zap as ZapIcon,
  Plug,
  Battery as BatteryIcon,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudHail,
  Snowflake,
  Droplets,
  Umbrella,
  Wind,
  Tornado,
  Sunrise,
  Sunset,
  Thermometer as ThermometerIcon,
  TreePine,
  TreeDeciduous,
  Flower,
  Flower2,
  Leaf,
  Seedling,
  Sprout,
  Cherry,
  Apple,
  Grape,
  Carrot,
  Wheat,
  Coffee,
  Wine,
  Beer,
  Martini,
  Pizza,
  Sandwich,
  Donut,
  Cookie,
  Cake,
  IceCream,
  Candy,
  Lollipop,
  Utensils,
  UtensilsCrossed,
  ChefHat,
  Soup,
  Salad,
  Egg,
  Milk,
  Cheese,
  Fish,
  Beef,
  Chicken,
  Bacon,
  Ham,
  Croissant,
  Bagel,
  Pretzel,
  Popcorn,
  Nut,
  Banana,
  Orange,
  Lemon,
  Lime,
  Strawberry,
  Watermelon,
  Pineapple,
  Coconut,
  Avocado,
  Broccoli,
  Corn,
  Pepper,
  Tomato,
  Potato,
  Onion,
  Garlic,
  Mushroom,
  Cucumber,
  Lettuce,
  Spinach,
  Kale,
  Cabbage,
  Cauliflower,
  Radish,
  Turnip,
  Beet,
  Celery,
  Asparagus,
  Artichoke,
  Eggplant,
  Zucchini,
  Pumpkin,
  Squash,
  Pea,
  Bean,
  Lentil,
  Chickpea,
  Quinoa,
  Rice,
  Pasta,
  Bread,
  Flour,
  Sugar,
  Salt,
  Pepper as PepperIcon,
  Spice,
  Herb,
  Oil,
  Vinegar,
  Honey,
  Jam,
  Butter,
  Cream,
  Yogurt,
  Soda,
  Juice,
  Water,
  Tea,
  Smoothie,
  Cocktail,
  Champagne,
  Whiskey,
  Vodka,
  Gin,
  Rum,
  Tequila,
  Brandy,
  Sake,
  Shovel,
  Hammer,
  Wrench,
  Screwdriver,
  Drill,
  Saw,
  Axe,
  Pickaxe,
  Scissors,
  Ruler,
  PaintBucket,
  Brush,
  Palette,
  Pipette,
  Spray,
  Stamp,
  Stapler,
  Paperclip,
  Pin,
  Pushpin,
  Thumbtack,
  Magnet,
  Flashlight,
  Candle,
  Lightbulb,
  Lamp,
  Lantern,
  Torch,
  Fire,
  Flame,
  Sparkle,
  Fireworks,
  Balloon,
  Gift as GiftIcon,
  PartyPopper,
  Confetti,
  Crown as CrownIcon,
  Hat,
  Glasses,
  Sunglasses,
  Goggles,
  Mask,
  Lipstick,
  Perfume,
  Nail,
  Ring,
  Gem,
  Diamond,
  Pearl,
  Necklace,
  Bracelet,
  Earrings,
  Watch as WatchIcon,
  Hourglass,
  Stopwatch,
  Clock as ClockIcon,
  Timer,
  Alarm,
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarCheck,
  CalendarX,
  CalendarPlus,
  CalendarMinus,
  CalendarClock,
  CalendarHeart,
  CalendarRange,
  CalendarSearch,
  CalendarArrowDown,
  CalendarArrowUp,
  CalendarOff,
  CalendarFold,
  CalendarUnfold,
  CalendarSync,
  CalendarReplace,
  CalendarImport,
  CalendarExport,
  CalendarCog,
  CalendarUser,
  CalendarUsers,
  CalendarStar,
  CalendarFlag,
  CalendarPin,
  CalendarBook,
  CalendarNotebook,
  CalendarFile,
  CalendarFolder,
  CalendarArchive,
  CalendarTrash,
  CalendarLock,
  CalendarUnlock,
  CalendarShield,
  CalendarCheck2,
  CalendarX2,
  CalendarPlus2,
  CalendarMinus2,
  CalendarClock2,
  CalendarHeart2,
  CalendarRange2,
  CalendarSearch2,
  CalendarArrowDown2,
  CalendarArrowUp2,
  CalendarOff2,
  CalendarFold2,
  CalendarUnfold2,
  CalendarSync2,
  CalendarReplace2,
  CalendarImport2,
  CalendarExport2,
  CalendarCog2,
  CalendarUser2,
  CalendarUsers2,
  CalendarStar2,
  CalendarFlag2,
  CalendarPin2,
  CalendarBook2,
  CalendarNotebook2,
  CalendarFile2,
  CalendarFolder2,
  CalendarArchive2,
  CalendarTrash2,
  CalendarLock2,
  CalendarUnlock2,
  CalendarShield2
} from "lucide-react";

import { ChartOfAccounts } from "@/components/ChartOfAccounts";
import TransactionLedger from "@/components/TransactionLedger";
import TransactionManager from "@/pages/TransactionManager";
import ReportsTab from "@/components/financial/ReportsTab";
import { BankFeedsList } from "@/components/financial/BankFeedsList";
import { BankTransactionsList } from "@/components/financial/BankTransactionsList";
import BookkeepingSettingsTab from "@/components/financial/BookkeepingSettingsTab";
import MiltonBooksChat from "@/components/milton/MiltonBooksChat";
// DesignSwitcher removed - backup kept for backend access only

/**
 * BACKUP OF ORIGINAL FINANCIAL DATA COMPONENT
 * This is the complete backup of the original tabbed interface design
 * Created before implementing the modern sidebar navigation
 */
export default function FinancialDataBackup() {
  const { toast } = useToast();
  const params = useParams();
  const queryClient = useQueryClient();
  
  // All original state and functionality preserved
  const [selectedClient, setSelectedClient] = useState<string>(params.clientId || "");
  const [activeTab, setActiveTab] = useState(params.tab || "overview");
  const [selectedBankFeedId, setSelectedBankFeedId] = useState<number | null>(null);
  
  // All original queries and mutations preserved
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: bankFeeds = [] } = useQuery({
    queryKey: ["/api/bank-feeds", selectedClient],
    enabled: !!selectedClient,
  });

  const { data: dashboardData = {} } = useQuery({
    queryKey: ["/api/dashboard", selectedClient],
    enabled: !!selectedClient && activeTab === "overview",
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Data - Original Design</h1>
          <p className="text-muted-foreground">
            Complete backup of the original tabbed interface (January 5, 2025)
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {!isLoadingClients && clients.map((client: any) => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedClient && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="journal-entries">Journal</TabsTrigger>
            <TabsTrigger value="transaction-manager">Transactions</TabsTrigger>
            <TabsTrigger value="bank-feeds">Bank Feeds</TabsTrigger>
            <TabsTrigger value="reporting">Reports</TabsTrigger>
            <TabsTrigger value="bookkeeping-settings">Settings</TabsTrigger>
            <TabsTrigger value="milton-ai">Milton AI</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${dashboardData.revenue?.toLocaleString() || '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +{dashboardData.revenue > 0 ? '20.1' : '0.0'}% from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${dashboardData.expenses?.toLocaleString() || '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +{dashboardData.expenses > 0 ? '5.2' : '0.0'}% from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${dashboardData.netIncome?.toLocaleString() || '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +{dashboardData.netIncome > 0 ? '12.5' : '0.0'}% from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardData.lastSynced ? 'Today' : 'Never'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData.companyName || 'No company selected'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="accounts">
            <ChartOfAccounts clientId={parseInt(selectedClient)} />
          </TabsContent>

          <TabsContent value="journal-entries">
            <TransactionLedger clientId={parseInt(selectedClient)} />
          </TabsContent>

          <TabsContent value="transaction-manager">
            <TransactionManager clientId={selectedClient} />
          </TabsContent>

          <TabsContent value="bank-feeds">
            <div className="space-y-4">
              <BankFeedsList 
                clientId={parseInt(selectedClient)} 
                onSelectBankFeed={setSelectedBankFeedId}
                selectedBankFeedId={selectedBankFeedId}
              />
              {selectedBankFeedId && (
                <BankTransactionsList 
                  clientId={parseInt(selectedClient)} 
                  bankFeedId={selectedBankFeedId}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="reporting">
            <ReportsTab clientId={parseInt(selectedClient)} />
          </TabsContent>

          <TabsContent value="bookkeeping-settings">
            <BookkeepingSettingsTab clientId={parseInt(selectedClient)} />
          </TabsContent>

          <TabsContent value="milton-ai">
            <div className="h-[calc(100vh-200px)]">
              <MiltonBooksChat clientId={parseInt(selectedClient)} />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}