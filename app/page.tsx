import { redirect } from 'next/navigation'

// The marketing home page was removed; /boutique is now the site entry point.
export default function Home() {
  redirect('/boutique')
}
