// 15 purchasable building types — placeholder concepts, to be given final designs
export const SHOP_BUILDINGS = [
  { id: 'shop_tavern',      label: 'Tavern',           description: 'A rowdy gathering place',         cost: 15,  w: 1, h: 1, floors: 1, color: '#c8906a' },
  { id: 'shop_bakery',      label: 'Bakery',           description: 'Bread for the people',            cost: 20,  w: 1, h: 1, floors: 1, color: '#d4a870' },
  { id: 'shop_barracks',    label: 'Barracks',         description: 'House your soldiers',             cost: 40,  w: 2, h: 2, floors: 2, color: '#8a9a70' },
  { id: 'shop_library',     label: 'Library',          description: 'Knowledge of the ancients',       cost: 60,  w: 2, h: 2, floors: 3, color: '#c8b888' },
  { id: 'shop_theatre',     label: 'Theatre',          description: 'Drama and spectacle',             cost: 80,  w: 3, h: 2, floors: 2, color: '#c0907a' },
  { id: 'shop_lighthouse',  label: 'Lighthouse',       description: 'A beacon over the hills',        cost: 90,  w: 1, h: 1, floors: 5, color: '#e8d898' },
  { id: 'shop_aqueduct2',   label: 'Great Aqueduct',   description: 'Carry water across the city',    cost: 100, w: 1, h: 4, floors: 5, color: '#c8b080' },
  { id: 'shop_circus',      label: 'Circus',           description: 'Chariot races and glory',        cost: 120, w: 4, h: 2, floors: 2, color: '#d4906a' },
  { id: 'shop_senate',      label: 'Senate House',     description: 'Where laws are debated',         cost: 140, w: 2, h: 2, floors: 3, color: '#e0c888' },
  { id: 'shop_baths2',      label: 'Imperial Baths',   description: 'The grandest baths in Rome',     cost: 160, w: 3, h: 3, floors: 3, color: '#b0c8d0' },
  { id: 'shop_triumphal',   label: 'Triumphal Gate',   description: 'Mark your great victories',      cost: 180, w: 2, h: 1, floors: 3, color: '#d4b468' },
  { id: 'shop_odeon',       label: 'Odeon',            description: 'Music and poetry fill the air',  cost: 200, w: 2, h: 2, floors: 2, color: '#b898c8' },
  { id: 'shop_mausoleum',   label: 'Mausoleum',        description: 'An eternal resting place',       cost: 240, w: 2, h: 2, floors: 4, color: '#c0b090' },
  { id: 'shop_palace',      label: 'Imperial Palace',  description: 'Rule from on high',              cost: 280, w: 3, h: 3, floors: 4, color: '#f0d880' },
  { id: 'shop_oracle',      label: 'Oracle Shrine',    description: 'Commune with the gods',          cost: 320, w: 2, h: 2, floors: 3, color: '#d0a8e0' },
]

export default function BuildingShop({ denarii, onPurchase, onClose }) {
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 mx-2 rounded-2xl shadow-2xl overflow-hidden"
      style={{ background: 'rgba(250,243,232,0.98)', backdropFilter: 'blur(20px)', maxHeight: '60vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8d4a8]/60">
        <div>
          <h3 className="text-sm font-bold text-[#5a3a18]">Build</h3>
          <p className="text-[10px] text-[#8a6a44]">Place a building using your time</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-amber-700">ᴅ {denarii}</span>
          <button onClick={onClose} className="text-[#8a6a44] text-lg leading-none">✕</button>
        </div>
      </div>

      {/* Building grid */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(60vh - 56px)' }}>
        <div className="grid grid-cols-2 gap-2 p-3">
          {SHOP_BUILDINGS.map(b => {
            const canAfford = denarii >= b.cost
            return (
              <button
                key={b.id}
                onClick={() => canAfford && onPurchase(b)}
                disabled={!canAfford}
                className={`text-left p-3 rounded-xl border transition-all active:scale-95 ${
                  canAfford
                    ? 'border-[#c4a07e]/40 bg-white/50 hover:bg-[#e8d4a8]/40'
                    : 'border-[#e8d4a8]/30 bg-white/20 opacity-50'
                }`}
              >
                {/* Colour swatch */}
                <div
                  className="w-8 h-8 rounded-lg mb-2 shadow-inner"
                  style={{ background: b.color, border: '1px solid rgba(0,0,0,0.1)' }}
                />
                <p className="text-xs font-semibold text-[#5a3a18] leading-tight">{b.label}</p>
                <p className="text-[10px] text-[#8a6a44] leading-tight mt-0.5 mb-2">{b.description}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  canAfford ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'
                }`}>
                  ᴅ {b.cost}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
