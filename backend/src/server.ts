import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3005);
const host = process.env.HOST ?? "0.0.0.0";
const app = createApp();

if (Number.isNaN(port)) {
  throw new Error("PORT must be a valid number");
}

app.listen(port, host, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
