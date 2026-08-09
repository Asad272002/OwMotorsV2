-- OW Motors reference data only. Product data will be migrated separately.

insert into public.brands (
  id,
  name,
  slug,
  logo_path,
  short_description,
  full_description,
  hero_image_path,
  seo_title,
  seo_description,
  is_active,
  display_order
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'TARO',
    'taro',
    'brands/taro/logo.png',
    'Discover TARO motorcycles combining distinctive styling, modern engineering, and an engaging riding experience.',
    'TARO motorcycles bring distinctive styling and modern engineering together for riders seeking an engaging, road-focused experience at OW Motors.',
    'brands/taro/hero.webp',
    'TARO Motorcycles in Pakistan | OW Motors',
    'Explore the TARO motorcycle range at OW Motors, including verified models, specifications, prices, colors, availability, and test-ride options.',
    true,
    1
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'LIFAN',
    'lifan',
    'brands/lifan/logo.png',
    'Explore LIFAN motorcycles designed around practical engineering, distinctive styling, and dependable everyday performance.',
    'LIFAN motorcycles combine practical engineering, distinctive styling, and dependable everyday performance for a wide range of riders at OW Motors.',
    'brands/lifan/hero.webp',
    'LIFAN Motorcycles in Pakistan | OW Motors',
    'Explore the LIFAN motorcycle range at OW Motors, with verified models, specifications, prices, colors, availability, and test-ride options.',
    true,
    2
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'HI-SPEED',
    'hi-speed',
    'brands/hi-speed/logo.png',
    'Discover HI-SPEED motorcycles offering a balance of style, performance, and everyday practicality.',
    'HI-SPEED motorcycles balance approachable performance, useful everyday practicality, and confident styling for riders across Pakistan.',
    'brands/hi-speed/hero.webp',
    'HI-SPEED Motorcycles in Pakistan | OW Motors',
    'Explore the HI-SPEED motorcycle range at OW Motors, including verified models, specifications, prices, availability, and test-ride options.',
    true,
    3
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'SUPER STAR',
    'super-star',
    'brands/super-star/logo.png',
    'Explore SUPER STAR motorcycles designed for everyday riders, combining practical design with accessible performance.',
    'SUPER STAR motorcycles pair practical design with accessible performance for everyday riders looking for a dependable OW Motors option.',
    'brands/super-star/hero.webp',
    'SUPER STAR Motorcycles in Pakistan | OW Motors',
    'Explore the SUPER STAR motorcycle range at OW Motors, with verified models, specifications, prices, availability, and test-ride options.',
    true,
    4
  )
on conflict (slug) do update
set
  name = excluded.name,
  logo_path = excluded.logo_path,
  short_description = excluded.short_description,
  full_description = excluded.full_description,
  hero_image_path = excluded.hero_image_path,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  is_active = excluded.is_active,
  display_order = excluded.display_order;

insert into public.categories (
  id,
  name,
  slug,
  description,
  seo_title,
  seo_description,
  is_active,
  display_order
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'Naked Bikes',
    'naked-bikes',
    'Explore upright street motorcycles built for direct handling, everyday usability, and an engaging road experience.',
    'Naked Bikes in Pakistan | OW Motors',
    'Compare naked motorcycles at OW Motors by brand, engine capacity, price, specifications, colors, stock status, and test-ride availability.',
    true,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Sport Bikes',
    'sport-bikes',
    'Explore performance-focused motorcycles with aerodynamic styling, responsive handling, and a committed riding character.',
    'Sport Bikes in Pakistan | OW Motors',
    'Compare sport motorcycles at OW Motors by brand, engine capacity, price, specifications, colors, stock status, and test-ride availability.',
    true,
    2
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'Dual Sport',
    'dual-sport',
    'Explore versatile motorcycles designed to handle everyday roads and light off-road riding with confident control.',
    'Dual Sport Bikes in Pakistan | OW Motors',
    'Compare dual-sport motorcycles at OW Motors by brand, engine capacity, price, specifications, colors, availability, and test-ride options.',
    true,
    3
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'Cruisers',
    'cruisers',
    'Explore relaxed motorcycles with low-slung styling, comfortable ergonomics, and road-focused performance.',
    'Cruiser Motorcycles in Pakistan | OW Motors',
    'Compare cruiser motorcycles at OW Motors by brand, engine capacity, price, specifications, colors, stock status, and test-ride availability.',
    true,
    4
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    'Touring',
    'touring',
    'Explore motorcycles created for longer journeys with rider comfort, practical equipment, and stable road manners.',
    'Touring Motorcycles in Pakistan | OW Motors',
    'Compare touring motorcycles at OW Motors by brand, engine capacity, price, specifications, colors, stock status, and test-ride availability.',
    true,
    5
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    'Adventure',
    'adventure',
    'Explore capable motorcycles designed for mixed roads, extended journeys, and a confident upright riding position.',
    'Adventure Bikes in Pakistan | OW Motors',
    'Compare adventure motorcycles at OW Motors by brand, engine capacity, price, specifications, colors, availability, and test-ride options.',
    true,
    6
  ),
  (
    '20000000-0000-4000-8000-000000000007',
    'Scooters',
    'scooters',
    'Explore practical automatic two-wheelers designed for straightforward urban travel, comfort, and daily convenience.',
    'Scooters in Pakistan | OW Motors',
    'Compare scooters at OW Motors by brand, engine capacity, price, specifications, colors, stock status, and test-ride availability.',
    true,
    7
  ),
  (
    '20000000-0000-4000-8000-000000000008',
    'Electric Bikes',
    'electric-bikes',
    'Explore electric motorcycles and scooters designed around efficient urban travel and practical everyday mobility.',
    'Electric Bikes in Pakistan | OW Motors',
    'Compare electric motorcycles and scooters at OW Motors by brand, price, specifications, colors, stock status, and test-ride availability.',
    true,
    8
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  is_active = excluded.is_active,
  display_order = excluded.display_order;
