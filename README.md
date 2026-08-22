# INOCASA — Boutique Thermomix® Tunisie

Vitrine e-commerce pour INOCASA, distributeur officiel Vorwerk / Thermomix® en Tunisie.
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui (style
`base-nova`, sur `@base-ui/react`).

Interface desktop uniquement (aucun breakpoint mobile), en français, prix en TND.

## Démarrage

```bash
pnpm install
pnpm dev
```

L'application est servie sur [http://localhost:3000](http://localhost:3000).

> Au premier `pnpm install`, pnpm peut bloquer le script postinstall de `msw` derrière
> une confirmation. Lancez `pnpm approve-builds msw` une fois si besoin.

## Scripts

| Commande | Effet |
|---|---|
| `pnpm dev` | Serveur de développement (Turbopack) |
| `pnpm build` | Build de production (`ignoreBuildErrors: false` — le build échoue sur toute erreur TypeScript) |
| `pnpm start` | Sert le build de production |

## Variables d'environnement

Copier `.env.example` vers `.env.local` et compléter :

| Variable | Rôle |
|---|---|
| `RESEND_API_KEY` | Clé API [Resend](https://resend.com) pour l'envoi des emails de commande. Laissée vide en développement : les commandes fonctionnent quand même, l'envoi d'email est simplement journalisé et ignoré (`lib/email.ts`). |
| `PAYMENT_PROVIDER` | `stub` (par défaut) ou `paymee`. Voir ci-dessous. |
| `PAYMEE_API_KEY` | Requise uniquement si `PAYMENT_PROVIDER=paymee`. |
| `NEXT_PUBLIC_SITE_URL` | URL publique du site, utilisée pour construire les URLs de retour de paiement et de webhook. |

## Paiement — adaptateur enfichable

`lib/payment.ts` expose `createPayment({ amount, reference, customer }) → { paymentUrl }`,
sélectionné via `PAYMENT_PROVIDER` :

- **`stub`** (défaut) — redirige vers `/paiement-simule?ref=…`, une page locale avec deux
  boutons (« Simuler un paiement réussi » / « Simuler un échec ») qui appellent
  `app/api/paiement/webhook/route.ts` pour faire passer la commande à `payee` ou `annulee`.
  Permet de démontrer et tester tout le parcours de paiement en ligne sans compte
  marchand réel.
- **`paymee`** — intègre la passerelle tunisienne [Paymee](https://paymee.tn) (sandbox :
  `https://sandbox.paymee.tn/api/v2/payments/create`), authentifiée par
  `Authorization: Token PAYMEE_API_KEY`.

Pour passer en production avec Paymee : définir `PAYMENT_PROVIDER=paymee`,
`PAYMEE_API_KEY`, et pointer `NEXT_PUBLIC_SITE_URL` vers le domaine public (utilisé pour
les URLs de retour et de webhook envoyées à Paymee).

Stripe n'est pas proposé : il ne prend pas en charge les marchands tunisiens.

## Commandes

Les commandes sont revalidées et re-tarifées côté serveur dans
`app/api/commande/route.ts` — les prix envoyés par le client ne sont jamais utilisés.
Elles sont persistées via `lib/orders.ts` dans un fichier `.data/orders.json` (créé
automatiquement, ignoré par git), en attendant un éventuel remplacement par une vraie
base de données. Statuts : `en_attente` → `payee` | `annulee`.

## Structure

- `lib/products.tsx` — catalogue produit (8 références réelles), TVA 19%, helpers de
  formatage.
- `lib/cart-context.tsx` — panier React Context, persisté dans `localStorage`
  (`inocasa-cart`).
- `lib/checkout-schema.ts` — schéma zod partagé entre le formulaire client et l'API.
- `lib/orders.ts`, `lib/payment.ts`, `lib/email.ts` — persistance, paiement, email.
- `components/boutique.tsx` — header, footer, carte produit, bandeau de confiance.
- `components/cart-drawer.tsx`, `components/product-detail.tsx` — composants client
  interactifs.
- `app/api/commande/route.ts`, `app/api/paiement/webhook/route.ts` — routes API.
