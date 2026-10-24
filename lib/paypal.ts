import { Client, Environment, OrdersController } from "@paypal/paypal-server-sdk";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}, see .env.example`);
  return value;
}

export function dealSecret(): string {
  return required("DEAL_SECRET");
}

export function orders(): OrdersController {
  const client = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: required("PAYPAL_CLIENT_ID"),
      oAuthClientSecret: required("PAYPAL_CLIENT_SECRET"),
    },
    environment: Environment.Sandbox,
  });
  return new OrdersController(client);
}
