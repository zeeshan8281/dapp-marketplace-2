# DatoCMS MVP

A Next.js MVP application that fetches content from DatoCMS via GraphQL and renders a simple list of posts.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the project root (already created with placeholder):
```
DATOCMS_READONLY_TOKEN=your_readonly_token_here
```

Replace `your_readonly_token_here` with your actual DatoCMS readonly token.

## Running

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Notes

- The GraphQL query assumes your DatoCMS content model is named `Post` with fields: `title`, `slug`, `excerpt`, `content`, `coverImage`, etc.
- If your models are different, update the `QUERY` in `pages/index.js` to match your DatoCMS schema.
- Uses `getServerSideProps` for server-side rendering. You can switch to `getStaticProps` with `revalidate` for static generation if preferred.

