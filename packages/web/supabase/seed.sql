-- Seed a couple of public templates.
insert into public.templates (slug, title, body, category) values
  (
    'developer',
    'Developer',
    e'# Developer context\n\n- Stack: TypeScript, Next.js, Postgres.\n- Tone: precise, concise, code-first.\n- Always prefer types over comments.\n',
    'role'
  ),
  (
    'writer',
    'Writer',
    e'# Writer context\n\n- Audience: smart non-experts.\n- Voice: warm, plain English, no jargon.\n- Sentences under 20 words when possible.\n',
    'role'
  ),
  (
    'marketer',
    'Marketer',
    e'# Marketer context\n\n- Brand voice: confident, friendly, never hyped.\n- Avoid: emojis, exclamation marks, AI cliches.\n- Always tie copy to a measurable outcome.\n',
    'role'
  )
on conflict (slug) do nothing;
