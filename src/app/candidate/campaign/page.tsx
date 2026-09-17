"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { CandidateLayout } from "@/components/candidate-dashboard/CandidateLayout"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { useCandidateApplication } from "@/hooks/useCandidateApplication"
import { updateMyProfile, uploadCandidatePhoto, downscaleImageToDataUrl } from "@/lib/candidate-api"
import {
  Upload,
  Image,
  CheckCircle2,
  AlertTriangle,
  Save,
  Trash2,
  Replace,
  Info,
} from "lucide-react"

const LOGO_GUIDELINES = [
  "Square image recommended",
  "Clear, recognizable logo",
  "Readable at small sizes",
  "Avoid copyrighted content",
  "Avoid offensive content",
  "Do not use real political party symbols",
  "Do not use misleading institutional logos",
]

interface CampaignDraft {
  logo: string | null
  title: string
  description: string
}

export default function CampaignPage() {
  const { application } = useCandidateApplication()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<CampaignDraft | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  // Loaded values (from the real application); draft (if any) overrides them.
  const loaded: CampaignDraft = application
    ? {
        logo: application.photo || null,
        title: application.position
          ? `${application.position} Campaign`
          : "My Campaign",
        description: application.bio || "",
      }
    : { logo: null, title: "", description: "" }
  const values = draft ?? loaded

  const patchDraft = (patch: Partial<CampaignDraft>) =>
    setDraft((prev) => ({ ...(prev ?? loaded), ...patch }))

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if (!validTypes.includes(file.type)) {
      alert("Please upload a PNG, JPG, JPEG, or WEBP image.")
      e.target.value = ""
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB.")
      e.target.value = ""
      return
    }

    setIsUploading(true)
    try {
      // Downscale via canvas (max 512px, JPEG ~85%) so the JSON payload stays
      // well under the backend's 1MB body limit, then upload to Appwrite
      // Storage via the backend. The DB keeps only the returned URL.
      const dataUrl = await downscaleImageToDataUrl(file)
      const { url } = await uploadCandidatePhoto(dataUrl)
      patchDraft({ logo: url })
    } catch (err) {
      alert(err instanceof Error ? err.message : "Photo upload failed. Try again.")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [loaded.logo])

  const handleRemoveLogo = () => {
    patchDraft({ logo: null })
    setShowRemoveConfirm(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      await updateMyProfile({
        profilePhotoUrl: values.logo ?? "",
        bio: values.description.trim(),
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save changes."
      )
    } finally {
      setSaving(false)
    }
  }

  const descriptionLimit = 300
  const descriptionLength = values.description.length

  return (
    <CandidateLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign</h1>
          <p className="text-gray-500">
            Manage your campaign logo and information.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Logo Section */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Campaign Logo
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Upload a logo that represents your campaign.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Upload campaign logo"
              />

              {values.logo ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50 flex-shrink-0">
                      <img
                        src={values.logo}
                        alt="Campaign logo preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-3">
                        Your campaign logo is ready. This will be displayed on
                        your candidate profile.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          <Replace className="w-4 h-4 mr-1.5" />
                          Replace
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setShowRemoveConfirm(true)}
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>

                  {showRemoveConfirm && (
                    <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                      <div className="flex items-center gap-3 mb-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <p className="text-sm font-medium text-red-900">
                          Remove campaign logo?
                        </p>
                      </div>
                      <p className="text-sm text-red-600 mb-4">
                        This action cannot be undone. You can upload a new logo
                        anytime.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRemoveConfirm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={handleRemoveLogo}
                        >
                          Yes, Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-primary-400 hover:bg-primary-50/50 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Upload className="w-7 h-7 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {isUploading ? "Uploading..." : "Upload your campaign logo"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Supported: PNG, JPG, JPEG, WEBP
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </Card>

            {/* Campaign Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Campaign Information
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Tell students what your campaign stands for.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Campaign Title
                  </label>
                  <input
                    type="text"
                    value={values.title}
                    readOnly
                    disabled
                    className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically derived from your contesting position.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Campaign Description
                    </label>
                    <span
                      className={`text-xs ${
                        descriptionLength > descriptionLimit
                          ? "text-red-600 font-medium"
                          : "text-gray-500"
                      }`}
                    >
                      {descriptionLength}/{descriptionLimit}
                    </span>
                  </div>
                  <textarea
                    value={values.description}
                    onChange={(e) => patchDraft({ description: e.target.value })}
                    placeholder="Describe your campaign in 300 characters or less"
                    maxLength={descriptionLimit}
                    rows={4}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1.5" />
                      Save Changes
                    </>
                  )}
                </Button>
                {saveSuccess && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">Saved successfully</span>
                  </div>
                )}
                {saveError && (
                  <span className="text-sm text-red-600">{saveError}</span>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Logo Guidelines */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Logo Guidelines
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Follow these guidelines for your campaign logo.
              </p>
              <ul className="space-y-2.5">
                {LOGO_GUIDELINES.map((guideline, index) => (
                  <li key={index} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{guideline}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Campaign Preview */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Campaign Preview
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                How your campaign will appear to students.
              </p>

              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                {values.logo ? (
                  <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-white">
                      <img
                        src={values.logo}
                        alt="Campaign logo preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 bg-white flex items-center justify-center">
                      <Image className="w-8 h-8 text-gray-300" />
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-base font-bold text-gray-900">
                    {values.title || "Your Campaign Title"}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                    {values.description ||
                      "Your campaign description will appear here."}
                  </p>
                </div>

                {!values.logo && (
                  <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>No logo uploaded yet</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Tips */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Quick Tips
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">
                    Keep your campaign title short and memorable.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">
                    Focus on 2-3 key promises in your description.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">
                    A clean logo helps students recognize your campaign.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </CandidateLayout>
  )
}
