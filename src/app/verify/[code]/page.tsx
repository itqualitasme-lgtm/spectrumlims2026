import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { CheckCircle2, XCircle, Shield, FlaskConical, User, Calendar, FileText, Hash } from "lucide-react"

export default async function VerifyReportPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const verification = await db.reportVerification.findUnique({
    where: { verificationCode: code },
    include: {
      lab: {
        select: { name: true, address: true, phone: true, email: true, website: true },
      },
    },
  })

  if (!verification) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">Verification Failed</h1>
          <p className="text-gray-600 mb-4">
            This verification code is not valid. The report may be fraudulent or the code may have been tampered with.
          </p>
          <div className="bg-red-50 rounded-lg p-4 text-sm text-red-700">
            <p className="font-medium">What this means:</p>
            <ul className="mt-2 text-left space-y-1">
              <li>- The report was NOT issued by an authorized laboratory</li>
              <li>- The QR code may have been altered or fabricated</li>
              <li>- Contact the laboratory directly to verify the report</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  const issuedDate = format(new Date(verification.issuedAt), "dd MMMM yyyy, HH:mm")
  const verifiedDate = format(new Date(), "dd MMMM yyyy, HH:mm")

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg border border-green-200 overflow-hidden">
        {/* Success Header */}
        <div className="bg-green-600 text-white p-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <Shield className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Report Verified</h1>
          <p className="text-green-100 text-sm">
            This report is authentic and was issued by an authorized laboratory
          </p>
        </div>

        {/* Verification Details */}
        <div className="p-6 space-y-4">
          {/* Lab Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-green-600" />
              Laboratory
            </h2>
            <p className="text-gray-800 font-medium">{verification.lab.name}</p>
            {verification.lab.address && (
              <p className="text-gray-500 text-sm">{verification.lab.address}</p>
            )}
            {verification.lab.phone && (
              <p className="text-gray-500 text-sm">Tel: {verification.lab.phone}</p>
            )}
          </div>

          {/* Report Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                <FileText className="h-3.5 w-3.5" />
                Report Number
              </div>
              <p className="font-semibold text-gray-900">{verification.reportNumber}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                <Hash className="h-3.5 w-3.5" />
                Sample Number
              </div>
              <p className="font-semibold text-gray-900">{verification.sampleNumber}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                <User className="h-3.5 w-3.5" />
                Client
              </div>
              <p className="font-semibold text-gray-900">{verification.clientName}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                <FlaskConical className="h-3.5 w-3.5" />
                Sample Type
              </div>
              <p className="font-semibold text-gray-900">{verification.sampleType}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                <Calendar className="h-3.5 w-3.5" />
                Date Issued
              </div>
              <p className="font-semibold text-gray-900 text-sm">{issuedDate}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Tests Count
              </div>
              <p className="font-semibold text-gray-900">{verification.testCount} parameters</p>
            </div>
          </div>

          {/* Issued By */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
              <User className="h-3.5 w-3.5" />
              Issued By
            </div>
            <p className="font-semibold text-gray-900">{verification.issuedBy}</p>
          </div>

          {/* Verification stamp */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 text-green-700 mb-1">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold text-sm">Authenticity Confirmed</span>
            </div>
            <p className="text-xs text-gray-500">
              Verified on {verifiedDate}. This digital verification confirms that the report
              was generated by {verification.lab.name} through the Spectrum LIMS system.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
