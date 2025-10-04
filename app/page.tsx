"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AdminDashboard from "@/components/admin-dashboard"
import ConsumerInterface from "@/components/consumer-interface"
import TrackingSystem from "@/components/tracking-system"

export default function CouponSystem() {
  // activeView ke liye type union banaya hai
  const [activeView, setActiveView] = useState<"admin" | "consumer" | "tracking">("admin")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex flex-col">
      <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pb-16 sm:pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Main Header Card */}
          <div className="relative mb-4 sm:mb-6 md:mb-8">
            <Card className="relative border border-gray-200/60 shadow-sm bg-[#fafafa] backdrop-blur-sm rounded-2xl sm:rounded-3xl overflow-hidden">
              {/* Header */}
              <CardHeader className="text-center px-4 py-3 sm:px-6 sm:py-4 md:px-8">
                <CardTitle className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1">
                  <span className="bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 bg-clip-text text-transparent tracking-tight">
                    Coupon Management
                  </span>
                </CardTitle>
              </CardHeader>

              {/* Content */}
              <CardContent className="px-3 sm:px-4 md:px-6 lg:px-8 pb-6 sm:pb-8">
                {/* Buttons as Premium Cards */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full">
                  {/* Admin */}
                  <Card
                    onClick={() => setActiveView("admin")}
                    className={`cursor-pointer transition-all duration-300 
                      w-full sm:w-1/3 rounded-xl sm:rounded-2xl border min-h-[88px] sm:min-h-[80px]
                      ${
                        activeView === "admin"
                          ? "bg-emerald-600 text-white shadow-lg"
                          : "bg-white/80 text-gray-700 border-gray-200 hover:shadow-md"
                      }`}
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-full">
                      <div
                        className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full
                        ${activeView === "admin" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600"}`}
                      >
                        ⚙️
                      </div>
                      <p
                        className={`text-sm sm:text-sm font-medium 
                        ${activeView === "admin" ? "text-white" : "text-gray-700"}`}
                      >
                        Admin Dashboard
                      </p>
                    </CardContent>
                  </Card>

                  {/* Tracking */}
                  <Card
                    onClick={() => setActiveView("tracking")}
                    className={`cursor-pointer transition-all duration-300 
                      w-full sm:w-1/3 rounded-xl sm:rounded-2xl border min-h-[88px] sm:min-h-[80px]
                      ${
                        activeView === "tracking"
                          ? "bg-emerald-600 text-white shadow-lg"
                          : "bg-white/80 text-gray-700 border-gray-200 hover:shadow-md"
                      }`}
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-full">
                      <div
                        className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full
                        ${activeView === "tracking" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600"}`}
                      >
                        📊
                      </div>
                      <p
                        className={`text-sm sm:text-sm font-medium 
                        ${activeView === "tracking" ? "text-white" : "text-gray-700"}`}
                      >
                        Tracking System
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Active Section Content */}
                <div className="relative mt-6 sm:mt-8">
                  <div className="relative p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-gray-200/40 bg-white/70 shadow-sm">
                    {activeView === "admin" && (
                      <div className="animate-in fade-in-0 duration-500">
                        <AdminDashboard />
                      </div>
                    )}
                    {activeView === "consumer" && (
                      <div className="animate-in fade-in-0 duration-500">
                        <ConsumerInterface />
                      </div>
                    )}
                    {activeView === "tracking" && (
                      <div className="animate-in fade-in-0 duration-500">
                        <TrackingSystem />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 bg-white/80 backdrop-blur-sm mt-auto">
        <div className="relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="text-center">
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Powered by{" "}
              <span className="font-bold text-slate-700 bg-gradient-to-r from-slate-600 to-slate-800 bg-clip-text text-transparent">
                Botivate
              </span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
