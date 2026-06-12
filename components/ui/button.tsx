import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// ── Feel Free button system ────────────────────────────────────────────────
// Primary:   black fill · warm-white text · no border radius · opacity hover
// Outline:   black border · transparent fill · black text
// Ghost:     no border · subtle muted hover
// No rounded pills, no colored buttons, no gradients.

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'text-[11px] font-sans font-bold uppercase tracking-[0.14em] leading-none',
    'transition-opacity duration-150',
    'disabled:pointer-events-none disabled:opacity-40',
    '[&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-3.5 shrink-0 [&_svg]:shrink-0',
    'outline-none focus-visible:ring-1 focus-visible:ring-ring',
    'cursor-pointer',
  ].join(' '),
  {
    variants: {
      variant: {
        // Filled black — for primary actions
        default:
          'bg-foreground text-background hover:opacity-75',
        // Destructive — warm red, rarely used
        destructive:
          'bg-destructive text-white hover:opacity-80',
        // Ghost border — secondary actions
        outline:
          'border border-foreground bg-transparent text-foreground hover:opacity-60',
        // Muted surface — tertiary
        secondary:
          'bg-secondary text-secondary-foreground hover:opacity-70',
        // No border, no fill — inline actions
        ghost:
          'hover:bg-muted text-foreground hover:opacity-80',
        // Underline link style
        link:
          'text-foreground underline underline-offset-4 hover:opacity-60 p-0 h-auto tracking-normal text-xs uppercase-none font-normal',
      },
      size: {
        // Padding-only sizing — no fixed height, flex centering handles alignment.
        // 14px top/bottom, 24px left/right for default.
        default:   'py-[14px] px-6',
        sm:        'py-2 px-4 text-[10px]',
        lg:        'py-[18px] px-10 text-[12px]',
        icon:      'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
