"use client"

import { useState, useEffect, ChangeEvent, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { storageUtils } from "@/lib/storage-utils"
import type { FormData, Message, Coupon } from "@/components/types/coupon"

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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const codeFromUrl = urlParams.get("code")
    if (codeFromUrl) {
      setFormData((prev) => ({ ...prev, couponCode: codeFromUrl }))
      // Validate coupon immediately
      const coupons = storageUtils.getCoupons()
      const coupon = coupons.find((c: Coupon) => c.code === codeFromUrl)
      if (coupon) {
        setCouponInfo(coupon)
        if (coupon.status === "used") {
          setMessage({
            type: "error",
            content: "This coupon has already been used and cannot be redeemed again.",
          })
        } else {
          setMessage({
            type: "success",
            content: "Coupon found! Please fill in your details to claim your ₹100 reward.",
          })
        }
      } else {
        setMessage({
          type: "error",
          content: "Invalid coupon code. Please check and try again.",
        })
      }
    }
  }, [])

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (name === "couponCode" && value.trim()) {
      const coupons = storageUtils.getCoupons()
      const coupon = coupons.find((c: Coupon) => c.code === value.trim())
      if (coupon) {
        setCouponInfo(coupon)
        if (coupon.status === "used") {
          setMessage({
            type: "error",
            content: "This coupon has already been used.",
          })
        } else {
          setMessage({
            type: "success",
            content: "Valid coupon! Fill in your details to claim ₹100 reward.",
          })
        }
      } else if (value.trim().length >= 5) {
        setCouponInfo(null)
        setMessage({
          type: "error",
          content: "Invalid coupon code.",
        })
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
    return true
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage({ type: "", content: "" })

    if (!validateForm()) {
      setIsSubmitting(false)
      return
    }

    setTimeout(() => {
      const result = storageUtils.redeemCoupon(formData.couponCode, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
      })

      if (result.success) {
        setMessage({
          type: "success",
          content: `🎉 Congratulations! Your coupon has been successfully redeemed. ₹${result.rewardAmount} reward has been credited to your account.`,
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
    }, 1000)
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="couponCode" className="text-sm font-semibold text-gray-700">
                  Enter coupon code (e.g., WIN100-00001)
                </Label>
                <Input
                  id="couponCode"
                  name="couponCode"
                  value={formData.couponCode}
                  onChange={handleInputChange}
                  placeholder="WIN100-00001"
                  className="font-mono text-lg text-center border-2 focus:border-blue-500"
                  autoComplete="off"
                />
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
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 text-lg"
                disabled={isSubmitting || !couponInfo || couponInfo.status === "used"}
              >
                {isSubmitting ? "Processing..." : "🎁 Claim ₹100 Reward"}
              </Button>
            </form>

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