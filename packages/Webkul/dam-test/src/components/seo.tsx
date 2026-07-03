import { Helmet } from "react-helmet-async";

interface SeoProps {
  title: string;
  description: string;
  url: string;
  image?: string;
}

export const Seo = ({ title, description, url, image }: SeoProps) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={url} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Prince Kumar Sahni" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={url} />
    {image && <meta property="og:image" content={image} />}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    {image && <meta name="twitter:image" content={image} />}
  </Helmet>
);
