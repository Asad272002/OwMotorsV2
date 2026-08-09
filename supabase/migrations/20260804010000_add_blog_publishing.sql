-- First-party editorial publishing for the OW Motors blog.
-- Content is structured JSON created by validated admin forms; editors never edit raw HTML.

create table public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  accent_color text not null default '#C62828',
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_categories_name_length check (char_length(name) between 2 and 60),
  constraint blog_categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint blog_categories_accent_format check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint blog_categories_display_order_nonnegative check (display_order >= 0)
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.blog_categories(id) on delete restrict,
  title text not null,
  slug text not null unique,
  excerpt text not null,
  brand_label text,
  hero_image_path text not null,
  hero_image_alt text not null,
  lead text not null,
  content_sections jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  author_name text not null default 'OW Motors Team',
  author_initials text not null default 'OW',
  author_bio text not null default 'The OW Motors editorial team shares practical motorcycle guides, product information, and dealership news.',
  reading_time_minutes integer not null default 5,
  publication_status text not null default 'draft',
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_title_length check (char_length(title) between 10 and 180),
  constraint blog_posts_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint blog_posts_excerpt_length check (char_length(excerpt) between 30 and 420),
  constraint blog_posts_image_path_safe check (hero_image_path !~ '\.\.'),
  constraint blog_posts_image_alt_length check (char_length(hero_image_alt) between 8 and 240),
  constraint blog_posts_lead_length check (char_length(lead) between 30 and 1000),
  constraint blog_posts_sections_array check (jsonb_typeof(content_sections) = 'array'),
  constraint blog_posts_sections_limit check (jsonb_array_length(content_sections) between 1 and 20),
  constraint blog_posts_reading_time check (reading_time_minutes between 1 and 90),
  constraint blog_posts_status check (publication_status in ('draft', 'published', 'archived')),
  constraint blog_posts_publish_timestamp check (publication_status <> 'published' or published_at is not null),
  constraint blog_posts_seo_title_length check (seo_title is null or char_length(seo_title) between 10 and 70),
  constraint blog_posts_seo_description_length check (seo_description is null or char_length(seo_description) between 50 and 180)
);

create table public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'subscribed',
  source text not null default 'blog',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_email_format check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint newsletter_status check (status in ('subscribed', 'unsubscribed')),
  constraint newsletter_source_length check (char_length(source) between 2 and 40)
);

create unique index newsletter_subscriptions_email_unique on public.newsletter_subscriptions (lower(email));
create index blog_categories_public_order_idx on public.blog_categories (display_order, name) where is_active;
create index blog_posts_public_listing_idx on public.blog_posts (published_at desc, created_at desc) where publication_status = 'published';
create index blog_posts_category_idx on public.blog_posts (category_id, published_at desc) where publication_status = 'published';
create index blog_posts_featured_idx on public.blog_posts (is_featured, published_at desc) where publication_status = 'published';
create index blog_posts_updated_by_idx on public.blog_posts (updated_by);

create trigger set_blog_categories_updated_at before update on public.blog_categories
for each row execute function private.set_updated_at();
create trigger set_blog_posts_updated_at before update on public.blog_posts
for each row execute function private.set_updated_at();
create trigger set_newsletter_subscriptions_updated_at before update on public.newsletter_subscriptions
for each row execute function private.set_updated_at();

revoke all on table public.blog_categories, public.blog_posts, public.newsletter_subscriptions from anon, authenticated;
grant select on table public.blog_categories, public.blog_posts to anon, authenticated;
grant select, insert, update, delete on table public.blog_categories, public.blog_posts to authenticated;
grant select, update, delete on table public.newsletter_subscriptions to authenticated;
grant all privileges on table public.blog_categories, public.blog_posts, public.newsletter_subscriptions to service_role;

alter table public.blog_categories enable row level security;
alter table public.blog_categories force row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_posts force row level security;
alter table public.newsletter_subscriptions enable row level security;
alter table public.newsletter_subscriptions force row level security;

create policy blog_categories_public_read on public.blog_categories for select to anon, authenticated using (is_active);
create policy blog_categories_staff_read on public.blog_categories for select to authenticated using ((select private.is_staff()));
create policy blog_categories_staff_insert on public.blog_categories for insert to authenticated with check ((select private.is_staff()));
create policy blog_categories_staff_update on public.blog_categories for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy blog_categories_admin_delete on public.blog_categories for delete to authenticated using ((select private.is_admin()));

create policy blog_posts_public_read on public.blog_posts for select to anon, authenticated using (
  publication_status = 'published'
  and published_at <= now()
  and exists (select 1 from public.blog_categories category where category.id = category_id and category.is_active)
);
create policy blog_posts_staff_read on public.blog_posts for select to authenticated using ((select private.is_staff()));
create policy blog_posts_staff_insert on public.blog_posts for insert to authenticated with check ((select private.is_staff()));
create policy blog_posts_staff_update on public.blog_posts for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy blog_posts_admin_delete on public.blog_posts for delete to authenticated using ((select private.is_admin()));

create policy newsletter_subscriptions_staff_read on public.newsletter_subscriptions for select to authenticated using ((select private.is_staff()));
create policy newsletter_subscriptions_staff_update on public.newsletter_subscriptions for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy newsletter_subscriptions_admin_delete on public.newsletter_subscriptions for delete to authenticated using ((select private.is_admin()));

insert into public.blog_categories (id, name, slug, accent_color, display_order) values
  ('a1000000-0000-4000-8000-000000000001', 'Reviews', 'reviews', '#C62828', 10),
  ('a1000000-0000-4000-8000-000000000002', 'First Rides', 'first-rides', '#2563EB', 20),
  ('a1000000-0000-4000-8000-000000000003', 'Comparisons', 'comparisons', '#15803D', 30),
  ('a1000000-0000-4000-8000-000000000004', 'Guides', 'guides', '#D97706', 40),
  ('a1000000-0000-4000-8000-000000000005', 'News', 'news', '#7C3AED', 50),
  ('a1000000-0000-4000-8000-000000000006', 'Tips', 'tips', '#DB2777', 60)
on conflict (slug) do nothing;

insert into public.blog_posts (
  id, category_id, title, slug, excerpt, brand_label, hero_image_path, hero_image_alt, lead,
  content_sections, tags, author_name, author_initials, reading_time_minutes,
  publication_status, is_featured, published_at, seo_title, seo_description
) values
(
  'b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
  'LIFAN KPS 250 Review: Is This the Best Value Sport Bike in Pakistan?',
  'lifan-kps-250-review-best-value-sport-bike-pakistan',
  'A focused look at the LIFAN KPS 250, its everyday usability, key equipment, and the questions riders should ask before buying.',
  'LIFAN', '/images/home/lifan-campaign-04.webp', 'LIFAN motorcycle displayed in a dark urban campaign setting',
  'Choosing a sport motorcycle is easier when the decision is based on verified specifications, fit, intended use, and current availability.',
  '[{"heading":"Start with the published specification","body":"Compare the engine, braking, suspension, and dimensions listed for the exact available variant. Ask the dealership to confirm any specification that affects your decision."},{"heading":"Consider everyday usability","body":"Riding position, seat height, fuel capacity, and service access can matter as much as headline performance. Match the motorcycle to the roads and distances you ride most often."},{"heading":"Confirm price and availability","body":"Prices and stock can change. Use the OW Motors contact route to confirm the selected configuration before making a purchase decision."}]'::jsonb,
  array['LIFAN','Sport Bike','Buying Guide'], 'Hamza Malik', 'HM', 8, 'published', true, '2026-07-28T09:00:00+05:00',
  'LIFAN KPS 250 Review and Buying Guide', 'Review the LIFAN KPS 250 specifications, everyday usability, availability questions, and buying considerations from OW Motors.'
),
(
  'b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002',
  'First Ride: TARO Hawk 200 Impresses on the Lahore-Islamabad Motorway',
  'first-ride-taro-hawk-200-lahore-islamabad-motorway',
  'A practical first-look format covering the TARO Hawk 200 equipment, riding position, and questions for longer-distance riders.',
  'TARO', '/images/home/taro-campaign-02.webp', 'Red TARO touring motorcycle shown from the side',
  'A useful first-ride report begins with the exact motorcycle configuration and separates verified facts from rider impressions.',
  '[{"heading":"Check the exact configuration","body":"Engine capacity, available equipment, and stock status can vary by configuration. Confirm the selected variant before comparing motorcycles."},{"heading":"Fit matters on longer rides","body":"Consider seat height, handlebar reach, wind protection, luggage requirements, and the type of roads you expect to use."}]'::jsonb,
  array['TARO','First Ride','Touring'], 'Sara Ahmed', 'SA', 6, 'published', false, '2026-07-22T09:00:00+05:00', null,
  'Explore the TARO Hawk 200 through a practical first-ride checklist covering configuration, comfort, equipment, and availability.'
),
(
  'b1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000004',
  'The Complete Beginner’s Guide to Buying Your First Motorcycle in Pakistan',
  'beginners-guide-buying-first-motorcycle-pakistan',
  'Engine size, budget, paperwork, riding gear, and dealer checks—everything a first-time buyer needs in one practical guide.',
  null, '/images/home/taro-campaign-01.webp', 'Red sport motorcycle parked on a mountain road',
  'Buying your first motorcycle in Pakistan can feel overwhelming—engine sizes, brand choices, licence requirements, and paperwork all pile up before you have even sat on a bike. This guide cuts through the noise.',
  '[{"heading":"Step 1: Pick the Right Engine Size","body":"Choose an engine capacity that matches your experience, daily distance, road conditions, and maintenance expectations. Compare the published specification for each exact variant."},{"heading":"Step 2: Set a Realistic Budget","body":"Plan beyond the motorcycle price. Include registration, insurance where applicable, quality riding gear, routine maintenance, fuel, and a sensible contingency."},{"heading":"Step 3: Get Your Learner’s Licence","body":"Check the latest requirements with your local licensing authority before riding. Keep valid documentation and follow the applicable learner and testing rules."},{"heading":"Step 4: Buy from an Authorised Dealer","body":"Ask for proper sales documentation, confirm the frame and engine identification details, and verify the manufacturer or dealer warranty before completing the purchase."},{"heading":"Step 5: Essential First Gear","body":"Start with a certified helmet, suitable gloves, ankle-covering footwear, and visible protective clothing. Choose equipment that fits correctly and is appropriate for local conditions."}]'::jsonb,
  array['Beginner','Buying Guide','Pakistan','Licence','First Motorcycle'], 'OW Motors Team', 'OW', 12, 'published', false, '2026-07-18T09:00:00+05:00',
  'Beginner’s Guide to Buying a Motorcycle in Pakistan', 'A practical first-motorcycle buying guide for Pakistan covering engine size, budget, licensing, dealer checks, and essential riding gear.'
),
(
  'b1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000003',
  'HI-SPEED Viper 250 vs LIFAN KP200: Which Naked Bike Fits You?',
  'hi-speed-viper-250-vs-lifan-kp200-comparison',
  'A decision-focused comparison framework for two naked motorcycles, covering fit, published specifications, availability, and ownership priorities.',
  null, '/images/home/lifan-campaign-03.webp', 'Dark naked motorcycle shown in an urban street campaign',
  'A useful comparison starts with the exact available variants and the needs of the rider—not a single headline number.',
  '[{"heading":"Compare like-for-like variants","body":"Confirm engine capacity, braking equipment, price, and availability for the exact variants under consideration."},{"heading":"Prioritise rider fit","body":"Seat height, control reach, weight, and intended use can change which motorcycle is the better match for a particular rider."}]'::jsonb,
  array['Comparison','HI-SPEED','LIFAN','Naked Bikes'], 'Bilal Rauf', 'BR', 10, 'published', false, '2026-07-14T09:00:00+05:00', null,
  'Compare the HI-SPEED Viper 250 and LIFAN KP200 using verified specifications, rider fit, price, and availability considerations.'
),
(
  'b1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000005',
  'SUPER STAR Titan 250 Officially Launches—Here’s What Riders Should Check',
  'super-star-titan-250-launch-rider-checklist',
  'A clear launch checklist covering published equipment, available variants, ownership information, and what to verify with the dealership.',
  'SUPER STAR', '/images/home/taro-motorcycle-02.png', 'Touring motorcycle photographed in profile on a light background',
  'New-model announcements are most useful when buyers can connect them to verified configuration, pricing, and availability information.',
  '[{"heading":"Review the available variants","body":"Confirm the engine capacity, colour, price, stock status, and images for the exact configuration you want."},{"heading":"Ask about ownership support","body":"Verify warranty terms, recommended service intervals, parts support, and the documentation supplied with the motorcycle."}]'::jsonb,
  array['SUPER STAR','News','Launch'], 'OW Motors Team', 'OW', 5, 'published', false, '2026-07-10T09:00:00+05:00', null,
  'A practical checklist for reviewing a new motorcycle launch, including configuration, ownership support, documentation, price, and availability.'
),
(
  'b1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000006',
  '5 Maintenance Habits That Can Help Your Motorcycle Last Longer',
  'five-motorcycle-maintenance-habits',
  'Five simple ownership habits that support reliability, safety checks, and informed maintenance conversations with qualified technicians.',
  null, '/images/home/taro-campaign-03.webp', 'Close view of a red motorcycle fuel tank and bodywork',
  'Consistent checks and timely professional servicing help owners notice changes early and keep maintenance records organised.',
  '[{"heading":"Follow the manufacturer schedule","body":"Use the service intervals and fluid specifications published for your exact motorcycle model and variant."},{"heading":"Check tyres and controls","body":"Before riding, inspect tyre condition and pressure, lights, brakes, and the free movement of key controls."},{"heading":"Keep maintenance records","body":"Record dates, mileage, parts, and service work so future maintenance decisions are based on a clear history."}]'::jsonb,
  array['Maintenance','Tips','Ownership'], 'Adnan Qureshi', 'AQ', 7, 'published', false, '2026-07-05T09:00:00+05:00', null,
  'Five practical motorcycle maintenance habits covering service schedules, pre-ride checks, record keeping, and professional maintenance support.'
)
on conflict (slug) do nothing;
