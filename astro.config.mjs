import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel/serverless";
import image from "@astrojs/image";
import partytown from "@astrojs/partytown";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), image(), partytown({
    //adds dataLayer.push as a forwarding event.
    config:{
      forward: ["dataLayer.push"],
    }
  })],
  output: "server",
  adapter: vercel()
});