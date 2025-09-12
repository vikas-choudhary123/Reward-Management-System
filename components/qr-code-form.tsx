"use client"

import { useState, useEffect, ChangeEvent, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FormData {
  couponCode: string
  name: string
  phone: string
  email: string
}

interface Message {
  type: "success" | "error" | ""
  content: string
}

interface Coupon {
  code: string
  status: string
  rewardAmount: number
}

export default function QRCodeForm() {
  const [formData, setFormData] = useState<FormData>({
    couponCode: "",
    name: "",
    phone: "",
    email: "",
  })
  const [message, setMessage] = useState<Message>({ type: "", content: "" })
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [couponInfo, setCouponInfo] = useState<Coupon | null>(null)
  const [isValidatingCoupon, setIsValidatingCoupon] = useState<boolean>(false)

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzfcdevw5wZLelGrr2tNvN6-wU_OmXdfaDR6tFsOlwSQtd9TAqw9qUv0lVjzBDF-6iO/exec"

  // Function to fetch and validate coupon from Google Sheets
  const validateCouponFromSheet = async (couponCode: string): Promise<{ isValid: boolean, isUsed: boolean, rewardAmount: number }> => {
    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=Coupons&action=fetch`)
      const data = await response.json()
      
      if (data.success && data.data) {
        // data.data is 2D array from Google Sheets
        // Assuming: Column A = Serial No, Column B = Coupon Code, Column C = Status
        for (let i = 1; i < data.data.length; i++) { // Skip header row
          const row = data.data[i]
          const sheetCouponCode = row[1] ? row[1].toString().trim().toUpperCase() : ""
          const status = row[2] ? row[2].toString().trim().toLowerCase() : ""
          const rewardAmount = row[3] ? parseInt(row[3]) : 100 // Default to 100 if not specified
          
          // if (sheetCouponCode === couponCode.trim().toUpperCase()) {
       if (sheetCouponCode.startsWith(couponCode.trim().toUpperCase())) {
  // Auto-complete the input
  setFormData((prev) => ({ ...prev, couponCode: sheetCouponCode }))
  return {
    isValid: true,
    isUsed: status === "used",
    rewardAmount: rewardAmount
  }
}

        }
      }
      
      return { isValid: false, isUsed: false, rewardAmount: 0 }
    } catch (error) {
      console.error("Error validating coupon:", error)
      return { isValid: false, isUsed: false, rewardAmount: 0 }
    }
  }

  // Function to submit form data to Google Sheets
  const submitToGoogleSheets = async (formData: FormData): Promise<{ success: boolean, message: string }> => {
    try {
      const currentTimestamp = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })

      // Get current serial number by fetching existing data
      const fetchResponse = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=User_Claimed_Coupon&action=fetch`)
      const fetchData = await fetchResponse.json()
      let serialNo = 1
      
      if (fetchData.success && fetchData.data && fetchData.data.length > 1) {
        serialNo = fetchData.data.length // This will be the next serial number
      }

      const rowData = [
        currentTimestamp,
        serialNo,
        formData.couponCode.trim().toUpperCase(),
        formData.name.trim(),
        formData.phone.trim(),
        formData.email.trim()
      ]

      const submitParams = new URLSearchParams({
        sheetName: "User_Claimed_Coupon",
        action: "insert",
        rowData: JSON.stringify(rowData)
      })

      const submitResponse = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: submitParams.toString()
      })

      const result = await submitResponse.json()
      
      if (result.success) {
        // Also mark the coupon as used in the Coupons sheet
        await markCouponAsUsed(formData.couponCode)
        return { success: true, message: "Form submitted successfully!" }
      } else {
        return { success: false, message: result.error || "Failed to submit form" }
      }
    } catch (error) {
      console.error("Error submitting to Google Sheets:", error)
      return { success: false, message: "Network error. Please try again." }
    }
  }

  // Function to mark coupon as used
  const markCouponAsUsed = async (couponCode: string) => {
    try {
      // First, fetch the coupons to find the row index
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=Coupons&action=fetch`)
      const data = await response.json()
      
      if (data.success && data.data) {
        for (let i = 1; i < data.data.length; i++) { // Skip header row
          const row = data.data[i]
          const sheetCouponCode = row[1] ? row[1].toString().trim().toUpperCase() : ""
          
          if (sheetCouponCode === couponCode.trim().toUpperCase()) {
            // Update the status column (column C, index 2) to "used"
            const updateParams = new URLSearchParams({
              sheetName: "Coupons",
              action: "update",
              rowIndex: (i + 1).toString(), // +1 because Google Sheets is 1-indexed
              rowData: JSON.stringify([row[0], row[1], "used", row[3] || 100]) // Keep other data, just change status
            })

            await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: updateParams.toString()
            })
            break
          }
        }
      }
    } catch (error) {
      console.error("Error marking coupon as used:", error)
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const codeFromUrl = urlParams.get("code")
    if (codeFromUrl) {
      setFormData((prev) => ({ ...prev, couponCode: codeFromUrl }))
      // Validate coupon immediately
      validateCoupon(codeFromUrl)
    }
  }, [])

  const validateCoupon = async (couponCode: string) => {
    if (!couponCode.trim()) {
      setCouponInfo(null)
      setMessage({ type: "", content: "" })
      return
    }

    setIsValidatingCoupon(true)
    const validation = await validateCouponFromSheet(couponCode)
    
    if (validation.isValid) {
      if (validation.isUsed) {
        setCouponInfo(null)
        setMessage({
          type: "error",
          content: "This coupon has already been used and cannot be redeemed again.",
        })
      } else {
        setCouponInfo({
          code: couponCode,
          status: "unused",
          rewardAmount: validation.rewardAmount
        })
        setMessage({
          type: "success",
          content: `Coupon found! Please fill in your details to claim your ₹${validation.rewardAmount} reward.`,
        })
      }
    } else {
      setCouponInfo(null)
      setMessage({
        type: "error",
        content: "Invalid coupon code. Please check and try again.",
      })
    }
    setIsValidatingCoupon(false)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (name === "couponCode") {
      // Only validate if user has typed enough characters and stopped typing
      if (value.trim().length >= 3) {
        // Add debounce effect
        const timeoutId = setTimeout(() => {
          validateCoupon(value)
        }, 500)
        
        return () => clearTimeout(timeoutId)
      } else {
        setCouponInfo(null)
        setMessage({ type: "", content: "" })
      }
    }
  }

  const validateForm = (): boolean => {
    if (!formData.couponCode.trim()) {
      setMessage({ type: "error", content: "Please enter a coupon code" })
      return false
    }
    if (!formData.name.trim()) {
      setMessage({ type: "error", content: "Please enter your name" })
      return false
    }
    if (!formData.phone.trim()) {
      setMessage({ type: "error", content: "Please enter your phone number" })
      return false
    }
    if (!formData.email.trim()) {
      setMessage({ type: "error", content: "Please enter your email" })
      return false
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setMessage({ type: "error", content: "Please enter a valid email address" })
      return false
    }
    if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      setMessage({ type: "error", content: "Please enter a valid 10-digit phone number" })
      return false
    }
    if (!couponInfo || couponInfo.status === "used") {
      setMessage({ type: "error", content: "Please enter a valid unused coupon code" })
      return false
    }
    return true
  }

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true)
    setMessage({ type: "", content: "" })

    if (!validateForm()) {
      setIsSubmitting(false)
      return
    }

    // Double-check coupon validity before submitting
    const validation = await validateCouponFromSheet(formData.couponCode)
    
    if (!validation.isValid) {
      setMessage({
        type: "error",
        content: "Invalid coupon code. Please check and try again.",
      })
      setIsSubmitting(false)
      return
    }

    if (validation.isUsed) {
      setMessage({
        type: "error",
        content: "This coupon has already been used and cannot be redeemed again.",
      })
      setIsSubmitting(false)
      return
    }

    // Submit to Google Sheets
    const result = await submitToGoogleSheets(formData)

    if (result.success) {
      setMessage({
        type: "success",
        content: `🎉 Congratulations! Your coupon has been successfully redeemed. ₹${validation.rewardAmount} reward has been credited to your account.`,
      })
      setCouponInfo(null)
      setFormData({
        couponCode: "",
        name: "",
        phone: "",
        email: "",
      })
    } else {
      setMessage({
        type: "error",
        content: result.message,
      })
    }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold">🎁 Claim Your Reward</CardTitle>
            <p className="text-blue-100">Enter your coupon code to claim ₹100 reward</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="couponCode" className="text-sm font-semibold text-gray-700">
                  Enter coupon code
                </Label>
                <Input
                  id="couponCode"
                  name="couponCode"
                  value={formData.couponCode}
                  onChange={handleInputChange}
                  placeholder="Enter coupon code (e.g., II&IMJXL)"
                  className="font-mono text-lg text-center border-2 focus:border-blue-500"
                  autoComplete="off"
                />
                {isValidatingCoupon && (
                  <p className="text-sm text-blue-600 mt-1">Validating coupon...</p>
                )}
              </div>

              {couponInfo && couponInfo.status === "unused" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-800 text-sm font-medium">
                    ✅ Valid Coupon - Reward: ₹{couponInfo.rewardAmount}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="border-2 focus:border-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="10-digit phone number"
                  className="border-2 focus:border-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@example.com"
                  className="border-2 focus:border-blue-500"
                />
              </div>

              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 text-lg"
                disabled={isSubmitting || !couponInfo || couponInfo.status === "used" || isValidatingCoupon}
              >
                {isSubmitting ? "Processing..." : `🎁 Claim ₹${couponInfo?.rewardAmount || 100} Reward`}
              </Button>
            </div>

            {message.content && (
              <Alert
                className={`mt-4 ${message.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}
              >
                <AlertDescription
                  className={`${message.type === "error" ? "text-red-700" : "text-green-700"} font-medium`}
                >
                  {message.content}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4 shadow-lg border-0">
          <CardContent className="p-4">
            <div className="text-center text-sm text-gray-600">
              <p className="font-semibold mb-2">📱 How it works:</p>
              <div className="space-y-1">
                <p>1. Scan QR code or enter coupon code</p>
                <p>2. Fill in your details</p>
                <p>3. Claim your ₹100 reward instantly!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}