// components/PostList.jsx
import React from 'react';

export default function PostList({ posts }) {
  if (!posts || posts.length === 0) {
    return <p>No posts found.</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {posts.map((p) => {
        // Extract text content from structured content field (DAST format)
        const getTextContent = (content) => {
          if (!content || !content.value) return null;
          
          // Handle DAST (DatoCMS Structured Text) format
          const extractText = (node) => {
            if (typeof node === 'string') return node;
            if (!node) return '';
            
            if (node.type === 'span' && node.value) {
              return node.value;
            }
            
            if (node.children && Array.isArray(node.children)) {
              return node.children.map(extractText).join('');
            }
            
            return '';
          };
          
          try {
            // content.value is an object with document structure
            const document = content.value.document || content.value;
            let text = '';
            
            if (document.children) {
              text = document.children
                .map(child => extractText(child))
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
            }
            
            return text.length > 200 ? text.substring(0, 200) + '...' : text;
          } catch (e) {
            // Fallback: try to stringify and extract
            const str = JSON.stringify(content.value);
            const text = str.replace(/[{}":,\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
            return text.length > 200 ? text.substring(0, 200) + '...' : text;
          }
        };

        const excerpt = getTextContent(p.content);
        const seoImage = p.seoTags?.image;

        return (
          <li key={p.id} style={{ marginBottom: 20, padding: 16, borderRadius: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '20px' }}>{p.title}</h2>
            
            <div style={{ marginBottom: 8, fontSize: '14px', color: '#666' }}>
              {p.author && (
                <span>By {p.author.name}</span>
              )}
              {p.formattedDate && (
                <span style={{ marginLeft: p.author ? '12px' : '0' }}>
                  • Published: {p.formattedDate}
                </span>
              )}
            </div>

            {excerpt && (
              <p style={{ marginTop: 8, marginBottom: 12, color: '#444', lineHeight: '1.5' }}>
                {excerpt}
              </p>
            )}

            {seoImage && (
              <div style={{ marginTop: 12, marginBottom: 12 }}>
                <img
                  src={seoImage.url}
                  alt={seoImage.alt || p.title}
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: 6 }}
                />
              </div>
            )}

            {p.tags && p.tags.length > 0 && (
              <div style={{ marginTop: 8, marginBottom: 8 }}>
                {p.tags.map(tag => (
                  <span 
                    key={tag.id}
                    style={{ 
                      display: 'inline-block',
                      marginRight: '8px',
                      padding: '4px 8px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#666'
                    }}
                  >
                    {tag.tag || tag.slug}
                  </span>
                ))}
              </div>
            )}

            {p.slug && (
              <div style={{ marginTop: 12 }}>
                <a 
                  href={`/posts/${p.slug}`} 
                  style={{ 
                    color: '#0066cc', 
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                >
                  Read more →
                </a>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

