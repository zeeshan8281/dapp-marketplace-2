// pages/index.js
import Head from 'next/head';
import { datoFetch } from '../lib/datocms';
import PostList from '../components/PostList';

const QUERY = `query AllPosts($first: IntType) {
  allPosts(first: $first, orderBy: _publishedAt_DESC) {
    id
    title
    slug
    _publishedAt
    _firstPublishedAt
    _status
    author {
      name
      id
    }
    content {
      value
    }
    seoTags {
      title
      description
      image {
        url
        alt
      }
    }
    tags {
      id
      tag
      slug
    }
  }
}`;

export default function Home({ posts, error }) {
  return (
    <>
      <Head>
        <title>DatoCMS MVP</title>
      </Head>
      <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' }}>
        <h1 style={{ marginBottom: 8 }}>DatoCMS — MVP</h1>
        <p style={{ color: '#666', marginTop: 0 }}>Server-side GraphQL fetch + simple render</p>
        {error && (
          <div style={{ 
            padding: '16px', 
            marginBottom: '20px', 
            backgroundColor: '#fee', 
            border: '1px solid #fcc', 
            borderRadius: '8px',
            color: '#c33'
          }}>
            <strong>⚠️ API Error:</strong>
            <pre style={{ marginTop: '8px', fontSize: '12px', overflow: 'auto' }}>{error}</pre>
            <p style={{ marginTop: '8px', fontSize: '14px' }}>
              Check your <code>.env.local</code> file and ensure <code>DATOCMS_READONLY_TOKEN</code> is set correctly.
            </p>
          </div>
        )}
        <PostList posts={posts} />
      </main>
    </>
  );
}

export async function getServerSideProps() {
  try {
    const data = await datoFetch(QUERY, { first: 10 });
    
    // Format dates on the server to avoid hydration mismatches
    const posts = (data.allPosts || []).map(post => ({
      ...post,
      formattedDate: post._publishedAt 
        ? new Date(post._publishedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : null
    }));
    
    return { props: { posts } };
  } catch (err) {
    // Show error in development mode
    console.error('DatoCMS Error:', err);
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? err.message 
      : null;
    return { props: { posts: [], error: errorMessage } };
  }
}

