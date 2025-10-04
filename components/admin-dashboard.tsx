"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Gift, TrendingUp, Wallet, Loader2 } from "lucide-react"

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzfcdevw5wZLelGrr2tNvN6-wU_OmXdfaDR6tFsOlwSQtd9TAqw9qUv0lVjzBDF-6iO/exec"
const SHEET_NAME = "Coupons"

export default function PremiumAdminDashboard() {
  const [coupons, setCoupons] = useState([])
  const [batchSize, setBatchSize] = useState(10)
  const [rewardAmount, setRewardAmount] = useState(100)
  const [activeTab, setActiveTab] = useState("unused")
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Generate unique 8-digit code with letters and special characters
  const generateUniqueCode = (existingCodes) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!?"
    let code
    let attempts = 0
    const maxAttempts = 1000

    do {
      code = ""
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length))
      }
      attempts++

      if (attempts > maxAttempts) {
        throw new Error("Unable to generate unique code after maximum attempts")
      }
    } while (existingCodes.includes(code))

    return code
  }

  // Fetch coupons from Google Sheets
  const fetchCoupons = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=${SHEET_NAME}&action=fetch`)
      const result = await response.json()

      if (result.success && result.data) {
        // Skip header row and convert to coupon objects
        const couponData = result.data
          .slice(1)
          .map((row, index) => ({
            id: index + 1,
            created: row[0] || "",
            code: row[1] || "",
            status: row[2] || "unused",
            reward: row[3] || 0,
            claimedBy: row[4] || null,
            claimedAt: row[5] || null,
            rowIndex: index + 2, // +2 because sheet rows are 1-indexed and we skip header
          }))
          .filter((coupon) => coupon.code) // Filter out empty rows

        setCoupons(couponData)
      }
    } catch (error) {
      console.error("Error fetching coupons:", error)
      alert("Error fetching coupons from Google Sheets")
    } finally {
      setIsLoading(false)
    }
  }

  // Submit coupon to Google Sheets
  const submitCouponToSheet = async (couponData) => {
    const formData = new FormData()
    formData.append("sheetName", SHEET_NAME)
    formData.append("action", "insert")
    formData.append("rowData", JSON.stringify(couponData))

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: formData,
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || "Failed to submit coupon")
    }

    return result
  }

  // Mark coupon as deleted in Google Sheets
  const markCouponDeleted = async (rowIndex) => {
    const formData = new FormData()
    formData.append("sheetName", SHEET_NAME)
    formData.append("action", "markDeleted")
    formData.append("rowIndex", rowIndex.toString())
    formData.append("columnIndex", "3") // Status column (C)
    formData.append("value", "deleted")

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: formData,
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || "Failed to mark coupon as deleted")
    }

    return result
  }

  // Load coupons on component mount
  useEffect(() => {
    fetchCoupons()
  }, [])

  const generateCoupons = async () => {
    setIsGenerating(true)
    try {
      // Get existing codes to ensure uniqueness
      const existingCodes = coupons.map((coupon) => coupon.code)

      const newCoupons = []

      for (let i = 0; i < batchSize; i++) {
        const uniqueCode = generateUniqueCode(existingCodes.concat(newCoupons.map((c) => c[1])))
        const currentDate = new Date().toISOString().split("T")[0] // YYYY-MM-DD format

        // Prepare data for Google Sheets: [Created, Code, Status, Reward, Claimed By, Claimed At]
        const couponData = [currentDate, uniqueCode, "unused", rewardAmount, "", ""]

        // Submit to Google Sheets
        await submitCouponToSheet(couponData)
        newCoupons.push(couponData)
      }

      // Refresh the coupon list
      await fetchCoupons()

      alert(`Successfully generated ${batchSize} coupons!`)
    } catch (error) {
      console.error("Error generating coupons:", error)
      alert("Error generating coupons: " + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const deleteCoupon = async (coupon) => {
    if (!confirm("Are you sure you want to mark this coupon as deleted?")) {
      return
    }

    try {
      await markCouponDeleted(coupon.rowIndex)

      // Update local state
      setCoupons((prevCoupons) => prevCoupons.map((c) => (c.id === coupon.id ? { ...c, status: "deleted" } : c)))

      alert("Coupon marked as deleted successfully!")
    } catch (error) {
      console.error("Error deleting coupon:", error)
      alert("Error deleting coupon: " + error.message)
    }
  }

  const clearAllCoupons = async () => {
    if (!confirm("This will mark ALL coupons as deleted. Are you sure?")) {
      return
    }

    try {
      setIsLoading(true)

      // Mark all unused coupons as deleted
      for (const coupon of coupons.filter((c) => c.status === "unused")) {
        await markCouponDeleted(coupon.rowIndex)
      }

      await fetchCoupons()
      alert("All unused coupons marked as deleted!")
    } catch (error) {
      console.error("Error clearing coupons:", error)
      alert("Error clearing coupons: " + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const usedCoupons = coupons.filter((c) => c.status === "used")
  const unusedCoupons = coupons.filter((c) => c.status === "unused")
  const totalCoupons = coupons.length
  const totalRewards = usedCoupons.reduce((sum, coupon) => sum + (Number.parseFloat(coupon.reward) || 0), 0)

  const CouponTable = ({ coupons, title, emptyMessage }) => (
    <div>
      <div className="hidden lg:block">
        <div>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            {/* Table Header */}
            <div className="bg-orange-500 px-3 sm:px-4 py-3 sm:py-4 min-w-[800px]">
              <div className="grid grid-cols-7 gap-2 sm:gap-4 text-xs sm:text-sm font-semibold text-white">
                <div>Coupon Code</div>
                <div>Status</div>
                <div>Reward</div>
                <div>Created</div>
                <div className="block">Claimed By</div>
                <div className="block">Claimed At</div>
                <div>Actions</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="max-h-96 overflow-y-auto min-w-[800px]">
              {coupons.map((coupon, index) => (
                <div
                  key={coupon.id}
                  className={`grid grid-cols-7 gap-2 px-2 sm:px-4 py-3 border-b border-amber-100/50 hover:bg-amber-50/30 transition-all duration-200 
                    ${index % 2 === 0 ? "bg-white" : "bg-amber-50/20"}`}
                >
                  {/* Coupon Code */}
                  <div className="font-mono text-xs sm:text-sm font-bold text-gray-800 bg-amber-50 px-2 py-1 rounded-md inline-block border border-amber-200 truncate">
                    {coupon.code}
                  </div>

                  {/* Status */}
                  <div>
                    <Badge
                      className={`px-2 py-1 text-xs font-bold rounded-full border-0 shadow-sm ${
                        coupon.status === "used"
                          ? "bg-red-500 text-white"
                          : coupon.status === "deleted"
                            ? "bg-gray-500 text-white"
                            : "bg-emerald-500 text-white"
                      }`}
                    >
                      {coupon.status}
                    </Badge>
                  </div>

                  {/* Reward */}
                  <div className="text-xs sm:text-sm font-bold text-gray-900 truncate">₹{coupon.reward}</div>

                  {/* Created */}
                  <div className="text-xs sm:text-sm text-gray-600 font-medium truncate">{coupon.created}</div>

                  {/* Claimed By */}
                  <div className="text-xs sm:text-sm text-gray-600 font-medium truncate">{coupon.claimedBy || "-"}</div>

                  {/* Claimed At */}
                  <div className="text-xs sm:text-sm text-gray-600 font-medium truncate">{coupon.claimedAt || "-"}</div>

                  {/* Actions */}
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCoupon(coupon)}
                      disabled={coupon.status === "used" || coupon.status === "deleted"}
                      className="bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 rounded-md font-medium transition-all duration-200 h-8 w-8 sm:w-auto p-0 sm:px-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {coupons.length === 0 && (
          <div className="text-center py-12 sm:py-20">
            <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-amber-100 flex items-center justify-center shadow">
              <Gift className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" />
            </div>
            <div className="text-gray-600 font-medium text-base sm:text-lg px-4">{emptyMessage}</div>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-4 p-3 sm:p-6">
        {coupons.map((coupon) => (
          <Card
            key={coupon.id}
            className="group relative overflow-hidden border border-amber-200 bg-gradient-to-br from-white/90 to-amber-50/30 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl sm:rounded-2xl backdrop-blur-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 via-orange-400/5 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>

            <CardContent className="relative p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-5">
                <div className="flex justify-between items-start gap-3">
                  <div className="font-mono text-xs sm:text-sm font-bold text-gray-800 bg-gradient-to-r from-amber-100 to-amber-50 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl border border-amber-200 shadow-sm break-all">
                    {coupon.code}
                  </div>
                  <Badge
                    className={`px-2 sm:px-3 py-1 text-xs font-bold rounded-full border-0 shadow-sm flex-shrink-0 ${
                      coupon.status === "used"
                        ? "bg-gradient-to-r from-red-500 to-rose-600 text-white"
                        : coupon.status === "deleted"
                          ? "bg-gradient-to-r from-gray-500 to-gray-600 text-white"
                          : "bg-gradient-to-r from-emerald-500 to-green-600 text-white"
                    }`}
                  >
                    {coupon.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div className="space-y-1 sm:space-y-2">
                    <span className="text-gray-500 font-medium text-xs sm:text-sm">Reward</span>
                    <div className="font-bold text-gray-900 text-lg sm:text-xl">₹{coupon.reward}</div>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <span className="text-gray-500 font-medium text-xs sm:text-sm">Created</span>
                    <div className="text-gray-700 font-medium text-xs sm:text-sm">{coupon.created}</div>
                  </div>
                  {coupon.claimedBy && (
                    <>
                      <div className="space-y-1 sm:space-y-2">
                        <span className="text-gray-500 font-medium text-xs sm:text-sm">Claimed By</span>
                        <div className="text-gray-700 font-medium text-xs sm:text-sm break-words">
                          {coupon.claimedBy}
                        </div>
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        <span className="text-gray-500 font-medium text-xs sm:text-sm">Claimed At</span>
                        <div className="text-gray-700 font-medium text-xs sm:text-sm">{coupon.claimedAt}</div>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteCoupon(coupon)}
                    disabled={coupon.status === "used" || coupon.status === "deleted"}
                    className="w-full h-11 sm:h-10 bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 rounded-lg sm:rounded-xl font-medium transition-all duration-200 shadow-sm text-sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Coupon
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {coupons.length === 0 && (
          <div className="text-center py-12 sm:py-20">
            <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shadow-lg">
              <Gift className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" />
            </div>
            <div className="text-gray-600 font-medium text-base sm:text-lg px-4">{emptyMessage}</div>
          </div>
        )}
      </div>
    </div>
  )

  if (isLoading && coupons.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-orange-50/20 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-amber-600 mx-auto mb-4" />
          <div className="text-base sm:text-lg font-semibold text-gray-700">Loading coupons...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-orange-50/20 relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(245,158,11,0.05),transparent)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(217,119,6,0.05),transparent)] pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-200/50 to-transparent"></div>

      <div className="relative min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Refresh Button */}
          <div className="flex justify-end">
            <Button
              onClick={fetchCoupons}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 sm:px-6 py-2 h-10 sm:h-auto rounded-lg sm:rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                "Refresh Data"
              )}
            </Button>
          </div>

          {/* Premium Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <Card className="group relative overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl sm:rounded-2xl min-h-[100px] sm:min-h-[120px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative pb-1 px-3 sm:px-4 pt-2 sm:pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Total Coupons
                  </CardTitle>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
                    <Gift className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative px-3 sm:px-4 pb-2 sm:pb-3">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{totalCoupons}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 font-medium mt-1">Active campaigns</div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl sm:rounded-2xl min-h-[100px] sm:min-h-[120px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-green-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative pb-1 px-3 sm:px-4 pt-2 sm:pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Used Coupons
                  </CardTitle>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg flex-shrink-0">
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative px-3 sm:px-4 pb-2 sm:pb-3">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{usedCoupons.length}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 font-medium mt-1">Successfully redeemed</div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl sm:rounded-2xl min-h-[100px] sm:min-h-[120px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative pb-1 px-3 sm:px-4 pt-2 sm:pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Unused Coupons
                  </CardTitle>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg flex-shrink-0">
                    <Gift className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative px-3 sm:px-4 pb-2 sm:pb-3">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{unusedCoupons.length}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 font-medium mt-1">Available to claim</div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl sm:rounded-2xl min-h-[100px] sm:min-h-[120px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-purple-600"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative pb-1 px-3 sm:px-4 pt-2 sm:pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Total Rewards
                  </CardTitle>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                    <Wallet className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative px-3 sm:px-4 pb-2 sm:pb-3">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">₹{totalRewards}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 font-medium mt-1">Total distributed</div>
              </CardContent>
            </Card>
          </div>

          {/* Generate Coupons Section */}
          <Card className="border-0 bg-white/90 backdrop-blur-sm shadow-xl sm:shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400"></div>

            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                </div>
                <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
                  Generate Premium Coupons
                </CardTitle>
              </div>
            </div>

            <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="space-y-2">
                  <Label htmlFor="batchSize" className="text-xs sm:text-sm font-semibold text-gray-700">
                    Batch Size
                  </Label>
                  <Input
                    id="batchSize"
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number.parseInt(e.target.value) || 1)}
                    min="1"
                    max="100"
                    className="border-amber-200 rounded-lg sm:rounded-xl h-11 sm:h-12 font-medium focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white/90 text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rewardAmount" className="text-xs sm:text-sm font-semibold text-gray-700">
                    Reward Amount (₹)
                  </Label>
                  <Input
                    id="rewardAmount"
                    type="number"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(Number.parseInt(e.target.value) || 100)}
                    min="1"
                    className="border-amber-200 rounded-lg sm:rounded-xl h-11 sm:h-12 font-medium focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white/90 text-sm sm:text-base"
                  />
                </div>

                <div className="flex items-end sm:col-span-2 lg:col-span-1">
                  <Button
                    onClick={generateCoupons}
                    disabled={isGenerating}
                    className="w-full h-11 sm:h-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 text-sm sm:text-base"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Generate Coupons
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coupons Management Section */}
          <Card className="border-0 bg-white/90 backdrop-blur-sm shadow-xl sm:shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400"></div>

            <CardHeader className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 border-b border-amber-100/50">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
                <Button
                  variant={activeTab === "unused" ? "default" : "ghost"}
                  onClick={() => setActiveTab("unused")}
                  className={`rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold px-4 sm:px-6 py-2 sm:py-3 h-10 sm:h-auto transition-all duration-200 ${
                    activeTab === "unused"
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg"
                      : "text-gray-600 hover:bg-amber-50 hover:text-amber-700"
                  }`}
                >
                  Unused ({unusedCoupons.length})
                </Button>
                <Button
                  variant={activeTab === "used" ? "default" : "ghost"}
                  onClick={() => setActiveTab("used")}
                  className={`rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold px-4 sm:px-6 py-2 sm:py-3 h-10 sm:h-auto transition-all duration-200 ${
                    activeTab === "used"
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg"
                      : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  Used ({usedCoupons.length})
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {activeTab === "unused" && (
                <CouponTable
                  coupons={unusedCoupons}
                  title="Unused Coupons"
                  emptyMessage="No unused coupons available. Generate new coupons above."
                />
              )}
              {activeTab === "used" && (
                <CouponTable
                  coupons={usedCoupons}
                  title="Used Coupons"
                  emptyMessage="No coupons have been redeemed yet."
                />
              )}
            </CardContent>
          </Card>

          {/* Clear All Button */}
          <div className="flex justify-center py-4 sm:py-6 md:py-8">
            <Button
              variant="destructive"
              onClick={clearAllCoupons}
              disabled={isLoading}
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-6 sm:px-8 py-3 sm:py-4 h-11 sm:h-auto rounded-xl sm:rounded-2xl font-semibold shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 text-sm sm:text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Clear All Coupons
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
