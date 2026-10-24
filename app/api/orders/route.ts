import { CheckoutPaymentIntent } from "@paypal/paypal-server-sdk";
import { findProduct } from "@/lib/catalog";
import { verifyDealToken } from "@/lib/deal";
import { dealSecret, orders } from "@/lib/paypal";

// Creates the PayPal order from the signed deal, never from a price sent by the browser.
export async function POST(request: Request) {
  const { dealToken } = await request.json();
  const deal = verifyDealToken(String(dealToken), dealSecret());
  const product = deal && findProduct(deal.productId);
  if (!deal || !product) return Response.json({ error: "Deal is invalid or expired" }, { status: 400 });

  const { result } = await orders().createOrder({
    body: {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          referenceId: product.id,
          description: `${product.name} (negotiated)`,
          amount: { currencyCode: "USD", value: (deal.price / 100).toFixed(2) },
        },
      ],
    },
  });
  return Response.json({ orderId: result.id });
}
