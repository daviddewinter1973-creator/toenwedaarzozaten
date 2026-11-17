import { currentStock } from './lib/voorraad.mjs';

export default async (req) => {
  const origin = new URL(req.url).origin;
  const { stock } = await currentStock(origin);
  return new Response(JSON.stringify(stock), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
};
