import { redirect } from 'next/navigation';

// Old React Router catch-all: unknown URLs go back to the home page
export default function NotFound() {
  redirect('/');
}
