// pages/index.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dapps page
    router.replace('/dapps');
  }, [router]);

  return (
    <>
      <Head>
        <title>dApp Marketplace</title>
      </Head>
      <main style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>Redirecting to dApps...</p>
        </div>
      </main>
    </>
  );
}

