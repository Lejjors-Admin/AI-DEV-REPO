import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Trash2, 
  UserCheck, 
  Tag, 
  FileText, 
  CheckCircle,
  XCircle,
  Clock,
  Users,
  X,
  MoreHorizontal,
  Building
} from "lucide-react";

// This is a mockup component to demonstrate the multi-select bulk operations UI
export default function BulkOperationsMockup() {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Multi-Select Bulk Operations Mockup</h1>
        <p className="text-gray-600">Visual demonstration of the proposed client table with bulk actions</p>
      </div>

      {/* Client Table with Multi-Select */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Clients</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                3 of 6 selected
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  {/* Master Checkbox */}
                  <Checkbox className="border-2" />
                </TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Business Number</TableHead>
                <TableHead>Year End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Selected Row */}
              <TableRow className="bg-blue-50 border-l-4 border-l-blue-500">
                <TableCell>
                  <Checkbox checked className="border-2" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">ABC Consulting Ltd</span>
                  </div>
                </TableCell>
                <TableCell>John Smith</TableCell>
                <TableCell>
                  <Badge variant="secondary">Management consulting</Badge>
                </TableCell>
                <TableCell>123456789RC0001</TableCell>
                <TableCell>December 31</TableCell>
                <TableCell>
                  <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>

              {/* Selected Row */}
              <TableRow className="bg-blue-50 border-l-4 border-l-blue-500">
                <TableCell>
                  <Checkbox checked className="border-2" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Full Test Bookkeeping Corp</span>
                  </div>
                </TableCell>
                <TableCell>Test Manager</TableCell>
                <TableCell>
                  <Badge variant="secondary">Manufacturing</Badge>
                </TableCell>
                <TableCell>555666777</TableCell>
                <TableCell>December 31</TableCell>
                <TableCell>
                  <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>

              {/* Selected Row */}
              <TableRow className="bg-blue-50 border-l-4 border-l-blue-500">
                <TableCell>
                  <Checkbox checked className="border-2" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">GAAP</span>
                  </div>
                </TableCell>
                <TableCell>GAAP</TableCell>
                <TableCell>
                  <Badge variant="secondary">Accounting Firm</Badge>
                </TableCell>
                <TableCell>AUTO-GEN</TableCell>
                <TableCell>December 31</TableCell>
                <TableCell>
                  <Badge variant="default" className="bg-yellow-100 text-yellow-800">Pending</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>

              {/* Unselected Rows */}
              <TableRow>
                <TableCell>
                  <Checkbox className="border-2" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">2138923 Canada Inc.</span>
                  </div>
                </TableCell>
                <TableCell>Jason King</TableCell>
                <TableCell>
                  <Badge variant="secondary">Soybean farming</Badge>
                </TableCell>
                <TableCell>323323</TableCell>
                <TableCell>December 31</TableCell>
                <TableCell>
                  <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <Checkbox className="border-2" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">August Thirteen</span>
                  </div>
                </TableCell>
                <TableCell>Not specified</TableCell>
                <TableCell>
                  <Badge variant="secondary">General</Badge>
                </TableCell>
                <TableCell>Not provided</TableCell>
                <TableCell>December 31</TableCell>
                <TableCell>
                  <Badge variant="default" className="bg-red-100 text-red-800">Inactive</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <Checkbox className="border-2" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Bookkeeping Tasks Test Co</span>
                  </div>
                </TableCell>
                <TableCell>Jane Doe</TableCell>
                <TableCell>
                  <Badge variant="secondary">Retail</Badge>
                </TableCell>
                <TableCell>987654321</TableCell>
                <TableCell>December 31</TableCell>
                <TableCell>
                  <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Floating Bulk Actions Bar - Positioned at bottom */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 min-w-[700px]">
          <div className="flex items-center justify-between gap-4">
            {/* Selection Info */}
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                <CheckCircle className="w-4 h-4" />
                3 clients selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-200"></div>

            {/* Quick Status Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                Set Active
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Clock className="w-3 h-3 mr-1 text-yellow-500" />
                Set Pending
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <XCircle className="w-3 h-3 mr-1 text-red-500" />
                Set Inactive
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-200"></div>

            {/* Staff Assignment */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <UserCheck className="w-3 h-3 mr-1 text-blue-500" />
                Assign to Staff
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-200"></div>

            {/* Tagging */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Tag className="w-3 h-3 mr-1 text-purple-500" />
                Add Tags
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-200"></div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <FileText className="w-3 h-3 mr-1 text-gray-500" />
                Export
              </Button>
              <Button variant="destructive" size="sm" className="h-8 text-xs">
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Description Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Key Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Master checkbox for select all/none</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Visual selection highlighting</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Floating action bar with quick access</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Contextual actions based on selection</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-sm">Bulk status changes (Active/Inactive/Pending)</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-500" />
              <span className="text-sm">Staff assignment and reassignment</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-500" />
              <span className="text-sm">Tag management (add/remove)</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Export selected client data</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}