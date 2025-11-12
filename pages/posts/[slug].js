// pages/posts/[slug].js
import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { datoFetch } from '../../lib/datocms';

const POST_QUERY = `query PostBySlug($slug: String!) {
  post(filter: { slug: { eq: $slug } }) {
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

// Helper to render structured text content
function renderStructuredText(content) {
  if (!content || !content.value) return null;

  const renderNode = (node, key = 0) => {
    if (!node) return null;

    // Handle text spans
    if (node.type === 'span') {
      let text = node.value || '';
      if (node.marks) {
        node.marks.forEach(mark => {
          if (mark === 'strong') {
            text = <strong key={key}>{text}</strong>;
          } else if (mark === 'emphasis') {
            text = <em key={key}>{text}</em>;
          } else if (mark === 'code') {
            text = <code key={key}>{text}</code>;
          }
        });
      }
      return text;
    }

    // Handle paragraphs
    if (node.type === 'paragraph') {
      return (
        <p key={key} style={{ marginBottom: '16px', lineHeight: '1.6' }}>
          {node.children && node.children.map((child, i) => renderNode(child, i))}
        </p>
      );
    }

    // Handle headings
    if (node.type === 'heading') {
      const HeadingTag = `h${node.level || 2}`;
      const styles = {
        marginTop: '24px',
        marginBottom: '16px',
        fontWeight: '600',
      };
      return (
        <HeadingTag key={key} style={styles}>
          {node.children && node.children.map((child, i) => renderNode(child, i))}
        </HeadingTag>
      );
    }

    // Handle lists
    if (node.type === 'list') {
      const ListTag = node.style === 'ordered' ? 'ol' : 'ul';
      return (
        <ListTag key={key} style={{ marginBottom: '16px', paddingLeft: '24px' }}>
          {node.children && node.children.map((item, i) => (
            <li key={i}>
              {item.children && item.children.map((child, j) => renderNode(child, j))}
            </li>
          ))}
        </ListTag>
      );
    }

    // Handle blockquotes
    if (node.type === 'blockquote') {
      return (
        <blockquote key={key} style={{ 
          margin: '16px 0', 
          paddingLeft: '16px', 
          borderLeft: '4px solid #ddd',
          fontStyle: 'italic'
        }}>
          {node.children && node.children.map((child, i) => renderNode(child, i))}
        </blockquote>
      );
    }

    // Handle code blocks
    if (node.type === 'code') {
      return (
        <pre key={key} style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '16px', 
          borderRadius: '4px',
          overflow: 'auto',
          marginBottom: '16px'
        }}>
          <code>{node.code}</code>
        </pre>
      );
    }

    // Handle inline items and blocks (references to other content)
    if (node.type === 'inlineItem' || node.type === 'block') {
      return (
        <span key={key} style={{ fontStyle: 'italic', color: '#666' }}>
          [Content reference]
        </span>
      );
    }

    // Recursively handle children
    if (node.children) {
      return (
        <React.Fragment key={key}>
          {node.children.map((child, i) => renderNode(child, i))}
        </React.Fragment>
      );
    }

    return null;
  };

  try {
    const document = content.value.document || content.value;
    if (document && document.children) {
      return (
        <div>
          {document.children.map((child, i) => renderNode(child, i))}
        </div>
      );
    }
  } catch (e) {
    console.error('Error rendering structured text:', e);
  }

  return <p>Content unavailable</p>;
}

export default function Post({ post, error }) {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  if (error || !post) {
    return (
      <>
        <Head>
          <title>Post Not Found</title>
        </Head>
        <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 20px' }}>
          <h1>Post Not Found</h1>
          <p>The post you're looking for doesn't exist.</p>
          <a href="/" style={{ color: '#0066cc' }}>← Back to home</a>
        </main>
      </>
    );
  }

  const formattedDate = post._publishedAt 
    ? new Date(post._publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  return (
    <>
      <Head>
        <title>{post.seoTags?.title || post.title} | DatoCMS MVP</title>
        {post.seoTags?.description && (
          <meta name="description" content={post.seoTags.description} />
        )}
        {post.seoTags?.image && (
          <meta property="og:image" content={post.seoTags.image.url} />
        )}
      </Head>
      <main style={{ 
        maxWidth: 900, 
        margin: '40px auto', 
        padding: '0 20px', 
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'
      }}>
        <a 
          href="/" 
          style={{ 
            color: '#0066cc', 
            textDecoration: 'none',
            marginBottom: '24px',
            display: 'inline-block'
          }}
        >
          ← Back to posts
        </a>

        <article>
          <h1 style={{ marginBottom: '8px', fontSize: '32px' }}>{post.title}</h1>
          
          <div style={{ marginBottom: '24px', fontSize: '14px', color: '#666' }}>
            {post.author && (
              <span>By {post.author.name}</span>
            )}
            {formattedDate && (
              <span style={{ marginLeft: post.author ? '12px' : '0' }}>
                • Published: {formattedDate}
              </span>
            )}
          </div>

          {post.seoTags?.image && (
            <div style={{ marginBottom: '32px' }}>
              <img
                src={post.seoTags.image.url}
                alt={post.seoTags.image.alt || post.title}
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto', 
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            </div>
          )}

          {post.tags && post.tags.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              {post.tags.map(tag => (
                <span 
                  key={tag.id}
                  style={{ 
                    display: 'inline-block',
                    marginRight: '8px',
                    padding: '6px 12px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: '#666'
                  }}
                >
                  {tag.tag || tag.slug}
                </span>
              ))}
            </div>
          )}

          <div style={{ 
            lineHeight: '1.8',
            fontSize: '16px',
            color: '#333'
          }}>
            {renderStructuredText(post.content)}
          </div>
        </article>
      </main>
    </>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const data = await datoFetch(POST_QUERY, { slug: params.slug });
    
    if (!data.post) {
      return {
        notFound: true,
      };
    }

    return { 
      props: { 
        post: data.post
      } 
    };
  } catch (err) {
    console.error('Error fetching post:', err);
    return {
      props: {
        error: process.env.NODE_ENV === 'development' ? err.message : null
      }
    };
  }
}

