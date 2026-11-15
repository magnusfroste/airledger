import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				
				/* Air Ledger Design System Colors */
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					light: 'hsl(var(--primary-light))',
					dark: 'hsl(var(--primary-dark))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))',
					light: 'hsl(var(--success-light))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				surface: {
					DEFAULT: 'hsl(var(--surface))',
					elevated: 'hsl(var(--surface-elevated))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-success': 'var(--gradient-success)',
				'gradient-surface': 'var(--gradient-surface)'
			},
			boxShadow: {
				'soft': 'var(--shadow-soft)',
				'medium': 'var(--shadow-medium)',
				'large': 'var(--shadow-large)'
			},
			spacing: {
				'section': 'var(--spacing-section)',
				'card': 'var(--spacing-card)'
			},
			transitionTimingFunction: {
				'smooth': 'var(--transition-smooth)',
				'bounce': 'var(--transition-bounce)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			padding: {
				'safe': 'env(safe-area-inset-bottom)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			typography: {
				DEFAULT: {
					css: {
						'--tw-prose-body': 'currentColor',
						'--tw-prose-invert-body': 'currentColor',
						'--tw-prose-headings': 'currentColor',
						'--tw-prose-invert-headings': 'currentColor',
						'--tw-prose-lead': 'currentColor',
						'--tw-prose-invert-lead': 'currentColor',
						'--tw-prose-links': 'currentColor',
						'--tw-prose-invert-links': 'currentColor',
						'--tw-prose-bold': 'currentColor',
						'--tw-prose-invert-bold': 'currentColor',
						'--tw-prose-counters': 'currentColor',
						'--tw-prose-invert-counters': 'currentColor',
						'--tw-prose-bullets': 'currentColor',
						'--tw-prose-invert-bullets': 'currentColor',
						'--tw-prose-quotes': 'currentColor',
						'--tw-prose-invert-quotes': 'currentColor',
						'--tw-prose-code': 'currentColor',
						'--tw-prose-invert-code': 'currentColor',
						'--tw-prose-captions': 'currentColor',
						'--tw-prose-invert-captions': 'currentColor',
						'--tw-prose-th-borders': 'hsl(var(--border))',
						'--tw-prose-invert-th-borders': 'hsl(var(--border))',
						'--tw-prose-td-borders': 'hsl(var(--border))',
						'--tw-prose-invert-td-borders': 'hsl(var(--border))',
						'--tw-prose-hr': 'hsl(var(--border))',
						'--tw-prose-invert-hr': 'hsl(var(--border))',
						'--tw-prose-quote-borders': 'hsl(var(--border))',
						'--tw-prose-invert-quote-borders': 'hsl(var(--border))',
						'--tw-prose-kbd': 'currentColor',
						'--tw-prose-invert-kbd': 'currentColor',
						'--tw-prose-pre-code': 'hsl(var(--foreground))',
						'--tw-prose-invert-pre-code': 'hsl(var(--foreground))',
						'--tw-prose-pre-bg': 'hsl(var(--background))',
						'--tw-prose-invert-pre-bg': 'hsl(var(--background))',
						'code::before': { content: 'none' },
						'code::after': { content: 'none' },
						'blockquote p:first-of-type::before': { content: 'none' },
						'blockquote p:last-of-type::after': { content: 'none' },
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [tailwindcssAnimate, typography],
} satisfies Config;
