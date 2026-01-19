import { defineCollection, z } from "astro:content";

const pages = defineCollection({
  type: "data",
  schema: z.object({
    seo: z.object({
      title: z.string(),
      description: z.string(),
    }),
    hero: z.object({
      title: z.string(),
      subtitle: z.string(),
      cta: z.object({
        label: z.string(),
        href: z.string(),
      }),
    }),
    sections: z.array(
      z.object({
        eyebrow: z.string().optional(),
        title: z.string(),
        blurb: z.string(),
        provider: z.enum(["cloudflare", "youtube", "vimeo"]),
        videoIdOrUrl: z.string(),
        layout: z.enum(["video-left", "video-right", "stacked"]).optional(),
        cta: z
          .object({
            label: z.string(),
            href: z.string(),
          })
          .optional(),
      })
    ),
  }),
});

export const collections = { pages };
