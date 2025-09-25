"use client"

import { useState, useEffect, ChangeEvent } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Download, RefreshCw, QrCode, Eye, Loader2 } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzfcdevw5wZLelGrr2tNvN6-wU_OmXdfaDR6tFsOlwSQtd9TAqw9qUv0lVjzBDF-6iO/exec"
const COUPONS_SHEET = "Coupons"
const CONSUMERS_SHEET = "Coupons"

interface Coupon {
  id: string
  created: string
  code: string
  status: "used" | "unused" | "deleted"
  reward: number
  claimedBy?: string
  claimedAt?: string
  rowIndex: number
}

interface Consumer {
  name: string
  phone: string
  email: string
  couponCode: string
  date: string
  rowIndex: number
}

interface BarcodeDisplayProps {
  code: string
  formLink: string
  reward: number // Add reward prop
}

const BarcodeDisplay = ({ code, formLink, reward }: BarcodeDisplayProps) => {
  return (
    <div className="flex flex-col items-center p-6 border border-amber-200 rounded-2xl bg-gradient-to-br from-amber-50/50 to-white shadow-xl shadow-amber-500/10">
      <div className="mb-4 p-3 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border border-gray-200 rounded-lg p-2">
          <QRCodeSVG 
            value={formLink} 
            size={200}
            level="H"
            includeMargin={true}
            renderAs="svg"
            fgColor="#d97706"
            bgColor="#ffffff"
          />
        </div>
      </div>
      <div className="text-lg font-mono font-bold text-amber-800 mb-3 bg-amber-100 px-4 py-2 rounded-full border border-amber-200">{code}</div>
      <div className="text-xs text-gray-600 break-all max-w-[220px] text-center mb-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
        {formLink}
      </div>
      <div className="text-sm text-emerald-700 font-bold bg-emerald-100 px-4 py-2 rounded-full border border-emerald-300">
        🎁 ₹{reward} Reward {/* Change from hardcoded ₹100 to dynamic reward */}
      </div>
    </div>
  )
}


export default function PremiumTrackingSystem() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [consumers, setConsumers] = useState<Consumer[]>([])
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<"all" | "used" | "unused">("all")
  const [showBarcodes, setShowBarcodes] = useState<boolean>(false)
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Fetch coupons from Google Sheets
  const fetchCoupons = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=${COUPONS_SHEET}&action=fetch`)
      const result = await response.json()
      
      if (result.success && result.data) {
        const couponData = result.data.slice(1).map((row: any[], index: number) => ({
          id: `coupon_${index + 1}`,
          created: row[0] || '',
          code: row[1] || '',
          status: (row[2] || 'unused').toLowerCase(),
          reward: parseFloat(row[3]) || 0,
          claimedBy: row[4] || null,
          claimedAt: row[5] || null,
          rowIndex: index + 2
        })).filter((coupon: Coupon) => coupon.code && coupon.status !== 'deleted')
        
        setCoupons(couponData)
      }
    } catch (error) {
      console.error('Error fetching coupons:', error)
      alert('Error fetching coupons from Google Sheets')
    }
  }

  // Fetch consumers from Google Sheets
  const fetchConsumers = async () => {
    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=${CONSUMERS_SHEET}&action=fetch`)
      const result = await response.json()
      
      if (result.success && result.data) {
        const consumerData = result.data.slice(1).map((row: any[], index: number) => ({
          name: row[4] || '',
          phone: row[6] || '',
          email: row[7] || '',
          couponCode: row[1] || '',
          date: row[5] || '',
          rowIndex: index + 2
        })).filter((consumer: Consumer) => consumer.name && consumer.couponCode)
        
        setConsumers(consumerData)
      }
    } catch (error) {
      console.error('Error fetching consumers:', error)
      // Don't show alert for consumers as it might not exist yet
    } finally {
      setIsLoading(false)
    }
  }

  // Load data from Google Sheets on component mount
  useEffect(() => {
    const fetchData = async () => {
      await fetchCoupons()
      await fetchConsumers()
    }
    fetchData()
  }, [])

  // Refresh data from Google Sheets
  const refreshData = async (): Promise<void> => {
    setIsLoading(true)
    await fetchCoupons()
    await fetchConsumers()
  }

  const getFormLink = (couponCode: string): string => {
    return `${window.location.origin}/redeem?code=${couponCode}`
  }

const downloadBarcodes = (): void => {
  const barcodesToDownload =
    selectedCoupons.length > 0
      ? coupons.filter((c) => selectedCoupons.includes(c.code))
      : coupons.filter((c) => c.status === "unused")

  // Create a new window with enhanced QR codes for printing
  const printWindow = window.open("", "_blank")
  if (!printWindow) return

  const barcodeHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Premium Coupon QR Codes - Print Ready</title>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
        <style>
          body { 
            font-family: 'Inter', 'Arial', sans-serif; 
            margin: 20px; 
            background: linear-gradient(135deg, #fef7ed, #fff7ed);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 25px;
            background: linear-gradient(135deg, #d97706, #f59e0b);
            color: white;
            border-radius: 15px;
            box-shadow: 0 10px 25px rgba(217, 119, 6, 0.3);
          }
          .qrcode-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 30px; 
            margin-bottom: 40px;
          }
          .qrcode-item { 
            border: 2px solid #f59e0b; 
            padding: 25px; 
            text-align: center; 
            page-break-inside: avoid;
            background: linear-gradient(135deg, #fefbf3, #ffffff);
            border-radius: 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.08);
          }
          .qrcode-svg { 
            margin: 20px 0; 
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 15px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          }
          .code { 
            font-family: 'Courier New', monospace; 
            font-size: 20px; 
            font-weight: bold; 
            margin: 15px 0;
            background: #fef3c7;
            color: #d97706;
            padding: 12px 20px;
            border-radius: 30px;
            display: inline-block;
            border: 2px solid #f59e0b;
          }
          .link { 
            font-size: 12px; 
            color: #6b7280; 
            word-break: break-all; 
            margin: 15px 0;
            background: #f9fafb;
            padding: 12px;
            border-radius: 10px;
            border: 1px solid #d1d5db;
          }
          .reward { 
            font-size: 18px; 
            color: #059669; 
            font-weight: bold; 
            margin: 15px 0;
            background: #d1fae5;
            padding: 12px 20px;
            border-radius: 30px;
            border: 2px solid #10b981;
            display: inline-block;
          }
          .instructions {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border: 2px solid #f59e0b;
            border-radius: 15px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          }
          @media print { 
            body { margin: 0; background: white; } 
            .qrcode-item { break-inside: avoid; }
            .header { background: #d97706 !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✨ Premium Coupon Collection</h1>
          <p>Total: ${barcodesToDownload.length} exclusive coupons | Each worth ₹${barcodesToDownload[0]?.reward || 100}</p>
        </div>
        
        <div class="instructions">
          <strong>🎯 Premium Experience:</strong> Scan QR code or visit link → Complete elegant form → Claim ₹${barcodesToDownload[0]?.reward || 100} reward instantly!
        </div>
        
        <div class="qrcode-grid">
          ${barcodesToDownload
            .map((coupon) => {
              const formLink = getFormLink(coupon.code)
              return `
              <div class="qrcode-item">
                <div class="qrcode-svg">
                  <canvas id="qrcode-${coupon.code}" width="200" height="200"></canvas>
                </div>
                <div class="code">${coupon.code}</div>
                <div class="link">${formLink}</div>
                <div class="reward">✨ ₹${coupon.reward} Premium Reward</div>
              </div>
            `
            })
            .join("")}
        </div>
        
        <div style="text-align: center; margin-top: 40px; color: #6b7280; font-size: 14px;">
          Generated on ${new Date().toLocaleString()} | Total Premium Value: ₹${barcodesToDownload.reduce((sum, coupon) => sum + coupon.reward, 0)}
        </div>
        
        <script>
          // Generate QR codes after page loads
          window.onload = function() {
            ${barcodesToDownload
              .map((coupon) => {
                const formLink = getFormLink(coupon.code)
                return `
                QRCode.toCanvas(
                  document.getElementById('qrcode-${coupon.code}'),
                  '${formLink}',
                  {
                    width: 200,
                    margin: 1,
                    color: {
                      dark: '#d97706',
                      light: '#ffffff'
                    }
                  },
                  function (error) {
                    if (error) console.error(error)
                  }
                )
                `
              })
              .join("")}
            
            setTimeout(() => window.print(), 500);
          }
        </script>
      </body>
    </html>
  `

  printWindow.document.write(barcodeHTML)
  printWindow.document.close()
}

  const toggleCouponSelection = (couponCode: string): void => {
    setSelectedCoupons((prev) =>
      prev.includes(couponCode) ? prev.filter((code) => code !== couponCode) : [...prev, couponCode],
    )
  }

  const selectAllUnused = (): void => {
    const unusedCodes = coupons.filter((c) => c.status === "unused").map((c) => c.code)
    setSelectedCoupons(unusedCodes)
  }

  // Filter coupons based on search term and status
  const filteredCoupons = coupons.filter((coupon) => {
    const matchesSearch =
      coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (coupon.claimedBy && coupon.claimedBy.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = filterStatus === "all" || coupon.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Calculate statistics
  const totalCoupons = coupons.length
  const usedCoupons = coupons.filter((c) => c.status === "used").length
  const unusedCoupons = coupons.filter((c) => c.status === "unused").length
  const totalRewards = coupons.filter(c => c.status === "used").reduce((sum, coupon) => sum + coupon.reward, 0)

  // Export data as CSV
  const exportData = (): void => {
    const csvContent = [
      ["Coupon Code", "Status", "Claimed By", "Phone", "Email", "Date Claimed", "Reward Amount", "Form Link"],
      ...coupons.map((coupon) => [
        coupon.code,
        coupon.status,
        coupon.claimedBy || "",
        consumers.find(c => c.couponCode === coupon.code)?.phone || "",
        consumers.find(c => c.couponCode === coupon.code)?.email || "",
        coupon.claimedAt || "",
        coupon.status === "used" ? `₹${coupon.reward}` : "₹0",
        getFormLink(coupon.code),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "premium-coupon-tracking-data.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading && coupons.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-orange-50/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-600 mx-auto mb-4" />
          <div className="text-lg font-semibold text-gray-700">Loading tracking data...</div>
          <div className="text-sm text-gray-500 mt-2">Fetching coupons and consumer data from Google Sheets</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-orange-50/20 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden h-28 sm:h-32">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Coupons</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{totalCoupons}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden h-28 sm:h-32">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm font-medium text-gray-600">Used Coupons</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl sm:text-2xl font-bold text-emerald-600">{usedCoupons}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden h-28 sm:h-32">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm font-medium text-gray-600">Unused Coupons</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl sm:text-2xl font-bold text-amber-600">{unusedCoupons}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden h-28 sm:h-32">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-purple-600"></div>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Rewards</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">₹{totalRewards}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tracking Table */}
        <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400"></div>
          
          <CardHeader className="px-6 sm:px-8 py-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <CardTitle className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">Premium Tracking System</CardTitle>
                <CardDescription className="text-gray-600 text-base">Complete overview of all coupons, their status, and consumer details</CardDescription>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={refreshData} 
                  disabled={isLoading}
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl border-gray-200 hover:bg-gray-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
                <Button onClick={() => setShowBarcodes(!showBarcodes)} variant="outline" size="sm" className="rounded-xl border-gray-200 hover:bg-gray-50">
                  <Eye className="h-4 w-4 mr-2" />
                  {showBarcodes ? "Hide" : "Show"} Barcodes
                </Button>
                <Button onClick={downloadBarcodes} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl shadow-lg" size="sm">
                  <QrCode className="h-4 w-4 mr-2" />
                  Download ({selectedCoupons.length || unusedCoupons})
                </Button>
                <Button onClick={exportData} variant="outline" size="sm" className="rounded-xl border-gray-200 hover:bg-gray-50">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-6 sm:px-8 pb-8">
            {/* Search and Filter Controls */}
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search by coupon code or consumer name..."
                  value={searchTerm}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-12 py-4 rounded-xl border-gray-200 bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all duration-200"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("all")}
                  className={`rounded-xl ${filterStatus === "all" ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white" : "border-gray-200 hover:bg-gray-50"}`}
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === "used" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("used")}
                  className={`rounded-xl ${filterStatus === "used" ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white" : "border-gray-200 hover:bg-gray-50"}`}
                >
                  Used
                </Button>
                <Button
                  variant={filterStatus === "unused" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("unused")}
                  className={`rounded-xl ${filterStatus === "unused" ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" : "border-gray-200 hover:bg-gray-50"}`}
                >
                  Unused
                </Button>
              </div>
            </div>

            {coupons.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-6">
                <Button onClick={selectAllUnused} variant="outline" size="sm" className="rounded-xl border-gray-200 hover:bg-gray-50">
                  Select All Unused ({unusedCoupons})
                </Button>
                <Button onClick={() => setSelectedCoupons([])} variant="outline" size="sm" className="rounded-xl border-gray-200 hover:bg-gray-50">
                  Clear Selection
                </Button>
                <span className="text-sm text-gray-500 self-center bg-gray-100 px-3 py-1 rounded-full">{selectedCoupons.length} selected</span>
              </div>
            )}

            {showBarcodes && filteredCoupons.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-6 text-gray-800">Premium Barcode View</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredCoupons.map((coupon) => (
  <BarcodeDisplay 
    key={coupon.code} 
    code={coupon.code} 
    formLink={getFormLink(coupon.code)} 
    reward={coupon.reward} // Pass the actual reward amount
  />
))}
                </div>
              </div>
            )}

            {/* Enhanced Table for Desktop */}
            <div className="hidden lg:block">
              <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
                      <TableRow className="border-gray-200">
                        {/* <TableHead className="w-[60px] py-4">Select</TableHead> */}
                        <TableHead className="w-[140px] py-4">Coupon Code</TableHead>
                        <TableHead className="w-[100px] py-4">Status</TableHead>
                        <TableHead className="py-4">Consumer Name</TableHead>
                        <TableHead className="py-4">Phone</TableHead>
                        <TableHead className="py-4">Email</TableHead>
                        <TableHead className="py-4">Date Claimed</TableHead>
                        <TableHead className="text-right py-4">Reward</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCoupons.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                            {coupons.length === 0 ? "No coupons generated yet" : "No coupons match your search criteria"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCoupons.map((coupon) => {
                          const consumer = consumers.find(c => c.couponCode === coupon.code)
                          return (
                            <TableRow key={coupon.code} className="border-gray-100 hover:bg-gray-50/50">
                              {/* <TableCell className="py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedCoupons.includes(coupon.code)}
                                  onChange={() => toggleCouponSelection(coupon.code)}
                                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                              </TableCell> */}
                              <TableCell className="font-mono text-sm py-4">{coupon.code}</TableCell>
                              <TableCell className="py-4">
                                <Badge 
                                  variant={coupon.status === "used" ? "default" : "secondary"}
                                  className={`rounded-full ${coupon.status === "used" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-700 border-gray-200"}`}
                                >
                                  {coupon.status === "used" ? "Used" : "Unused"}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4">{coupon.claimedBy || consumer?.name || "-"}</TableCell>
                              <TableCell className="py-4">{consumer?.phone || "-"}</TableCell>
                              <TableCell className="py-4">{consumer?.email || "-"}</TableCell>
                              <TableCell className="py-4">{coupon.claimedAt || consumer?.date || "-"}</TableCell>
                              <TableCell className="text-right font-medium py-4">
                                {coupon.status === "used" ? (
                                  <span className="text-emerald-600 font-semibold">₹{coupon.reward}</span>
                                ) : (
                                  <span className="text-gray-400">₹{coupon.reward}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {filteredCoupons.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {coupons.length === 0 ? "No coupons generated yet" : "No coupons match your search criteria"}
                </div>
              ) : (
                filteredCoupons.map((coupon) => {
                  const consumer = consumers.find(c => c.couponCode === coupon.code)
                  return (
                    <Card key={coupon.code} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedCoupons.includes(coupon.code)}
                              onChange={() => toggleCouponSelection(coupon.code)}
                              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-mono text-sm font-medium text-gray-900">{coupon.code}</div>
                              <Badge 
                                variant={coupon.status === "used" ? "default" : "secondary"}
                                className={`rounded-full mt-1 ${coupon.status === "used" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-700 border-gray-200"}`}
                              >
                                {coupon.status === "used" ? "Used" : "Unused"}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            {coupon.status === "used" ? (
                              <span className="text-emerald-600 font-semibold">₹{coupon.reward}</span>
                            ) : (
                              <span className="text-gray-400">₹0</span>
                            )}
                          </div>
                        </div>
                        
                        {(coupon.claimedBy || consumer) && (
                          <div className="space-y-2 text-sm">
                            <div><span className="text-gray-500">Name:</span> <span className="text-gray-900">{coupon.claimedBy || consumer?.name}</span></div>
                            {consumer?.phone && <div><span className="text-gray-500">Phone:</span> <span className="text-gray-900">{consumer.phone}</span></div>}
                            {consumer?.email && <div><span className="text-gray-500">Email:</span> <span className="text-gray-900">{consumer.email}</span></div>}
                            {(coupon.claimedAt || consumer?.date) && <div><span className="text-gray-500">Date:</span> <span className="text-gray-900">{coupon.claimedAt || consumer?.date}</span></div>}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Consumer Details Table */}
        {consumers.length > 0 && (
          <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400"></div>
            
            <CardHeader className="px-6 sm:px-8 py-8">
              <CardTitle className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">Consumer Details</CardTitle>
              <CardDescription className="text-gray-600 text-base">All consumers who have claimed premium rewards</CardDescription>
            </CardHeader>
            
            <CardContent className="px-6 sm:px-8 pb-8">
              {/* Desktop Consumer Table */}
              <div className="hidden lg:block">
                <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="max-h-80 overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
                        <TableRow className="border-gray-200">
                          <TableHead className="py-4">Name</TableHead>
                          <TableHead className="py-4">Phone</TableHead>
                          <TableHead className="py-4">Email</TableHead>
                          <TableHead className="py-4">Coupon Used</TableHead>
                          <TableHead className="py-4">Date</TableHead>
                          <TableHead className="text-right py-4">Reward</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {consumers.map((consumer, index) => {
                          const coupon = coupons.find(c => c.code === consumer.couponCode)
                          return (
                            <TableRow key={index} className="border-gray-100 hover:bg-gray-50/50">
                              <TableCell className="font-medium py-4 text-gray-900">{consumer.name}</TableCell>
                              <TableCell className="py-4 text-gray-700">{consumer.phone}</TableCell>
                              <TableCell className="py-4 text-gray-700">{consumer.email}</TableCell>
                              <TableCell className="font-mono text-sm py-4 text-gray-900">{consumer.couponCode}</TableCell>
                              <TableCell className="py-4 text-gray-700">{consumer.date}</TableCell>
                              <TableCell className="text-right font-semibold py-4 text-emerald-600">₹{coupon?.reward || 100}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Mobile Consumer Cards */}
              <div className="lg:hidden space-y-4">
                {consumers.map((consumer, index) => {
                  const coupon = coupons.find(c => c.code === consumer.couponCode)
                  return (
                    <Card key={index} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="font-medium text-gray-900 text-lg">{consumer.name}</div>
                            <div className="font-mono text-sm text-gray-600 mt-1">{consumer.couponCode}</div>
                          </div>
                          <div className="text-emerald-600 font-semibold text-lg">₹{coupon?.reward || 100}</div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-500">Phone:</span> <span className="text-gray-900">{consumer.phone}</span></div>
                          <div><span className="text-gray-500">Email:</span> <span className="text-gray-900">{consumer.email}</span></div>
                          <div><span className="text-gray-500">Date:</span> <span className="text-gray-900">{consumer.date}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}