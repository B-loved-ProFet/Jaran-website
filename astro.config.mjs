import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel/serverless";
import image from "@astrojs/image";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), image(), sitemap({
    customPages: ['https://www.jaran.com.pl/', 'https://www.jaran.com.pl/detektyw', 'https://www.jaran.com.pl/windykacja', 'https://www.jaran.com.pl/informacja-gospodarcza',
  'https://www.jaran.com.pl/ochrona-biznesu', 'https://www.jaran.com.pl/cennik', 'https://www.jaran.com.pl/kontakt', 'https://www.jaran.com.pl/detective', 'https://www.jaran.com.pl/en', 'https://www.jaran.com.pl/debt-collection', 'https://www.jaran.com.pl/business-intelligence',
  'https://www.jaran.com.pl/business-protection', 'https://www.jaran.com.pl/pricing', 'https://www.jaran.com.pl/contact']
  })],
  output: "server",
  adapter: vercel(),
  site: 'https://jaran.com.pl',
});