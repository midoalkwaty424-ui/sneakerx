import type { Product } from '../../lib/types'
import { cx } from '../../lib/format'
import { VAULT_COLLAGE, type VaultCollageSlot } from '../../lib/vault-photos'
import { colorImages, thumbImage } from '../../lib/product-visuals'
import { ProductVisual } from '../commerce/ProductVisual'
import { useCompactDevice } from '../../hooks/useCompactDevice'

type VaultPhotoCollageProps = {
  product: Product
  className?: string
  priority?: boolean
}

function slotStyle(slot: VaultCollageSlot): React.CSSProperties {
  return {
    left: `${(slot.x / VAULT_COLLAGE.width) * 100}%`,
    top: `${(slot.y / VAULT_COLLAGE.height) * 100}%`,
    width: `${(slot.width / VAULT_COLLAGE.width) * 100}%`,
    height: `${(slot.height / VAULT_COLLAGE.height) * 100}%`,
  }
}

function Photo({
  image,
  alt,
  priority,
}: {
  image?: string | null
  alt: string
  priority?: boolean
}) {
  if (!image) {
    return <div className="h-full w-full bg-[repeating-linear-gradient(135deg,#11161d_0_10px,#0c1016_10px_20px)]" />
  }

  return (
    <ProductVisual
      image={image}
      alt={alt}
      fit="cover"
      priority={priority}
      className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04]"
    />
  )
}

/** DOM twin of the 3D Vault texture, so both rendering paths share one visual language. */
export function VaultPhotoCollage({ product, className, priority }: VaultPhotoCollageProps) {
  const compact = useCompactDevice()
  const shots = colorImages(product, product.colors[0])

  return (
    <div
      className={cx(
        'relative h-full w-full overflow-hidden rounded-[5%] bg-[#090c11] shadow-[0_18px_40px_rgba(0,0,0,0.45)] ring-1 ring-bone/10',
        className,
      )}
    >
      <div
        className="absolute overflow-hidden rounded-[4.5%] ring-1 ring-bone/20"
        style={compact ? { inset: 0 } : slotStyle(VAULT_COLLAGE.main)}
      >
        <Photo image={thumbImage(shots[0])} alt={product.name} priority={priority} />
        <span className="pointer-events-none absolute inset-0 bg-ink/45" />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/35" />
      </div>

      {!compact && VAULT_COLLAGE.details.map((slot, index) => (
        <div
          key={slot.x}
          className="absolute overflow-hidden rounded-[8%_/12%] bg-ink3 ring-1 ring-bone/10"
          style={slotStyle(slot)}
        >
          <Photo
            image={thumbImage(shots[index + 1])}
            alt={`${product.name} — تفصيل ${index + 1}`}
          />
          <span className="pointer-events-none absolute inset-0 bg-ink/50" />
        </div>
      ))}

      <span
        className="absolute bg-volt/80"
        style={{ left: '5.1%', top: '93.2%', width: '10.2%', height: '0.5%' }}
      />
      <span
        className="absolute bg-bone/10"
        style={{ left: '16.8%', top: '93.6%', width: '78%', height: '1px' }}
      />
    </div>
  )
}
