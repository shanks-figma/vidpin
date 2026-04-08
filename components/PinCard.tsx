'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pin } from '@/lib/types'
import { TAG_COLORS, PLATFORM_LABELS } from '@/lib/ai'
import SaveToBoardModal from './SaveToBoardModal'

function getThumbnailAspect(pin: Pin): string {
  if (pin.sourcePlatform === 'tiktok' || pin.url.includes('/shorts/')) return 'aspect-[9/16]'
  if (pin.sourcePlatform === 'instagram') return 'aspect-[4/5]'
  return 'aspect-video'
}

export default function PinCard({ pin }: { pin: Pin }) {
  const aspectClass = getThumbnailAspect(pin)
  const [showSaveModal, setShowSaveModal] = useState(false)

  return (
    <>
      <div className="group relative">
        <Link href={`/pin/${pin.id}`} className="block">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
            {/* Thumbnail */}
            <div className={`relative w-full overflow-hidden ${aspectClass}`}>
              {pin.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pin.thumbnailUrl}
                  alt={pin.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
                  No thumbnail
                </div>
              )}
              {/* Platform badge */}
              <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                {PLATFORM_LABELS[pin.sourcePlatform]}
              </span>
            </div>

            {/* Content */}
            <div className="p-3">
              <h3 className="font-semibold text-sm text-gray-900 leading-snug mb-1 line-clamp-2">
                {pin.title}
              </h3>
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                {pin.summary}
              </p>

              {pin.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {pin.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[tag]}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* Save to board button (appears on hover) */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSaveModal(true) }}
          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
        >
          Save
        </button>
      </div>

      {showSaveModal && (
        <SaveToBoardModal pinId={pin.id} onClose={() => setShowSaveModal(false)} />
      )}
    </>
  )
}
