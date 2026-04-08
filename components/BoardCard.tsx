'use client'

import Link from 'next/link'
import { Board, Pin } from '@/lib/types'
import { getPins } from '@/lib/pins'

export default function BoardCard({ board }: { board: Board }) {
  const allPins = getPins()
  const pins = board.pinIds
    .map((id) => allPins.find((p) => p.id === id))
    .filter(Boolean) as Pin[]
  const covers = pins.slice(0, 4)

  return (
    <Link href={`/board/${board.id}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
        {/* Cover collage */}
        <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
          {covers.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">📋</div>
          ) : covers.length === 1 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={covers[0].thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`grid h-full w-full gap-px ${covers.length >= 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2'}`}>
              {covers.map((pin, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={pin.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-semibold text-sm text-gray-900 truncate">{board.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {board.pinIds.length} pin{board.pinIds.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </Link>
  )
}
