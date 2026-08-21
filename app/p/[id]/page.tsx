import type { Metadata } from "next";
import ProductPage, {
  generateMetadata as generateProductMetadata,
  generateStaticParams,
} from "../../product/[id]/page";

export { generateStaticParams };
export const revalidate = 0;
export const dynamicParams = true;

/**
 * Weekly Edit emails use /p/{id} instead of /product/{id}.
 * AASA claims /product/* and /open, so Gmail hands those URLs to the native app,
 * which lands on Shop instead of this piece. /p is not in AASA, so the browser
 * loads this page — the same PDP as /product/{id}.
 */
export async function generateMetadata(args: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const meta = await generateProductMetadata(args);
  return {
    ...meta,
    robots: { index: false, follow: false },
  };
}

export default ProductPage;
